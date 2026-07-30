// ============================================================================
// src/lib/achievement-filters.ts
// Class Achievements [M10] filtrinin URL vəziyyəti (spec §12).
//
// 🔴 SAFDIR (Prisma / React / servis importu yoxdur) — `timeline-filters.ts`
// ilə eyni səbəbdən: server komponenti, client (nuqs) və səhifələmə linkləri
// EYNİ parametr adlarını işlətməlidir.
//
// Bir filtr (12 `AchievementCategory`) + səhifə. Nailiyyət kateqoriyaları
// `PostCategory`-dən TAMAMİLƏ AYRI siyahıdır — bax `features/feed/catalog.ts`.
// ============================================================================

import { AchievementCategorySchema, type AchievementCategory } from "@/lib/enums";

export const ACHIEVEMENT_PARAMS = {
  category: "category",
  page: "page",
} as const;

export const FIRST_ACHIEVEMENT_PAGE = 1;

export interface AchievementFilterState {
  category: AchievementCategory | null;
  page: number;
}

export function emptyAchievementFilters(): AchievementFilterState {
  return { category: null, page: FIRST_ACHIEVEMENT_PAGE };
}

export type AchievementSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: AchievementSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/** Naməlum kateqoriya 404 vermir — filtr sadəcə nəzərə alınmır. */
export function parseAchievementParams(
  input: AchievementSearchParamsInput,
): AchievementFilterState {
  const category = firstText(input, ACHIEVEMENT_PARAMS.category);
  const parsed = category === null ? null : AchievementCategorySchema.safeParse(category);

  const rawPage = firstText(input, ACHIEVEMENT_PARAMS.page);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    category: parsed?.success ? parsed.data : null,
    page:
      Number.isInteger(page) && page >= FIRST_ACHIEVEMENT_PAGE
        ? page
        : FIRST_ACHIEVEMENT_PAGE,
  };
}

export function serializeAchievementParams(
  filters: AchievementFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category !== null) params.set(ACHIEVEMENT_PARAMS.category, filters.category);
  if (filters.page > FIRST_ACHIEVEMENT_PAGE) {
    params.set(ACHIEVEMENT_PARAMS.page, String(filters.page));
  }
  return params;
}

export function achievementQueryString(filters: AchievementFilterState): string {
  const query = serializeAchievementParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

export function achievementsHref(
  cohortSlug: string,
  filters: AchievementFilterState,
): string {
  return `/class/${cohortSlug}/achievements${achievementQueryString(filters)}`;
}

export function achievementPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function achievementSkipOf(
  filters: AchievementFilterState,
  pageSize: number,
): number {
  return (Math.max(filters.page, FIRST_ACHIEVEMENT_PAGE) - 1) * pageSize;
}
