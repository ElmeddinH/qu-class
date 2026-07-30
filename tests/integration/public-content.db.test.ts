// @vitest-environment node
// ============================================================================
// tests/integration/public-content.db.test.ts
// Blok 11A — İCTİMAİ SƏTHİN sızma yoxlaması (REAL bazaya qarşı).
//
// 🔴 FAYLIN ƏSAS SUALI: ANONİM ZİYARƏTÇİ NƏ GÖRÜR?
// Blok 11A ~15 yeni ictimai səhifə gətirdi və hər biri servis qatından oxuyur.
// Üç sızma nöqtəsi ayrıca ölçülür:
//   1. `/events`      → `listEvents(ANONYMOUS)` YALNIZ `PUBLIC` qaytarır
//   2. `/khankendi/*` → `listMemoriesForPlace(ANONYMOUS)` `CLASS` xatirə
//                       QAYTARMIR (məkan filtri məxfilik filtrinin ƏVƏZİ deyil)
//   3. `/about` …     → `isPublished = false` səhifə HEÇ KİMƏ görünmür
//
// ⚠️ Fayl YAZIR (bir səhifəni müvəqqəti qaralamaya çevirir), ona görə hər
// dəyişiklik `finally`-də GERİ QAYTARILIR — seed determinizmi pozulmamalıdır.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";

import { ContentSection, Visibility } from "@/lib/enums";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";
import { listFacultyCards, getFacultyDetail } from "@/services/academic.service";
import {
  getContentPage,
  getGuidePlace,
  listContentPages,
  listGuidePlaces,
  listSectionPages,
} from "@/services/content.service";
import { countEvents, listEvents } from "@/services/event.service";
import { listMemoriesForPlace } from "@/services/memory.service";

const prisma = new PrismaClient();
const ALL = 1000;

afterAll(async () => {
  await prisma.$disconnect();
});

type UserViewer = Extract<Viewer, { kind: "USER" }>;

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

// ---------------------------------------------------------------------------
// 1. `/events` — ictimai tədbir siyahısı
// ---------------------------------------------------------------------------

describe("🔴 anonim `listEvents` yalnız PUBLIC qaytarır", () => {
  it("qaytarılan hər tədbir `visibility = PUBLIC`-dir", async () => {
    const events = await listEvents(ANONYMOUS, { take: ALL });

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.visibility, event.title).toBe(Visibility.PUBLIC);
    }
  });

  it("bazada CLASS/UNIVERSITY tədbir VAR, amma siyahıya DÜŞMÜR", async () => {
    // Test "boş bazada da keçən" yalançı yaşıl olmasın deyə əvvəlcə həmin
    // sətirlərin MÖVCUDLUĞUNU sübut edir.
    const hidden = await prisma.event.findMany({
      where: { visibility: { not: Visibility.PUBLIC } },
      select: { id: true },
    });
    expect(hidden.length).toBeGreaterThan(0);

    const events = await listEvents(ANONYMOUS, { take: ALL });
    const ids = new Set(events.map((event) => event.id));

    for (const row of hidden) expect(ids.has(row.id), row.id).toBe(false);
  });

  it("giriş etmiş istifadəçi DAHA ÇOX tədbir görür (mühərrik işləyir)", async () => {
    const member = await viewerOf("rep@qu.edu.az");

    const [anon, mine] = await Promise.all([
      countEvents(ANONYMOUS),
      countEvents(member),
    ]);

    expect(mine).toBeGreaterThan(anon);
  });

  it("`countEvents` siyahı ilə EYNİ şərtdən keçir", async () => {
    const [events, total] = await Promise.all([
      listEvents(ANONYMOUS, { take: ALL }),
      countEvents(ANONYMOUS),
    ]);

    expect(total).toBe(events.length);
  });

  it("vaxt filtri siyahını bölür (qarşıdan gələn + keçmiş = hamısı)", async () => {
    const now = new Date();
    const [upcoming, past, total] = await Promise.all([
      countEvents(ANONYMOUS, { upcoming: true }, now),
      countEvents(ANONYMOUS, { upcoming: false }, now),
      countEvents(ANONYMOUS, {}, now),
    ]);

    expect(upcoming + past).toBe(total);
  });
});

