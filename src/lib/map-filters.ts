// ============================================================================
// src/lib/map-filters.ts
// "İndi haradayıq?" panelinin TAB vəziyyəti (spec §13, [M11]).
//
// 🔴 BU FAYL SAFDIR (Prisma / React / servis importu yoxdur) —
// `lib/timeline-filters.ts` və `lib/memory-filters.ts` ilə eyni nümunə: parse ↔
// serialize dövrəsi bazasız testlə bərkidilir.
//
// 🔴 PARAMETR ADLARI `features/where-are-we-now/filter-state.ts` İLƏ EYNİ
// OLMALIDIR (`MAP_PARAMS`). Ayrılsalar tab "URL-i dəyişir, panel dəyişmir" olur.
//
// ⚠️ BURADA FİLTR YOXDUR, YALNIZ GÖRÜNÜŞ SEÇİMİ VAR — və bu, xronologiya /
// xatirə filtrlərindən PRİNSİPİAL fərqdir:
//   · orada süzgəc DB-dədir → `shallow: false` MƏCBURİDİR (server yenidən
//     işləməlidir),
//   · burada aqreqasiya BİR DƏFƏ, TƏK keçiddə hesablanır (TƏLƏ A) və səkkiz
//     görünüş EYNİ nəticənin fərqli təsviridir → server sorğusu LAZIM DEYİL,
//     `shallow: true` doğrudur.
// Bu fərq qəsdəndir; "digər filtrlərdə false idi" deyib dəyişməyin.
// ============================================================================

export const MAP_PARAMS = {
  tab: "tab",
} as const;

/**
 * Səkkiz görünüş = 7 vizual (spec §13) + vəzifə qrafiki (müəllimin «hansı
 * konumda çalışdığını» tələbinin birbaşa cavabı).
 *
 * ⚠️ Sıra UI-dakı tab sırasıdır: iki xəritə → yer bölgüləri → iş bölgüləri →
 * təhsil. Dəyişdirsən URL-lər qalır (dəyər əsaslıdır), yalnız görünüş dəyişir.
 */
export const MAP_TAB_VALUES = [
  "world",
  "azerbaijan",
  "cities",
  "countries",
  "companies",
  "industries",
  "functions",
  "education",
] as const;

export type MapTab = (typeof MAP_TAB_VALUES)[number];

export const DEFAULT_MAP_TAB: MapTab = "world";

export interface MapFilterState {
  tab: MapTab;
}

export function emptyMapFilters(): MapFilterState {
  return { tab: DEFAULT_MAP_TAB };
}

function isMapTab(value: string): value is MapTab {
  return (MAP_TAB_VALUES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export type MapSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: MapSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/**
 * URL-i doğrulanmış görünüş vəziyyətinə çevirir.
 *
 * ⚠️ Naməlum dəyər 404 VERMİR — default görünüşə düşür (lentdəki kateqoriya ilə
 * eyni yanaşma; URL əl ilə dəyişdirilə bilər, bu, səhv deyil).
 */
export function parseMapParams(input: MapSearchParamsInput): MapFilterState {
  const tab = firstText(input, MAP_PARAMS.tab);
  return { tab: tab !== null && isMapTab(tab) ? tab : DEFAULT_MAP_TAB };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

/**
 * Paylaşıla bilən sorğu sətri. `parse(serialize(f))` → `f` (testlə bərkidilib).
 * Default görünüş YAZILMIR — link təmiz qalır.
 */
export function serializeMapParams(filters: MapFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== DEFAULT_MAP_TAB) params.set(MAP_PARAMS.tab, filters.tab);
  return params;
}

/** `?a=b` — boşsa boş sətir (URL "?" ilə bitməsin). */
export function mapQueryString(filters: MapFilterState): string {
  const query = serializeMapParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

/** Səhifə ünvanı — `nav.ts`-dəki «İndi haradayıq?» linki ilə EYNİ yol (`/map`). */
export function mapHref(cohortSlug: string, filters: MapFilterState): string {
  return `/class/${cohortSlug}/map${mapQueryString(filters)}`;
}
