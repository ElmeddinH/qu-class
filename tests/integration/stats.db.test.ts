// @vitest-environment node
// ============================================================================
// tests/integration/stats.db.test.ts
// Blok 10B — "İndi haradayıq?" aqreqasiyasının REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALI: RAZILIQ VƏ GÖRÜNÜRLÜK DB SƏVİYYƏSİNDƏ İŞLƏYİRMİ?
// `career-stats.test.ts` k-anonimlik ALQORİTMİNİ bazasız sınayır (süni sətirlər).
// Bu fayl isə süzgəclərin PRİSMA `where` şərtinə düzgün düşdüyünü ölçür — iki
// fərqli sual, ona görə iki fərqli fayl.
//
// ⚠️ NİYƏ AYRI FAYL (`visibility.db.test.ts`-ə əlavə etmək əvəzinə):
// bu fayl YAZIR (razılığı söndürüb geri qaytarır), `visibility.db` isə yalnız
// OXUYUR. Vitest konfiqi `fileParallelism: false` ilə işləyir, yəni fayllar
// ardıcıldır və yazılar bir-birinə qarışmır (bax `vitest.config.ts`-dəki qeyd).
//
// 🔴 HƏR YAZI `finally`-DƏ GERİ QAYTARILIR. Seed determinizmi layihənin
// müqaviləsidir: test dəstindən sonra 28 cədvəlin sayları və dəyərləri təzə
// seed ilə eyni olmalıdır.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { cellTotal, type StatsCell } from "@/lib/career-stats";
import { MIN_BUCKET_SIZE, ANONYMOUS, type Viewer } from "@/lib/visibility";
import { getCareerOutcomeStats, getWhereAreWeNowStats } from "@/services/stats.service";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

/** Mock-un qaytardığı viewer — v1 endpoint testi üçün. */
let currentViewer: Viewer = ANONYMOUS;

// `lib/api/guard.ts` `getViewer`-i `@/lib/auth` barrel-indən import edir
// (`api.db.test.ts` ilə eyni səbəb: `auth()` Next sorğu kontekstini tələb edir).
vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return { ...original, getViewer: async () => currentViewer };
});

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

let alumni: UserViewer;
let outsider: UserViewer;
let cohortId: string;
let cohortSlug: string;

beforeAll(async () => {
  [alumni, outsider] = await Promise.all([
    viewerOf("alumni@qu.edu.az"),
    viewerOf("rep@qu.edu.az"),
  ]);

  cohortId = alumni.cohortIds[0];
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohortId },
    select: { slug: true },
  });
  cohortSlug = cohort.slug;
});

// ===========================================================================
// 1. Seed sağlamlığı — panel BOŞ olmamalıdır
// ===========================================================================