// ---------------------------------------------------------------------------
// 2. Bələdçi məkanı → sinif xatirələri (M9 ↔ M3 körpüsü)
// ---------------------------------------------------------------------------

describe("🔴 bələdçi səhifəsi CLASS xatirə SIZDIRMIR", () => {
  it("anonim viewer məkanın YALNIZ PUBLIC xatirələrini görür", async () => {
    const places = await listGuidePlaces(undefined, ALL);
    expect(places.length).toBeGreaterThan(0);

    let checked = 0;

    for (const place of places) {
      const memories = await listMemoriesForPlace(ANONYMOUS, place.id, ALL);
      for (const memory of memories) {
        expect(memory.visibility, `${place.title} → ${memory.title}`).toBe(
          Visibility.PUBLIC,
        );
        checked += 1;
      }
    }

    // ⚠️ Ən azı bir xatirə yoxlanmalıdır, yoxsa test heç nə sübut etmir.
    expect(checked, "heç bir məkan xatirəsi yoxlanmadı").toBeGreaterThan(0);
  });

  it("bazada məkana bağlı CLASS xatirə VAR (test yalançı yaşıl deyil)", async () => {
    const classMemories = await prisma.memory.count({
      where: { guidePlaceId: { not: null }, visibility: Visibility.CLASS },
    });

    expect(classMemories).toBeGreaterThan(0);
  });

  it("sinif üzvü həmin məkanda DAHA ÇOX xatirə görür", async () => {
    const member = await viewerOf("rep@qu.edu.az");

    const withClassMemory = await prisma.memory.findFirst({
      where: {
        guidePlaceId: { not: null },
        visibility: Visibility.CLASS,
        cohortId: { in: member.cohortIds },
        status: { not: "DELETED" },
      },
      select: { guidePlaceId: true },
    });

    // Seed-də belə sətir olmaya bilər — o halda müqayisə mənasızdır.
    if (!withClassMemory?.guidePlaceId) return;

    const [anon, mine] = await Promise.all([
      listMemoriesForPlace(ANONYMOUS, withClassMemory.guidePlaceId, ALL),
      listMemoriesForPlace(member, withClassMemory.guidePlaceId, ALL),
    ]);

    expect(mine.length).toBeGreaterThan(anon.length);
  });

  it("naməlum məkan `id`-si BOŞ siyahı verir (404 yox)", async () => {
    expect(await listMemoriesForPlace(ANONYMOUS, "gpl-yoxdur", ALL)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Redaksiya məzmunu — qaralama HEÇ KİMƏ görünmür
// ---------------------------------------------------------------------------

describe("🔴 `isPublished = false` ContentPage heç kimə görünmür", () => {
  it("qaralama nə siyahıda, nə də detalda çıxır", async () => {
    const page = await prisma.contentPage.findUniqueOrThrow({
      where: { slug: "kitabxana" },
      select: { id: true, slug: true, section: true, isPublished: true, updatedAt: true },
    });

    expect(page.isPublished, "seed sətri dərc olunmuş olmalıdır").toBe(true);

    try {
      await prisma.contentPage.update({
        where: { id: page.id },
        data: { isPublished: false },
      });

      // (a) Kart siyahısı
      const cards = await listContentPages(ContentSection.CAMPUS, ALL);
      expect(cards.some((card) => card.slug === page.slug)).toBe(false);

      // (b) Bölmə səhifəsi (gövdə ilə)
      const sectionPages = await listSectionPages(ContentSection.CAMPUS, ALL);
      expect(sectionPages.some((entry) => entry.slug === page.slug)).toBe(false);

      // (c) Detal — `null` → səhifə `notFound()` çağırır
      expect(await getContentPage(page.slug)).toBeNull();
    } finally {
      // ⚠️ Seed determinizmi: sətir GERİ QAYTARILIR.
      //
      // 🔴 `updatedAt` DA (Blok 11B-də tapıldı): sxemdə `@updatedAt` var, yəni
      // bərpa edən `update` onu TƏZƏ damğa ilə yazır — sətir sayı eyni qalır,
      // DƏYƏRİ isə sürüşür və determinizm yoxlaması qırılır. Prisma avtomatik
      // sahəni `data`-dan oxumadığı üçün XAM SQL işlədilir.
      await prisma.$executeRaw`
        UPDATE ContentPage
           SET isPublished = 1, updatedAt = ${page.updatedAt}
         WHERE id = ${page.id}
      `;
    }

    // Bərpadan sonra yenidən görünür.
    expect(await getContentPage(page.slug)).not.toBeNull();
  });

  it("dərc olunmuş səhifə gövdəsi ilə qaytarılır", async () => {
    const page = await getContentPage("haqqimizda");

    expect(page).not.toBeNull();
    expect(page?.body.length).toBeGreaterThan(0);
    expect(page?.section).toBe(ContentSection.UNIVERSITY);
  });

  it("hüquqi sənədlərin hamısı dərc olunub (footer linkləri 404 vermir)", async () => {
    for (const slug of ["privacy", "terms", "copyright", "equal-opportunity"]) {
      expect(await getContentPage(slug), slug).not.toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Fakültə səhifələri [M2] — AQREQASİYA QAYDASI
// ---------------------------------------------------------------------------

describe("fakültə səhifələri yalnız STRUKTUR rəqəmi göstərir", () => {
  it("kartlarda ixtisas və sinif sayı var, ÜZV SAYI YOXDUR", async () => {
    const cards = await listFacultyCards();
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      expect(card.programCount).toBeGreaterThanOrEqual(0);
      expect(card.cohortCount).toBeGreaterThanOrEqual(0);
      // 🔴 Sxem səviyyəsində qoruma: obyektdə üzv sayı sahəsi OLMAMALIDIR.
      expect(Object.keys(card)).not.toContain("memberCount");
      expect(Object.keys(card)).not.toContain("studentCount");
    }
  });

  it("detal səhifəsi açıq sinif sayını verir, üzv sayını YOX", async () => {
    const cards = await listFacultyCards();
    const detail = await getFacultyDetail(cards[0].slug);

    expect(detail).not.toBeNull();
    for (const program of detail!.programs) {
      expect(program.openClassCount).toBeGreaterThanOrEqual(0);
      expect(Object.keys(program)).not.toContain("memberCount");
    }
  });

  it("açıq sinif sayı DB-dəki cohort sayı ilə uzlaşır", async () => {
    const cards = await listFacultyCards();
    const detail = await getFacultyDetail(cards[0].slug);

    const sum = detail!.programs.reduce((acc, p) => acc + p.openClassCount, 0);
    const actual = await prisma.cohort.count({
      where: { facultyId: detail!.id, scope: "PROGRAM", programId: { not: null } },
    });

    expect(sum).toBe(actual);
  });

  it("naməlum slug `null` verir (səhifə 404 çağırır)", async () => {
    expect(await getFacultyDetail("yoxdur")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Bələdçi məkanının detalı
// ---------------------------------------------------------------------------

describe("getGuidePlace", () => {
  it("mövcud məkanı qaytarır", async () => {
    const [first] = await listGuidePlaces(undefined, 1);
    const place = await getGuidePlace(first.id);

    expect(place?.id).toBe(first.id);
    expect(place?.title).toBe(first.title);
  });

  it("naməlum `id` `null` verir", async () => {
    expect(await getGuidePlace("gpl-yoxdur")).toBeNull();
  });

  it("təcili məkanlar siyahının BAŞINDADIR (spec §3)", async () => {
    const places = await listGuidePlaces(undefined, ALL);
    const firstNonEmergency = places.findIndex((place) => !place.isEmergency);
    const lastEmergency = places.map((p) => p.isEmergency).lastIndexOf(true);

    expect(lastEmergency).toBeLessThan(firstNonEmergency);
  });

  it("11 kateqoriyanın hamısında ən azı bir yazı var", async () => {
    const places = await listGuidePlaces(undefined, ALL);
    const categories = new Set(places.map((place) => place.category));

    expect(categories.size).toBe(11);
  });
});
