// ============================================================================
// src/lib/guide-filters.ts
// Xankəndi bələdçisinin [M3] kateqoriya filtri və qruplaşdırması — SAF modul.
//
// 🔴 FİLTR URL-DƏDİR (`?category=TRANSPORT`), client vəziyyətində DEYİL:
// «Xankəndidə nəqliyyat» linki paylaşıla bilən olmalıdır — yeni tələbəyə
// göndərilən ünvan məhz həmin siyahını açmalıdır. Eyni səbəbdən `FOOTER_NAV`
// «Nəqliyyat» və «Səhiyyə» linkləri də bu köməkçilərlə qurulur, əl ilə yazılmır.
//
// ⚠️ Filtr DB-yə ötürülür (`listGuidePlaces(category)`), JS-də süzülmür.
// Qruplaşdırma isə YADDAŞDADIR və bu, ziddiyyət deyil: bələdçi 30 sətirlik
// İCTİMAİ kataloqdur, məxfilik şərti və səhifələməsi yoxdur — bir sorğu ilə
// gəlir və 11 başlıq altında düzülür.
// ============================================================================

import {
  GUIDE_CATEGORY_VALUES,
  GuideCategorySchema,
  type GuideCategory,
} from "@/lib/enums";

export const GUIDE_PARAMS = {
  category: "category",
} as const;

export interface GuideFilterState {
  category: GuideCategory | null;
}

export function emptyGuideFilters(): GuideFilterState {
  return { category: null };
}

export type GuideSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: GuideSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/** ⚠️ Naməlum kateqoriya 404 VERMİR — filtr səssizcə nəzərə alınmır. */
export function parseGuideParams(input: GuideSearchParamsInput): GuideFilterState {
  const category = firstText(input, GUIDE_PARAMS.category);
  const parsed = category === null ? null : GuideCategorySchema.safeParse(category);
  return { category: parsed?.success ? parsed.data : null };
}

export function serializeGuideParams(filters: GuideFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category !== null) params.set(GUIDE_PARAMS.category, filters.category);
  return params;
}

export const GUIDE_PATH = "/khankendi";

export function guideHref(filters: GuideFilterState = emptyGuideFilters()): string {
  const query = serializeGuideParams(filters).toString();
  return query === "" ? GUIDE_PATH : `${GUIDE_PATH}?${query}`;
}

/** Tək məkanın detal ünvanı — şablon bir yerdə saxlanılır. */
export function guidePlaceHref(placeId: string): string {
  return `${GUIDE_PATH}/${placeId}`;
}

// ---------------------------------------------------------------------------
// Qruplaşdırma və sıralama
// ---------------------------------------------------------------------------

/** Qruplaşdırıcının minimal gözləntisi — servis tipinə bağlanmır (SAF qalsın). */
export interface GuidePlaceLike {
  category: string;
  isEmergency: boolean;
}

export interface GuideGroup<T extends GuidePlaceLike> {
  category: GuideCategory;
  items: T[];
}

/**
 * 11 kateqoriya üzrə qruplaşdırma — SIRA `GUIDE_CATEGORY_VALUES`-dandır.
 *
 * ⚠️ Sıra spec §3-ün bənd ardıcıllığını təkrarlayır (tarix → məkanlar →
 * nəqliyyat → universitetə gediş → market → xidmət → sağlamlıq → mədəniyyət →
 * istirahət → təhlükəsizlik → məsləhətlər), yəni səhifə spec-i oxuyan kimi
 * oxunur. DB `order` sütunu qrup DAXİLİNDƏ işləyir.
 *
 * ⚠️ BOŞ QRUP BURAXILIR — başlıq altında heç nə olmayan bölmə "sınıb" kimi
 * görünür.
 */
export function groupPlacesByCategory<T extends GuidePlaceLike>(
  places: readonly T[],
): GuideGroup<T>[] {
  return GUIDE_CATEGORY_VALUES.map((category) => ({
    category,
    items: places.filter((place) => place.category === category),
  })).filter((group) => group.items.length > 0);
}

/**
 * Təcili məkanlar SİYAHININ BAŞINA çıxarılır (spec §3 — təhlükəsizlik və təcili
 * əlaqə). Servis onsuz da `isEmergency desc` ilə sıralayır; bu köməkçi
 * QRUPLAŞDIRILMIŞ görünüşdə lazımdır, çünki orada təcili sətirlər öz
 * kateqoriyalarının içində gizlənir.
 *
 * ⚠️ Sıra SABİTDİR (stable sort): eyni bayraqlı elementlərin nisbi sırası
 * dəyişmir, yəni DB-nin `order` sütunu qorunur.
 */
export function emergencyFirst<T extends GuidePlaceLike>(places: readonly T[]): T[] {
  return [...places].sort((a, b) => Number(b.isEmergency) - Number(a.isEmergency));
}
