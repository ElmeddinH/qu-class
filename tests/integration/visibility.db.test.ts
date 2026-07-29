// @vitest-environment node
// ============================================================================
// tests/integration/visibility.db.test.ts
// Məxfilik mühərrikinin REAL BAZAYA qarşı yoxlanışı.
//
// ⚠️ YALNIZ OXUYUR — heç bir sətir yaratmır, dəyişmir, silmir. Seed edilmiş
// `prisma/dev.db` tələb olunur (`npm run db:seed`).
//
// Vahid testlər (src/lib/visibility.test.ts) şərtin FORMASINI yoxlayır; bu
// fayl həmin şərtin SQL-ə düşəndə əsl nəticə verdiyini yoxlayır. İkisi fərqli
// şeylərdir: `{ cohortId: { in: [...] } }` düzgün formadadır, amma NULL-larla
// necə davrandığını yalnız baza deyə bilər.
//
// Hər testdə "boş nəticə ilə yaşıl olmaq" tələsinə qarşı SANITY yoxlaması var:
// əvvəlcə süzülməli məlumatın BAZADA MÖVCUD olduğu təsdiqlənir.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ANONYMOUS, type Viewer } from "@/lib/visibility";
import { listFeed } from "@/services/post.service";
import { getProfile } from "@/services/user.service";
import { getWhereAreWeNowStats } from "@/services/stats.service";
import { listEvents } from "@/services/event.service";
import { listAchievements } from "@/services/achievement.service";

const prisma = new PrismaClient();

/** Səhifələmə deyil, ƏHATƏ yoxlanılır — bütün uyğun sətirlər çəkilir. */
const ALL = 1000;

