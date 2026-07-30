// ============================================================================
// src/lib/milestones.test.ts
// Sistem milestone-larının BAZASIZ testləri (Blok 8).
//
// Burada yoxlanan üç şey `ensureCohortMilestones`-un düzgünlüyünü müəyyən edir:
//   1. 🔒 GÖRÜNÜRLÜK — milestone `PRIVATE` OLA BİLMƏZ (TƏLƏ B). Sahib şaxəsi
//      mənbə əlaqələrindən qurulur, milestone-un mənbəyi yoxdur → `PRIVATE`
//      qeyd HEÇ KİMƏ görünməzdi.
//   2. GƏLƏCƏK TARİX — baş verməmiş hadisə xronologiyada olmur.
//   3. DETERMİNİSTİK ID — səhifə hər açılışda çağırır; id sabit olmasa hər
//      ziyarət dublikat yaradardı.
// ============================================================================

import { describe, expect, it } from "vitest";

import { PostCategory, TimelineSourceType, Visibility } from "@/lib/enums";
import {
  ADMISSION_ANNOUNCE_DAYS_BEFORE,
  buildCohortMilestones,
  milestoneId,
  type MilestoneCohort,
} from "@/lib/milestones";
import { academicYearOf } from "@/lib/stage";

/**
 * ⚠️ Tarixlər YERLİ komponentlərlə qurulur (`fanout.test.ts` ilə eyni səbəb):
 * `new Date("2023-09-18")` UTC yarımgecəsidir və UTC-dən geri qalan qurşaqda
 * 17 sentyabra düşərdi.
 */
function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 9, 0, 0);
}

/** Seed-dəki `sec2023` cohort-u: 18.09.2023 → 25.06.2027. */
function cohortOf(overrides: Partial<MilestoneCohort> = {}): MilestoneCohort {
  return {
    id: "coh-sec2023",
    admissionYear: 2023,
    academicStartsAt: localDate(2023, 8, 18),
    graduatesAt: localDate(2027, 5, 25),
    ...overrides,
  };
}

/** Sinif hələ oxuyur (məzuniyyət gələcəkdədir). */
const DURING_STUDIES = localDate(2026, 6, 29); // 29 iyul 2026
/** Məzuniyyətdən sonra. */
const AFTER_GRADUATION = localDate(2027, 8, 1);

// ---------------------------------------------------------------------------
// 1. 🔒 Görünürlük — TƏLƏ B
// ---------------------------------------------------------------------------