describe("seed məlumatı ilə panel DOLU qayıdır", () => {
  it("səkkiz xananın hamısında məlumat var (boş panel müdafiə üçün yararsızdır)", async () => {
    const stats = await getCareerOutcomeStats(alumni, { cohortId });

    // Sanity: sinif ölçüsü və razılıq sayı oxunur.
    expect(stats.respondentCount).toBeGreaterThanOrEqual(MIN_BUCKET_SIZE);
    expect(stats.memberCount).toBeGreaterThan(0);
    expect(stats.totalConsented).toBeGreaterThanOrEqual(stats.respondentCount);

    // Beş bölgü xanası açıqlanan qrup qaytarır.
    expect(stats.countries.visible.length).toBeGreaterThan(0);
    expect(stats.cities.visible.length).toBeGreaterThan(0);
    expect(stats.companies.visible.length).toBeGreaterThan(0);
    expect(stats.industries.visible.length).toBeGreaterThan(0);
    expect(stats.jobFunctions.visible.length).toBeGreaterThan(0);
    expect(stats.educationLevels.visible.length).toBeGreaterThan(0);

    // İki xəritə də markerlə dolu.
    expect(stats.mapPins.length).toBeGreaterThan(0);
    expect(stats.azPins.length).toBeGreaterThan(0);
    expect(stats.countryFills.length).toBeGreaterThan(0);
  });

  it("🔴 CƏM İNVARİANTI real məlumatda da qorunur", async () => {
    const stats = await getCareerOutcomeStats(alumni, { cohortId });

    // ⚠️ Tip: xanaların element formaları fərqlidir (`StatsBucket` / `CityBucket`),
    // ona görə ortaq üst tip (`{ count: number }`) ilə annotasiya olunur —
    // `as const` union yaradır və `cellTotal`-un generiki onu qəbul etmir.
    const cells: Array<[string, StatsCell<{ count: number }>]> = [
      ["countries", stats.countries],
      ["cities", stats.cities],
      ["companies", stats.companies],
      ["industries", stats.industries],
      ["jobFunctions", stats.jobFunctions],
      ["educationLevels", stats.educationLevels],
    ];

    for (const [name, cell] of cells) {
      expect(cellTotal(cell), `${name} xanasının cəmi`).toBe(stats.respondentCount);
    }
  });

  it("HEÇ BİR açıqlanan xana 3 nəfərdən kiçik deyil", async () => {
    const stats = await getCareerOutcomeStats(alumni, { cohortId });

    const counts = [
      ...stats.countries.visible.map((b) => b.count),
      ...stats.cities.visible.map((b) => b.count),
      ...stats.companies.visible.map((b) => b.count),
      ...stats.industries.visible.map((b) => b.count),
      ...stats.jobFunctions.visible.map((b) => b.count),
      ...stats.educationLevels.visible.map((b) => b.count),
      ...stats.mapPins.map((p) => p.count),
      ...stats.mapPins.flatMap((p) => p.roles.map((r) => r.count)),
      ...stats.countryFills.map((f) => f.count),
    ];

    expect(counts.length).toBeGreaterThan(0);
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(MIN_BUCKET_SIZE);
    }
  });
});

// ===========================================================================
// 2. 🔴 RAZILIQ SÜZGƏCİ — DoD tələbi
// ===========================================================================

describe("aqreqasiya razılığı (`includeInStats`)", () => {
  it("🔴 `includeInStats = false` CareerEntry statistikaya DÜŞMÜR", async () => {
    // `visibilityWhereForUserOwned(alumni)`-nin əl ilə yazılmış qarşılığı:
    // servisin şərtini TƏKRAR qurmaqla nəticəni MÜSTƏQİL yoxlayırıq.
    const visibleForAlumni = {
      OR: [
        { userId: alumni.userId },
        { visibility: "PUBLIC" },
        { visibility: "UNIVERSITY" },
        {
          visibility: "CLASS",
          user: { memberships: { some: { cohortId: { in: alumni.cohortIds } } } },
        },
      ],
    };

    const withoutConsent = await prisma.careerEntry.groupBy({
      by: ["userId"],
      where: { AND: [{ isCurrent: true }, visibleForAlumni] },
    });

    const withConsent = await prisma.careerEntry.groupBy({
      by: ["userId"],
      where: { AND: [{ isCurrent: true }, { includeInStats: true }, visibleForAlumni] },
    });

    // Sanity: razılıq verməyən GÖRÜNƏN cari qeydlər həqiqətən var — əks halda
    // test "boş nəticə ilə yaşıl" olardı.
    expect(withoutConsent.length).toBeGreaterThan(withConsent.length);

    const stats = await getCareerOutcomeStats(alumni);
    expect(stats.respondentCount).toBe(withConsent.length);
  });

  it("🔴 bir üzvün razılığını SÖNDÜR → rəqəmlər DƏYİŞİR (sonra geri qaytarılır)", async () => {
    const before = await getCareerOutcomeStats(alumni, { cohortId });

    // Açıqlanan ən böyük şəhərdə olan bir üzvü seçirik: onun çıxması həm
    // `respondentCount`-u, həm həmin şəhər xanasını dəyişməlidir.
    const biggestCity = before.cities.visible[0];
    expect(biggestCity, "açıqlanan şəhər yoxdur — test mənasızdır").toBeDefined();

    const victim = await prisma.careerEntry.findFirstOrThrow({
      where: {
        isCurrent: true,
        includeInStats: true,
        city: biggestCity.city,
        user: { memberships: { some: { cohortId } } },
      },
      select: { id: true, userId: true },
      orderBy: { id: "asc" },
    });

    try {
      await prisma.careerEntry.update({
        where: { id: victim.id },
        data: { includeInStats: false },
      });

      const after = await getCareerOutcomeStats(alumni, { cohortId });

      // 🔴 DoD: rəqəmlər DƏYİŞDİ.
      expect(after.respondentCount).toBe(before.respondentCount - 1);

      const cityAfter = after.cities.visible.find(
        (bucket) => bucket.city === biggestCity.city,
      );
      // Xana ya bir nəfər azaldı, ya (3-dən aşağı düşdüsə) tamamilə gizləndi.
      if (cityAfter) {
        expect(cityAfter.count).toBe(biggestCity.count - 1);
      } else {
        expect(biggestCity.count - 1).toBeLessThan(MIN_BUCKET_SIZE);
      }

      // İnvariant dəyişikliкdən SONRA da qorunur.
      expect(cellTotal(after.cities)).toBe(after.respondentCount);
    } finally {
      // Seed determinizmi: sətir geri qaytarılır.
      await prisma.careerEntry.update({
        where: { id: victim.id },
        data: { includeInStats: true },
      });
    }

    const restored = await getCareerOutcomeStats(alumni, { cohortId });
    expect(restored.respondentCount).toBe(before.respondentCount);
    expect(restored.cities.visible).toEqual(before.cities.visible);
  });
});