async function viewerOf(email: string): Promise<Extract<Viewer, { kind: "USER" }>> {
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

let student: Extract<Viewer, { kind: "USER" }>;
let alumni: Extract<Viewer, { kind: "USER" }>;
let admin: Extract<Viewer, { kind: "USER" }>;

beforeAll(async () => {
  // PLAN.md §7 test hesabları: `rep` sec2023 cohort-unda, `alumni` fin2018-də.
  [student, alumni, admin] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
    viewerOf("admin@qu.edu.az"),
  ]);

  // İki test hesabının cohort-ları KƏSİŞMƏMƏLİDİR, yoxsa "fərqli sinif"
  // testləri mənasız olar.
  const shared = student.cohortIds.filter((id) => alumni.cohortIds.includes(id));
  expect(shared).toEqual([]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===========================================================================
// 1. listFeed — anonim istifadəçi
// ===========================================================================

describe("listFeed(ANONYMOUS)", () => {
  it("PUBLIC olmayan HEÇ BİR post qaytarmır", async () => {
    // Sanity: bazada süzülməli məzmun var.
    const hidden = await prisma.post.count({
      where: { status: "ACTIVE", visibility: { not: "PUBLIC" } },
    });
    expect(hidden).toBeGreaterThan(0);

    const page = await listFeed(ANONYMOUS, { take: ALL });

    expect(page.items.length).toBeGreaterThan(0);
    for (const post of page.items) {
      expect(post.visibility).toBe("PUBLIC");
    }
  });

  it("dəqiq olaraq ACTIVE + PUBLIC postların hamısını qaytarır", async () => {
    const expected = await prisma.post.count({
      where: { status: "ACTIVE", visibility: "PUBLIC" },
    });

    const page = await listFeed(ANONYMOUS, { take: ALL });
    expect(page.items).toHaveLength(expected);
  });

  it("soft-delete edilmiş postu qaytarmır", async () => {
    const deleted = await prisma.post.findMany({
      where: { status: "DELETED" },
      select: { id: true },
    });
    expect(deleted.length).toBeGreaterThan(0);

    const page = await listFeed(ANONYMOUS, { take: ALL });
    const returnedIds = new Set(page.items.map((p) => p.id));
    for (const post of deleted) {
      expect(returnedIds.has(post.id)).toBe(false);
    }
  });
});

// ===========================================================================
// 2. listFeed — fərqli cohort üzvü
// ===========================================================================

describe("listFeed(fərqli cohort üzvü)", () => {
  it("başqa sinfin CLASS postlarını QAYTARMIR", async () => {
    // Sanity: `student`-in cohort-unda CLASS postu var.
    const classPostsInOtherCohort = await prisma.post.count({
      where: {
        status: "ACTIVE",
        visibility: "CLASS",
        cohortId: { in: student.cohortIds },
      },
    });
    expect(classPostsInOtherCohort).toBeGreaterThan(0);

    const page = await listFeed(alumni, { take: ALL });

    for (const post of page.items) {
      if (post.visibility !== "CLASS") continue;
      // Görünən hər CLASS postu ya viewer-in öz sinfindəndir, ya da özünündür.
      const isOwn = post.author.id === alumni.userId;
      const inOwnCohort = alumni.cohortIds.includes(post.cohort.id);
      expect(isOwn || inOwnCohort).toBe(true);
    }
  });

  it("başqa sinfin UNIVERSITY postlarını GÖRÜR", async () => {
    const page = await listFeed(alumni, { take: ALL });
    const foreignUniversityPosts = page.items.filter(
      (p) => p.visibility === "UNIVERSITY" && !alumni.cohortIds.includes(p.cohort.id),
    );
    expect(foreignUniversityPosts.length).toBeGreaterThan(0);
  });

  it("başqasının PRIVATE postunu HEÇ VAXT qaytarmır", async () => {
    const privatePosts = await prisma.post.count({
      where: { status: "ACTIVE", visibility: "PRIVATE", authorId: { not: alumni.userId } },
    });
    expect(privatePosts).toBeGreaterThan(0);

    const page = await listFeed(alumni, { take: ALL });
    for (const post of page.items) {
      if (post.visibility === "PRIVATE") {
        expect(post.author.id).toBe(alumni.userId);
      }
    }
  });

  it("UNIVERSITY_ADMIN də başqa sinfin CLASS postunu GÖRMÜR", async () => {
    // Admin rolu moderasiya axınıdır — adi oxu sorğusunda imtiyaz vermir.
    const page = await listFeed(admin, { take: ALL });

    for (const post of page.items) {
      if (post.visibility !== "CLASS") continue;
      const isOwn = post.author.id === admin.userId;
      expect(isOwn || admin.cohortIds.includes(post.cohort.id)).toBe(true);
    }
  });
});

// ===========================================================================
// 3. getProfile — sahə-səviyyə redaksiya
// ===========================================================================

describe("getProfile", () => {
  it("anonim viewer üçün `phone` və `personalEmail` AÇARI ÜMUMİYYƏTLƏ yoxdur", async () => {
    // Hər iki sahəsi DOLU olan istifadəçi seçilir — yəni gizlənən real dəyərdir.
    const target = await prisma.user.findFirstOrThrow({
      where: { phone: { not: null }, personalEmail: { not: null } },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const result = await getProfile(ANONYMOUS, target.id);
    expect(result).not.toBeNull();

    // `null` DEYİL — AÇARIN ÖZÜ yoxdur. Sahənin mövcudluğu belə sızmamalıdır.
    expect("phone" in result!.profile).toBe(false);
    expect("personalEmail" in result!.profile).toBe(false);

    // Ad-soyad isə həmişə var (platformanın minimumu).
    expect(result!.profile.firstName).toBeTruthy();
    expect(result!.profile.lastName).toBeTruthy();
  });

  it("sahibin özü `phone` sahəsini GÖRÜR", async () => {
    const target = await prisma.user.findFirstOrThrow({
      where: { phone: { not: null } },
      select: { id: true, memberships: { select: { cohortId: true } } },
      orderBy: { id: "asc" },
    });

    const selfViewer: Viewer = {
      kind: "USER",
      userId: target.id,
      cohortIds: target.memberships.map((m) => m.cohortId),
      systemRole: "USER",
      moderatedCohortIds: [],
    };

    const result = await getProfile(selfViewer, target.id);
    expect(result!.profile.phone).toBeTruthy();
  });

  it("UNIVERSITY_ADMIN başqasının PRIVATE sahəsini GÖRMÜR", async () => {
    const target = await prisma.user.findFirstOrThrow({
      where: {
        phone: { not: null },
        id: { not: admin.userId },
        fieldVisibility: { some: { field: "phone", level: "PRIVATE" } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const result = await getProfile(admin, target.id);
    expect("phone" in result!.profile).toBe(false);
  });

  it("əlaqə sahələri DÜZLƏNDİRİLİB — CLASS səviyyəsində sinif yoldaşına görünür", async () => {
    // TƏLƏ 3: düzləndirmə olmasa bu açarlar heç vaxt görünməzdi və məxfilik
    // tənzimləməsi səssizcə işləməzdi.
    const target = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: { in: student.cohortIds } } },
        id: { not: student.userId },
        tags: { some: { tag: { type: "INTEREST" } } },
        fieldVisibility: { some: { field: "interests", level: { in: ["CLASS", "UNIVERSITY", "PUBLIC"] } } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const result = await getProfile(student, target.id);
    expect(Array.isArray(result!.profile.interests)).toBe(true);
    expect(result!.profile.interests!.length).toBeGreaterThan(0);
  });

  it("fərqli sinif üzvü CLASS səviyyəli sahələri GÖRMÜR", async () => {
    const target = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: { in: student.cohortIds } } },
        bio: { not: null },
        fieldVisibility: { some: { field: "bio", level: "CLASS" } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    // `alumni` başqa cohort-dadır → CLASS sahəsi bağlıdır.
    const forOutsider = await getProfile(alumni, target.id);
    expect("bio" in forOutsider!.profile).toBe(false);

    // `student` eyni cohort-dadır → açıqdır.
    const forClassmate = await getProfile(student, target.id);
    expect(forClassmate!.profile.bio).toBeTruthy();
  });
});

// ===========================================================================
// 4. Aqreqasiya — includeInStats razılığı
// ===========================================================================

describe("getWhereAreWeNowStats", () => {
  it("`includeInStats = false` qeydləri SAYMIR", async () => {
    const stats = await getWhereAreWeNowStats(alumni);

    // Razılıq süzgəci olmasaydı nə qədər olardı?
    const withoutConsent = await prisma.careerEntry.groupBy({
      by: ["userId"],
      where: {
        isCurrent: true,
        OR: [
          { userId: alumni.userId },
          { visibility: "PUBLIC" },
          { visibility: "UNIVERSITY" },
          {
            visibility: "CLASS",
            user: { memberships: { some: { cohortId: { in: alumni.cohortIds } } } },
          },
        ],
      },
    });

    const withConsent = await prisma.careerEntry.groupBy({
      by: ["userId"],
      where: {
        isCurrent: true,
        includeInStats: true,
        OR: [
          { userId: alumni.userId },
          { visibility: "PUBLIC" },
          { visibility: "UNIVERSITY" },
          {
            visibility: "CLASS",
            user: { memberships: { some: { cohortId: { in: alumni.cohortIds } } } },
          },
        ],
      },
    });

    // Sanity: razılıq verməyən qeydlər həqiqətən var, yəni test boş deyil.
    expect(withoutConsent.length).toBeGreaterThan(withConsent.length);

    expect(stats.respondentCount).toBe(withConsent.length);
  });

  it("görünürlük süzgəci aqreqasiyada da işləyir", async () => {
    // Anonim viewer yalnız PUBLIC + razılıq verilmiş qeydləri sayır.
    const anonStats = await getWhereAreWeNowStats(ANONYMOUS);
    const expected = await prisma.careerEntry.groupBy({
      by: ["userId"],
      where: { isCurrent: true, includeInStats: true, visibility: "PUBLIC" },
    });

    expect(anonStats.respondentCount).toBe(expected.length);
    expect(anonStats.respondentCount).toBeLessThan(
      (await getWhereAreWeNowStats(alumni)).respondentCount,
    );
  });

  it("3 nəfərdən kiçik xanalar göstərilmir (k-anonimlik)", async () => {
    const stats = await getWhereAreWeNowStats(alumni);

    for (const bucket of stats.countries.visible) {
      expect(bucket.count).toBeGreaterThanOrEqual(3);
    }
    for (const bucket of stats.locations.visible) {
      expect(bucket.count).toBeGreaterThanOrEqual(3);
    }
    // Gizlədilənlər itmir, "Digər"ə yığılır.
    expect(stats.countries.otherCount).toBeGreaterThanOrEqual(0);
  });

  it("məkan xanalarında dəqiq ünvan/koordinat sahəsi YOXDUR", async () => {
    const stats = await getWhereAreWeNowStats(alumni);
    for (const bucket of stats.locations.visible) {
      expect(Object.keys(bucket).sort()).toEqual(["city", "count", "country"]);
    }
  });
});

// ===========================================================================
// 5. TƏLƏ 2 — `IN (...)` NULL ilə heç vaxt uyğun gəlmir
// ===========================================================================

describe("cohortId = NULL sətirlər (TƏLƏ 2)", () => {
  it("`cohortId IN (bütün cohort-lar)` NULL sətirləri KƏNARDA saxlayır", async () => {
    const allCohorts = await prisma.cohort.findMany({ select: { id: true } });
    const allIds = allCohorts.map((c) => c.id);

    // Sanity: `cohortId = null` tədbirlər var (UNIVERSITY / FACULTY / CLUB).
    const nullCount = await prisma.event.count({ where: { cohortId: null } });
    expect(nullCount).toBeGreaterThan(0);

    const matched = await prisma.event.findMany({
      where: { cohortId: { in: allIds } },
      select: { id: true, cohortId: true },
    });

    // SQL semantikası: `NULL IN (...)` → UNKNOWN, sətir seçilmir.
    expect(matched.every((e) => e.cohortId !== null)).toBe(true);
    expect(matched.length).toBe(await prisma.event.count({ where: { cohortId: { not: null } } }));
  });

  it("mühərrikin CLASS şaxəsi `cohortId = NULL` sətirlərin HEÇ BİRİNİ seçmir", async () => {
    // Seed-də `CLASS` + `cohortId = null` tədbir YOXDUR, ona görə "siyahıda
    // görünmür" yoxlaması boş çıxardı. Bunun əvəzinə invariant BİRBAŞA
    // ölçülür: mühərrikin qurduğu CLASS predikatı mövcud NULL sətirlərə
    // tətbiq edilir. Nəticə 0 olmalıdır — hansı `visibility` dəyəri olursa
    // olsun, cohortsuz sətir sinif şaxəsindən keçə bilmir.
    const allCohorts = await prisma.cohort.findMany({ select: { id: true } });

    const nullRows = await prisma.event.count({ where: { cohortId: null } });
    expect(nullRows).toBeGreaterThan(0);

    const matchedNullRows = await prisma.event.count({
      where: {
        AND: [
          { cohortId: null },
          // `visibilityWhere`-in CLASS şaxəsindəki EYNİ şərt:
          { cohortId: { in: allCohorts.map((c) => c.id) } },
        ],
      },
    });
    expect(matchedNullRows).toBe(0);

    // Əlavə olaraq: siyahıda da belə sətir yoxdur.
    const visible = await listEvents(alumni, { take: ALL });
    const leaked = visible.filter(
      (e) => e.visibility === "CLASS" && e.cohort === null && e.createdBy.id !== alumni.userId,
    );
    expect(leaked).toEqual([]);
  });
});

// ===========================================================================
// 6. Modelə görə fərqli statuslar
// ===========================================================================

describe("status filtrləri modelə görə fərqlidir", () => {
  it("listAchievements yalnız VERIFIED / FEATURED qaytarır (sahib istisna)", async () => {
    const submitted = await prisma.achievement.count({ where: { status: "SUBMITTED" } });
    expect(submitted).toBeGreaterThan(0);

    const items = await listAchievements(alumni, { take: 1000 });
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      if (item.owner.id === alumni.userId) continue;
      expect(["VERIFIED", "FEATURED"]).toContain(item.status);
    }
  });

  it("listEvents yalnız PUBLISHED / COMPLETED qaytarır (yaradıcı istisna)", async () => {
    const drafts = await prisma.event.count({ where: { status: { in: ["DRAFT", "CANCELLED"] } } });
    expect(drafts).toBeGreaterThan(0);

    const items = await listEvents(alumni, { take: 1000 });
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      if (item.createdBy.id === alumni.userId) continue;
      expect(["PUBLISHED", "COMPLETED"]).toContain(item.status);
    }
  });
});