describe("milestone görünürlüyü (TƏLƏ B)", () => {
  it("HEÇ BİR milestone PRIVATE deyil", () => {
    const milestones = buildCohortMilestones(cohortOf(), AFTER_GRADUATION);

    expect(milestones.length).toBeGreaterThan(0);
    for (const milestone of milestones) {
      expect(milestone.visibility, milestone.id).not.toBe(Visibility.PRIVATE);
    }
  });

  it("görünürlük UNIVERSITY-dir — sahibsiz qeyd yalnız səviyyə şaxəsi ilə görünür", () => {
    for (const milestone of buildCohortMilestones(cohortOf(), AFTER_GRADUATION)) {
      expect(milestone.visibility).toBe(Visibility.UNIVERSITY);
    }
  });

  it("mənbə əlaqələri YOXDUR — sourceType SYSTEM, isSystemMilestone true", () => {
    for (const milestone of buildCohortMilestones(cohortOf(), AFTER_GRADUATION)) {
      expect(milestone.sourceType).toBe(TimelineSourceType.SYSTEM);
      expect(milestone.isSystemMilestone).toBe(true);
      // `postId` / `achievementId` / `eventId` obyektdə ÜMUMİYYƏTLƏ yoxdur —
      // Prisma default `null` yazır.
      expect("postId" in milestone).toBe(false);
      expect("achievementId" in milestone).toBe(false);
      expect("eventId" in milestone).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Gələcək tarixli milestone yaradılmır
// ---------------------------------------------------------------------------

describe("gələcək tarixli milestone", () => {
  it("məzuniyyət hələ olmayıbsa qeyd YOXDUR", () => {
    const keys = buildCohortMilestones(cohortOf(), DURING_STUDIES).map((m) => m.id);
    expect(keys).not.toContain(milestoneId("coh-sec2023", "graduation"));
  });

  it("məzuniyyət keçmişdədirsə qeyd VAR", () => {
    const keys = buildCohortMilestones(cohortOf(), AFTER_GRADUATION).map((m) => m.id);
    expect(keys).toContain(milestoneId("coh-sec2023", "graduation"));
  });

  it("gələcək tədris ili başlanğıcı yaradılmır", () => {
    // 29 iyul 2026 → 2026-09-01 HƏLƏ gəlməyib, 2024/2025 isə keçib.
    const ids = buildCohortMilestones(cohortOf(), DURING_STUDIES).map((m) => m.id);

    expect(ids).toContain(milestoneId("coh-sec2023", "year-2024"));
    expect(ids).toContain(milestoneId("coh-sec2023", "year-2025"));
    expect(ids).not.toContain(milestoneId("coh-sec2023", "year-2026"));
  });

  it("heç bir qeydin tarixi `now`-dan böyük deyil", () => {
    for (const milestone of buildCohortMilestones(cohortOf(), DURING_STUDIES)) {
      expect(milestone.occurredAt.getTime()).toBeLessThanOrEqual(DURING_STUDIES.getTime());
    }
  });

  it("dərslər hələ başlamayıbsa yalnız qəbul elanı qalır (INCOMING sinif)", () => {
    const incoming = cohortOf({
      id: "coh-cs2026",
      admissionYear: 2026,
      academicStartsAt: localDate(2026, 8, 15),
      graduatesAt: localDate(2030, 5, 28),
    });

    const milestones = buildCohortMilestones(incoming, localDate(2026, 6, 29));

    expect(milestones.map((m) => m.id)).toEqual([milestoneId("coh-cs2026", "admission")]);
  });
});

// ---------------------------------------------------------------------------
// 3. Deterministik id və sıra
// ---------------------------------------------------------------------------

describe("deterministiklik", () => {
  it("iki çağırış EYNİ id-ləri verir (dublikat qorunması `upsert` üçün)", () => {
    const first = buildCohortMilestones(cohortOf(), DURING_STUDIES);
    const second = buildCohortMilestones(cohortOf(), DURING_STUDIES);

    expect(second.map((m) => m.id)).toEqual(first.map((m) => m.id));
  });

  it("id `mil-<cohortId>-<açar>` formasındadır və cohort-lar arasında kəsişmir", () => {
    const a = buildCohortMilestones(cohortOf({ id: "coh-a" }), DURING_STUDIES);
    const b = buildCohortMilestones(cohortOf({ id: "coh-b" }), DURING_STUDIES);

    for (const milestone of a) expect(milestone.id.startsWith("mil-coh-a-")).toBe(true);

    const shared = a.map((m) => m.id).filter((id) => b.some((other) => other.id === id));
    expect(shared).toEqual([]);
  });

  it("id-lər siyahı daxilində TƏKRARLANMIR", () => {
    const ids = buildCohortMilestones(cohortOf(), AFTER_GRADUATION).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nəticə tarixə görə ARTAN sıradadır", () => {
    const milestones = buildCohortMilestones(cohortOf(), AFTER_GRADUATION);

    for (let i = 1; i < milestones.length; i += 1) {
      expect(milestones[i].occurredAt.getTime()).toBeGreaterThanOrEqual(
        milestones[i - 1].occurredAt.getTime(),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Tarix hesablaması
// ---------------------------------------------------------------------------

describe("tarixlər və akademik il", () => {
  it("qəbul elanı dərslərdən 60 gün əvvəldir", () => {
    const cohort = cohortOf();
    const admission = buildCohortMilestones(cohort, AFTER_GRADUATION).find(
      (m) => m.id === milestoneId(cohort.id, "admission"),
    );

    expect(admission).toBeDefined();
    const days =
      (cohort.academicStartsAt.getTime() - admission!.occurredAt.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBe(ADMISSION_ANNOUNCE_DAYS_BEFORE);
  });

  it("«Dərslər başladı» məhz `academicStartsAt`-dadır", () => {
    const cohort = cohortOf();
    const start = buildCohortMilestones(cohort, AFTER_GRADUATION).find(
      (m) => m.id === milestoneId(cohort.id, "start"),
    );

    expect(start!.occurredAt).toEqual(cohort.academicStartsAt);
    expect(start!.category).toBe(PostCategory.FIRST_DAY);
  });

  it("tədris ili başlanğıcları sentyabrın 1-idir", () => {
    const cohort = cohortOf();
    const yearStarts = buildCohortMilestones(cohort, AFTER_GRADUATION).filter((m) =>
      m.id.includes("-year-"),
    );

    expect(yearStarts.length).toBe(3); // 2024, 2025, 2026
    for (const milestone of yearStarts) {
      expect(milestone.occurredAt.getMonth()).toBe(8);
      expect(milestone.occurredAt.getDate()).toBe(1);
    }
  });

  it("`academicYear` hər qeyd üçün `occurredAt`-dan hesablanır", () => {
    for (const milestone of buildCohortMilestones(cohortOf(), AFTER_GRADUATION)) {
      expect(milestone.academicYear).toBe(academicYearOf(milestone.occurredAt));
    }
  });

  it("sentyabr 1 qeydinin başlığı YENİ tədris ilini göstərir", () => {
    const cohort = cohortOf();
    const y2024 = buildCohortMilestones(cohort, AFTER_GRADUATION).find(
      (m) => m.id === milestoneId(cohort.id, "year-2024"),
    );

    expect(y2024!.academicYear).toBe("2024-2025");
    expect(y2024!.title).toBe("2024-2025 tədris ili başladı");
  });

  it("başlanğıc ilinin sentyabrı təkrar qeyd yaratmır (`start` ilə üst-üstə düşmür)", () => {
    // `academicStartsAt` 18 sentyabr 2023 → həmin ilin 1 sentyabrı ondan
    // ƏVVƏLDİR və buraxılır, yoxsa eyni tədris ili iki dəfə işarələnərdi.
    const cohort = cohortOf();
    const ids = buildCohortMilestones(cohort, AFTER_GRADUATION).map((m) => m.id);

    expect(ids).not.toContain(milestoneId(cohort.id, "year-2023"));
  });
});