// ===========================================================================
// 3. Görünürlük süzgəci
// ===========================================================================

describe("görünürlük süzgəci aqreqasiyada", () => {
  it("`PRIVATE` karyera qeydi BAŞQA viewer üçün sayılmır", async () => {
    // `alumni`-nin öz PRIVATE + razılıq verilmiş cari qeydi (varsa) onun üçün
    // sayılır, kənar viewer üçün YOX.
    const privateRow = await prisma.careerEntry.findFirst({
      where: {
        isCurrent: true,
        includeInStats: true,
        visibility: "PRIVATE",
        user: { memberships: { some: { cohortId } } },
      },
      select: { id: true, userId: true, city: true },
      orderBy: { id: "asc" },
    });

    // Sanity: seed-də PRIVATE + razılıq verilmiş qeyd var.
    expect(privateRow, "PRIVATE cari qeyd yoxdur — test mənasızdır").not.toBeNull();

    const ownerViewer = await prisma.user.findUniqueOrThrow({
      where: { id: privateRow!.userId },
      select: { memberships: { select: { cohortId: true } } },
    });

    const owner: UserViewer = {
      kind: "USER",
      userId: privateRow!.userId,
      cohortIds: ownerViewer.memberships.map((m) => m.cohortId),
      systemRole: "USER",
      moderatedCohortIds: [],
    };

    // ⚠️ `viewerId` ÖTÜRÜLMƏLİDİR — `viewerIncluded` onsuz həmişə `false`-dur
    // (aqreqasiya baxanın kim olduğunu təxmin etmir).
    const ownerStats = await getCareerOutcomeStats(owner, {
      cohortId,
      viewerId: owner.userId,
    });
    const otherStats = await getCareerOutcomeStats(outsider, {
      cohortId,
      viewerId: outsider.userId,
    });

    // Sahibi öz PRIVATE sətrini görür və statistikada iştirak edir.
    expect(ownerStats.viewerIncluded).toBe(true);
    // Kənar sinif üzvü nə həmin sətri, nə də sinfin `CLASS` sətirlərini görür.
    expect(otherStats.viewerIncluded).toBe(false);
    expect(otherStats.respondentCount).toBeLessThan(ownerStats.respondentCount);
  });

  it("`isCurrent = false` qeyd SAYILMIR", async () => {
    const pastRow = await prisma.careerEntry.findFirstOrThrow({
      where: { isCurrent: false, includeInStats: true, visibility: "PUBLIC" },
      select: { id: true, userId: true, company: true },
      orderBy: { id: "asc" },
    });

    const stats = await getCareerOutcomeStats(ANONYMOUS);

    // Həmin istifadəçinin CARİ qeydi varmı? Yoxsa o, statistikada olmamalıdır.
    const currentForUser = await prisma.careerEntry.count({
      where: { userId: pastRow.userId, isCurrent: true, includeInStats: true },
    });

    if (currentForUser === 0) {
      // Keçmiş iş yeri sayılsaydı respondent sayı bu istifadəçini də tutardı.
      const respondentIds = await prisma.careerEntry.groupBy({
        by: ["userId"],
        where: { isCurrent: true, includeInStats: true, visibility: "PUBLIC" },
      });
      expect(respondentIds.map((r) => r.userId)).not.toContain(pastRow.userId);
      expect(stats.respondentCount).toBe(respondentIds.length);
    }

    // Cari qeydlərin sayı bütün qeydlərdən AZDIR — süzgəc həqiqətən işləyir.
    const allConsented = await prisma.careerEntry.count({
      where: { includeInStats: true, visibility: "PUBLIC" },
    });
    const currentConsented = await prisma.careerEntry.count({
      where: { includeInStats: true, visibility: "PUBLIC", isCurrent: true },
    });
    expect(currentConsented).toBeLessThan(allConsented);
  });

  it("anonim viewer üçün say sinif üzvündən KİÇİKDİR", async () => {
    const anon = await getCareerOutcomeStats(ANONYMOUS, { cohortId });
    const member = await getCareerOutcomeStats(alumni, { cohortId });

    expect(anon.respondentCount).toBeLessThan(member.respondentCount);
    // Anonim üçün də invariant qorunur.
    expect(cellTotal(anon.countries)).toBe(anon.respondentCount);
  });
});

