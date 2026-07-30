// ============================================================================
// src/lib/admin-stats-filters.ts
// `/admin/stats` — SİNİF (cohort) filtri (Blok 12B).
//
// 🔴 BU FAYL SAFDIR (Prisma / React / servis importu yoxdur) —
// `lib/map-filters.ts` ilə eyni nümunə: parse ↔ serialize dövrəsi bazasız
// testlə bərkidilir.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 `map-filters.ts`-DƏN PRİNSİPİAL FƏRQ: `shallow: false`
// ────────────────────────────────────────────────────────────────────────────
// Tab seçimi (`?tab=`) BİR DƏFƏ hesablanmış aqreqasiyanın fərqli təsviridir —
// server sorğusu tələb etmir. Sinif filtri isə SORĞUNUN ÖZÜNÜ dəyişir:
// `cohortId` Prisma `where` şərtinə girir (`stats.service.ts` →
// `currentCareerWhere`). Yəni server komponenti YENİDƏN işləməlidir.
//
// 🔴 SÜZGƏC JS-DƏ TƏTBİQ OLUNMUR (CLAUDE.md §5). Bütün sətirləri çəkib
// brauzerdə süzsək: (a) səhifələmə sınar, (b) k-anonimliyin ölçdüyü çoxluq
// FİLTRDƏN ƏVVƏLKİ çoxluq olardı — yəni 14 nəfərlik sinifdə gizlədilməli xana
// universitet miqyasında böyük göründüyü üçün açıq qalardı. Bu, birbaşa
// sızmadır.
//
// ⚠️ K-ANONİMLİK FİLTRDƏN SONRA DA İŞLƏYİR: `getCareerOutcomeStats` süzülmüş
// sətirləri `aggregateCareerStats`-a verir və `MIN_BUCKET_SIZE = 3` həmin
// AZALMIŞ çoxluğa tətbiq olunur. Kiçik sinifdə bu daha kritikdir — 14 nəfərlik
// kohortda «Bakı · 2» konkret iki nəfəri göstərər.
//
// ⚠️ Naməlum / mövcud olmayan `cohort` dəyəri 404 VERMİR: filtr sadəcə nəzərə
// alınmır və panel universitet miqyasına düşür (URL əl ilə dəyişdirilə bilər,
// bu, səhv deyil — `map-filters.ts` ilə eyni yanaşma). Mövcudluq yoxlaması
// SERVERDƏDİR: kataloqda olmayan id ilə sorğu boş nəticə verib «bu sinifdə
// heç kim yoxdur» yalanını yaradardı.
// ============================================================================

export const ADMIN_STATS_PARAMS = {
  cohort: "cohort",
  tab: "tab",
} as const;

export interface AdminStatsFilterState {
  /** Seçilmiş sinfin `id`-si. `null` = bütün universitet. */
  cohortId: string | null;
}

export function emptyAdminStatsFilters(): AdminStatsFilterState {
  return { cohortId: null };
}

export type AdminStatsSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: AdminStatsSearchParams, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

export function parseAdminStatsParams(
  input: AdminStatsSearchParams,
): AdminStatsFilterState {
  return { cohortId: firstText(input, ADMIN_STATS_PARAMS.cohort) };
}

/** Paylaşıla bilən sorğu sətri. Default (bütün universitet) YAZILMIR. */
export function serializeAdminStatsParams(
  filters: AdminStatsFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.cohortId !== null) {
    params.set(ADMIN_STATS_PARAMS.cohort, filters.cohortId);
  }
  return params;
}

export function adminStatsQueryString(filters: AdminStatsFilterState): string {
  const query = serializeAdminStatsParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

export function adminStatsHref(filters: AdminStatsFilterState): string {
  return `/admin/stats${adminStatsQueryString(filters)}`;
}
