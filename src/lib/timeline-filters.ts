// ============================================================================
// src/lib/timeline-filters.ts
// Class Timeline [M8] filtrlərinin TƏRİFİ və URL vəziyyəti (spec §10).
//
// 🔴 BU FAYL SAFDIR (Prisma / React / servis importu yoxdur) —
// `lib/directory-filters.ts` ilə eyni səbəbdən: parse ↔ serialize dövrəsi
// bazasız testlə bərkidilir və həm server komponenti, həm client (nuqs) eyni
// parametr adlarını işlədir.
//
// 🔴 PARAMETR ADLARI `features/timeline/filter-state.ts` İLƏ EYNİ OLMALIDIR.
// Ayrılsalar filtr "işləyir, amma nəticə dəyişmir" olur (Blok 6-nın dərsi).
//
// Üç filtr (spec §10) + səhifə:
//   year    — tədris ili ("2026-2027"), siyahı SERVİSDƏN gəlir (məxfilikdən
//             keçmiş illər, bax `listTimeline` → `academicYears`)
//   category— 12 PostCategory-dən biri
//   source  — POST | ACHIEVEMENT | EVENT | SYSTEM
// ============================================================================

import { PostCategorySchema, TimelineSourceTypeSchema } from "@/lib/enums";
import type { PostCategory, TimelineSourceType } from "@/lib/enums";

export const TIMELINE_PARAMS = {
  year: "year",
  category: "category",
  source: "source",
  page: "page",
} as const;

/** Tədris ili formatı: "2026-2027". Zibil dəyər filtri SƏSSİZCƏ ləğv edir. */
const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export interface TimelineFilterState {
  academicYear: string | null;
  category: PostCategory | null;
  sourceType: TimelineSourceType | null;
  /** 1-dən başlayır. */
  page: number;
}

export const FIRST_TIMELINE_PAGE = 1;

/** Bir səhifədə göstərilən qeyd sayı (spec §10 — 50 qeyd/səhifə). */
export const TIMELINE_PAGE_SIZE = 50;

export function emptyTimelineFilters(): TimelineFilterState {
  return {
    academicYear: null,
    category: null,
    sourceType: null,
    page: FIRST_TIMELINE_PAGE,
  };
}

/** Səhifə nömrəsi filtr sayılmır — «sıfırla» düyməsi onu da atır. */
export function activeTimelineFilterCount(filters: TimelineFilterState): number {
  return (
    (filters.academicYear === null ? 0 : 1) +
    (filters.category === null ? 0 : 1) +
    (filters.sourceType === null ? 0 : 1)
  );
}

export function hasActiveTimelineFilters(filters: TimelineFilterState): boolean {
  return activeTimelineFilterCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export type TimelineSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: TimelineSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/**
 * URL-i doğrulanmış filtr obyektinə çevirir.
 *
 * ⚠️ Naməlum dəyər 404 VERMİR — filtr sadəcə nəzərə alınmır (lentdəki
 * kateqoriya ilə eyni yanaşma; URL əl ilə dəyişdirilə bilər, bu, səhv deyil).
 */
export function parseTimelineParams(
  input: TimelineSearchParamsInput,
): TimelineFilterState {
  const year = firstText(input, TIMELINE_PARAMS.year);
  const category = firstText(input, TIMELINE_PARAMS.category);
  const source = firstText(input, TIMELINE_PARAMS.source);
  const rawPage = firstText(input, TIMELINE_PARAMS.page);

  const parsedCategory = category === null ? null : PostCategorySchema.safeParse(category);
  const parsedSource =
    source === null ? null : TimelineSourceTypeSchema.safeParse(source);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    academicYear: year !== null && ACADEMIC_YEAR_PATTERN.test(year) ? year : null,
    category: parsedCategory?.success ? parsedCategory.data : null,
    sourceType: parsedSource?.success ? parsedSource.data : null,
    page: Number.isInteger(page) && page >= FIRST_TIMELINE_PAGE ? page : FIRST_TIMELINE_PAGE,
  };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

/**
 * Paylaşıla bilən sorğu sətri. `parse(serialize(f))` → `f` (testlə bərkidilib).
 * Boş dəyərlər və `page = 1` yazılmır — link təmiz qalır.
 */
export function serializeTimelineParams(filters: TimelineFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.academicYear !== null) params.set(TIMELINE_PARAMS.year, filters.academicYear);
  if (filters.category !== null) params.set(TIMELINE_PARAMS.category, filters.category);
  if (filters.sourceType !== null) params.set(TIMELINE_PARAMS.source, filters.sourceType);
  if (filters.page > FIRST_TIMELINE_PAGE) {
    params.set(TIMELINE_PARAMS.page, String(filters.page));
  }

  return params;
}

/** `?a=b` — boşsa boş sətir (URL "?" ilə bitməsin). */
export function timelineQueryString(filters: TimelineFilterState): string {
  const query = serializeTimelineParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

export function timelineHref(cohortSlug: string, filters: TimelineFilterState): string {
  return `/class/${cohortSlug}/timeline${timelineQueryString(filters)}`;
}

// ---------------------------------------------------------------------------
// Səhifələmə
// ---------------------------------------------------------------------------

export function timelinePageCount(total: number, pageSize = TIMELINE_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function timelineSkipOf(
  filters: TimelineFilterState,
  pageSize = TIMELINE_PAGE_SIZE,
): number {
  return (Math.max(filters.page, FIRST_TIMELINE_PAGE) - 1) * pageSize;
}