// ===========================================================================
// 4. Köhnə müqavilə SINMADI (Blok 5 widget-i + mövcud testlər)
// ===========================================================================

describe("`getWhereAreWeNowStats` köhnə forması", () => {
  it("xanaların forması dəyişməyib və yeni aqreqasiya ilə uzlaşır", async () => {
    const legacy = await getWhereAreWeNowStats(alumni, { cohortId });
    const modern = await getCareerOutcomeStats(alumni, { cohortId });

    expect(legacy.respondentCount).toBe(modern.respondentCount);
    expect(legacy.countries.visible).toEqual(modern.countries.visible);
    expect(legacy.countries.otherCount).toBe(modern.countries.undisclosedCount);
    expect(legacy.jobFunctions.visible).toEqual(modern.jobFunctions.visible);

    // `locations` şəhər xanasından TÖRƏYİR və yalnız şəhər/ölkə daşıyır
    // (koordinat sahəsi YOXDUR — `coarsenLocation` proyeksiya qapısı).
    for (const bucket of legacy.locations.visible) {
      expect(Object.keys(bucket).sort()).toEqual(["city", "count", "country"]);
    }
  });
});

// ===========================================================================
// 5. v1 endpoint-i
// ===========================================================================

describe("GET /api/v1/cohorts/{slug}/stats/where-are-we-now", () => {
  async function callEndpoint(slug: string): Promise<Response> {
    const { GET } = await import(
      "@/app/api/v1/cohorts/[slug]/stats/where-are-we-now/route"
    );
    return GET(new Request(`http://localhost:3000/api/v1/cohorts/${slug}/stats/where-are-we-now`), {
      params: Promise.resolve({ slug }),
    });
  }

  it("🔴 autentifikasiyasız 401 JSON qaytarır (HTML yönləndirmə YOX)", async () => {
    currentViewer = ANONYMOUS;
    const response = await callEndpoint(cohortSlug);

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("sinif üzvü üçün 200 + `private, no-store` qaytarır", async () => {
    currentViewer = alumni;
    const response = await callEndpoint(cohortSlug);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");

    const body = (await response.json()) as { data: { respondentCount: number } };
    expect(body.data.respondentCount).toBeGreaterThan(0);
  });

  it("🔴 cavabda maaş/ad/profil linki YOXDUR", async () => {
    currentViewer = alumni;
    const response = await callEndpoint(cohortSlug);
    const raw = await response.text();

    // TƏLƏ D — əmək haqqı heç bir formada yoxdur.
    expect(raw).not.toMatch(/salary|bonus|wage|income|maaş/i);
    // Aqreqat cavabdır: istifadəçi id-si və profil linki daşımır.
    expect(raw).not.toContain("userId");
    expect(raw).not.toContain("/u/");
  });

  it("üzv OLMAYAN sinif üçün 404 (403 YOX — mövcudluq sızmasın)", async () => {
    currentViewer = alumni;
    const foreign = await prisma.cohort.findFirstOrThrow({
      where: { id: { notIn: alumni.cohortIds } },
      select: { slug: true },
    });

    const response = await callEndpoint(foreign.slug);
    expect(response.status).toBe(404);

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
