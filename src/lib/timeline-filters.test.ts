// ============================================================================
// src/lib/timeline-filters.test.ts
// Xronologiya və nailiyyət filtrlərinin URL DÖVRƏSİ (Blok 8).
//
// Blok 6-nın dərsi: `parse` və `serialize` ayrılanda filtr "işləyir, amma
// nəticə dəyişmir" olur — ən çətin tapılan səhv növü. Ona görə dövrə
// (`parse(serialize(f)) === f`) testlə bərkidilir.
// ============================================================================

import { describe, expect, it } from "vitest";

import { AchievementCategory, PostCategory, TimelineSourceType } from "@/lib/enums";
import {
  FIRST_ACHIEVEMENT_PAGE,
  achievementsHref,
  emptyAchievementFilters,
  parseAchievementParams,
  serializeAchievementParams,
} from "@/lib/achievement-filters";
import {
  FIRST_TIMELINE_PAGE,
  activeTimelineFilterCount,
  emptyTimelineFilters,
  parseTimelineParams,
  serializeTimelineParams,
  timelineHref,
  timelinePageCount,
  timelineSkipOf,
} from "@/lib/timeline-filters";

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

describe("parseTimelineParams", () => {
  it("boş URL default vəziyyət verir", () => {
    expect(parseTimelineParams({})).toEqual(emptyTimelineFilters());
  });

  it("üç filtri də oxuyur", () => {
    const state = parseTimelineParams({
      year: "2026-2027",
      category: PostCategory.EXAM_PERIOD,
      source: TimelineSourceType.SYSTEM,
      page: "3",
    });

    expect(state).toEqual({
      academicYear: "2026-2027",
      category: PostCategory.EXAM_PERIOD,
      sourceType: TimelineSourceType.SYSTEM,
      page: 3,
    });
  });

  it("naməlum dəyər 404 vermir — filtr sadəcə ləğv olunur", () => {
    const state = parseTimelineParams({
      year: "2026",           // format səhvdir
      category: "NOT_A_CAT",
      source: "TELEPATHY",
      page: "-4",
    });

    expect(state).toEqual(emptyTimelineFilters());
  });

  it("`URLSearchParams` və `Record` eyni nəticəni verir", () => {
    const record = { year: "2025-2026", category: PostCategory.TRIPS };
    const params = new URLSearchParams(record);

    expect(parseTimelineParams(params)).toEqual(parseTimelineParams(record));
  });

  it("dövrə: parse(serialize(f)) === f", () => {
    const filters = {
      academicYear: "2024-2025",
      category: PostCategory.CAPSTONE,
      sourceType: TimelineSourceType.ACHIEVEMENT,
      page: 5,
    };

    expect(parseTimelineParams(serializeTimelineParams(filters))).toEqual(filters);
  });

  it("boş dəyərlər və birinci səhifə URL-ə YAZILMIR (təmiz link)", () => {
    const query = serializeTimelineParams(emptyTimelineFilters()).toString();
    expect(query).toBe("");
    expect(timelineHref("sec2023", emptyTimelineFilters())).toBe(
      "/class/sec2023/timeline",
    );
  });

  it("səhifə nömrəsi yalnız 1-dən böyükdürsə yazılır", () => {
    const href = timelineHref("sec2023", {
      ...emptyTimelineFilters(),
      page: FIRST_TIMELINE_PAGE,
    });
    expect(href).not.toContain("page=");

    expect(timelineHref("sec2023", { ...emptyTimelineFilters(), page: 2 })).toContain(
      "page=2",
    );
  });
});

describe("timeline səhifələmə", () => {
  it("aktiv filtr sayı səhifəni saymır", () => {
    expect(activeTimelineFilterCount(emptyTimelineFilters())).toBe(0);
    expect(
      activeTimelineFilterCount({ ...emptyTimelineFilters(), page: 7 }),
    ).toBe(0);
    expect(
      activeTimelineFilterCount({
        ...emptyTimelineFilters(),
        academicYear: "2026-2027",
        category: PostCategory.TRIPS,
      }),
    ).toBe(2);
  });

  it("`skip` səhifə ölçüsünə görə hesablanır", () => {
    expect(timelineSkipOf({ ...emptyTimelineFilters(), page: 1 })).toBe(0);
    expect(timelineSkipOf({ ...emptyTimelineFilters(), page: 3 })).toBe(100);
  });

  it("səhifə sayı ən azı 1-dir (boş nəticədə də)", () => {
    expect(timelinePageCount(0)).toBe(1);
    expect(timelinePageCount(50)).toBe(1);
    expect(timelinePageCount(51)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

describe("parseAchievementParams", () => {
  it("kateqoriya `AchievementCategory`-dən oxunur", () => {
    const state = parseAchievementParams({ category: AchievementCategory.STARTUP });
    expect(state.category).toBe(AchievementCategory.STARTUP);
  });

  it("POST kateqoriyası QƏBUL EDİLMİR (iki enum ayrıdır)", () => {
    // `FIRST_DAY` `PostCategory`-dədir, `AchievementCategory`-də yoxdur.
    expect(parseAchievementParams({ category: PostCategory.FIRST_DAY }).category).toBeNull();
  });

  it("dövrə: parse(serialize(f)) === f", () => {
    const filters = { category: AchievementCategory.PATENT, page: 4 };
    expect(parseAchievementParams(serializeAchievementParams(filters))).toEqual(filters);
  });

  it("təmiz link: boş filtr + birinci səhifə parametrsizdir", () => {
    expect(achievementsHref("sec2023", emptyAchievementFilters())).toBe(
      "/class/sec2023/achievements",
    );
    expect(emptyAchievementFilters().page).toBe(FIRST_ACHIEVEMENT_PAGE);
  });
});
