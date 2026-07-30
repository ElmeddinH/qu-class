// ============================================================================
// src/lib/memory-filters.ts
// Share Memories [M9] filtrlərinin TƏRİFİ və URL vəziyyəti (spec §11).
//
// 🔴 BU FAYL SAFDIR (Prisma / React / servis importu yoxdur) —
// `lib/timeline-filters.ts` ilə eyni səbəbdən: parse ↔ serialize dövrəsi
// bazasız unit testlə bərkidilir və həm server komponenti, həm client (nuqs),
// həm də `/api/v1` endpoint-i EYNİ parametr adlarını işlədir.
//
// 🔴 PARAMETR ADLARI `features/memories/filter-state.ts` İLƏ EYNİ OLMALIDIR
// (`MEMORY_PARAMS`). Ayrılsalar filtr "işləyir, amma nəticə dəyişmir" olur
// (Blok 6-nın dərsi).
//
// İki filtr + səhifə:
//   type  — 8 `MemoryType` dəyərindən biri
//   place — YALNIZ məkanla bağlı xatirələr (`Memory.guidePlaceId != null`).
//           Bu, məkan SEÇİCİSİ deyil, BAYRAQDIR: konkret məkanın xatirələri
//           bələdçi səhifəsindədir (`listMemoriesForPlace`), sinif səhifəsində
//           isə "sevimli yer" xatirələrini süzmək kifayətdir.
// ============================================================================

import { MemoryTypeSchema } from "@/lib/enums";
import type { MemoryType } from "@/lib/enums";

export const MEMORY_PARAMS = {
  type: "type",
  place: "place",
  page: "page",
} as const;

/** `?place=` üçün qəbul edilən YEGANƏ dəyər — başqa hər şey filtri ləğv edir. */
export const MEMORY_PLACE_FLAG = "1";

export interface MemoryFilterState {
  type: MemoryType | null;
  /** `true` → yalnız `guidePlaceId` dolu olan xatirələr. */
  placeOnly: boolean;
  /** 1-dən başlayır. */
  page: number;
}

export const FIRST_MEMORY_PAGE = 1;

/** Bir səhifədə göstərilən xatirə sayı (iki sütunlu düzülüş → cüt ədəd). */
export const MEMORY_PAGE_SIZE = 12;

export function emptyMemoryFilters(): MemoryFilterState {
  return { type: null, placeOnly: false, page: FIRST_MEMORY_PAGE };
}

/** Səhifə nömrəsi filtr sayılmır — «sıfırla» düyməsi onu da atır. */
export function activeMemoryFilterCount(filters: MemoryFilterState): number {
  return (filters.type === null ? 0 : 1) + (filters.placeOnly ? 1 : 0);
}

export function hasActiveMemoryFilters(filters: MemoryFilterState): boolean {
  return activeMemoryFilterCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export type MemorySearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: MemorySearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/**
 * URL-i doğrulanmış filtr obyektinə çevirir.
 *
 * ⚠️ Naməlum dəyər 404 VERMİR — filtr SƏSSİZCƏ nəzərə alınmır (xronologiya və
 * lentlə eyni yanaşma; URL əl ilə dəyişdirilə bilər, bu, səhv deyil).
 */
export function parseMemoryParams(input: MemorySearchParamsInput): MemoryFilterState {
  const type = firstText(input, MEMORY_PARAMS.type);
  const place = firstText(input, MEMORY_PARAMS.place);
  const rawPage = firstText(input, MEMORY_PARAMS.page);

  const parsedType = type === null ? null : MemoryTypeSchema.safeParse(type);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    type: parsedType?.success ? parsedType.data : null,
    placeOnly: place === MEMORY_PLACE_FLAG,
    page: Number.isInteger(page) && page >= FIRST_MEMORY_PAGE ? page : FIRST_MEMORY_PAGE,
  };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

/**
 * Paylaşıla bilən sorğu sətri. `parse(serialize(f))` → `f` (testlə bərkidilib).
 * Boş dəyərlər və `page = 1` yazılmır — link təmiz qalır.
 */
export function serializeMemoryParams(filters: MemoryFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.type !== null) params.set(MEMORY_PARAMS.type, filters.type);
  if (filters.placeOnly) params.set(MEMORY_PARAMS.place, MEMORY_PLACE_FLAG);
  if (filters.page > FIRST_MEMORY_PAGE) {
    params.set(MEMORY_PARAMS.page, String(filters.page));
  }

  return params;
}

/** `?a=b` — boşsa boş sətir (URL "?" ilə bitməsin). */
export function memoryQueryString(filters: MemoryFilterState): string {
  const query = serializeMemoryParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

export function memoriesHref(cohortSlug: string, filters: MemoryFilterState): string {
  return `/class/${cohortSlug}/memories${memoryQueryString(filters)}`;
}

// ---------------------------------------------------------------------------
// Səhifələmə
// ---------------------------------------------------------------------------

export function memoryPageCount(total: number, pageSize = MEMORY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function memorySkipOf(
  filters: MemoryFilterState,
  pageSize = MEMORY_PAGE_SIZE,
): number {
  return (Math.max(filters.page, FIRST_MEMORY_PAGE) - 1) * pageSize;
}
