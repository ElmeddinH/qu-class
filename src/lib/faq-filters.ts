// ============================================================================
// src/lib/faq-filters.ts
// `/faq` səhifəsinin kateqoriya qruplaşdırması və axtarışı — SAF modul.
//
// 🔴 AXTARIŞ NİYƏ SERVERDƏ (DB-də) DEYİL:
// CLAUDE.md §5 «JS-də filtrləmə qadağandır» qaydası MƏXFİLİK süzgəcinə aiddir —
// orada JS filtri həm sızma, həm də sınmış pagination deməkdir. FAQ isə
// tamamilə İCTİMAİ redaksiya məzmunudur (20 sətir, məxfilik şərti YOXDUR) və
// səhifələmə də yoxdur: bütün suallar onsuz da tək sorğu ilə gəlir. Sual
// mətnində canlı axtarış üçün hər hərfdə DB-yə getmək mənasız olardı.
//
// ⚠️ Axtarış `lib/text-search.ts` → `AZ_LOCALE` və normalizasiyasını İŞLƏDİR:
// «məxfilik» sorğusu «Məxfilik» sualını tapmalıdır, «i/ı» və «ə/e» fərqi isə
// istifadəçini dayandırmamalıdır (Blok 6, T14 dərsi).
// ============================================================================

import { FAQ_CATEGORY_VALUES, FaqCategorySchema, type FaqCategory } from "@/lib/enums";
import { foldForSearch } from "@/lib/text-search";

export const FAQ_PARAMS = {
  category: "category",
  q: "q",
} as const;

export interface FaqFilterState {
  category: FaqCategory | null;
  /** Axtarış sorğusu — kəsilmiş, boşsa `null`. */
  query: string | null;
}

export function emptyFaqFilters(): FaqFilterState {
  return { category: null, query: null };
}

export function hasActiveFaqFilters(filters: FaqFilterState): boolean {
  return filters.category !== null || filters.query !== null;
}

// ---------------------------------------------------------------------------
// parse ↔ serialize
// ---------------------------------------------------------------------------

export type FaqSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: FaqSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/**
 * URL → doğrulanmış filtr.
 * ⚠️ Naməlum kateqoriya 404 VERMİR — filtr səssizcə nəzərə alınmır (xronologiya
 * və xatirə filtrləri ilə eyni yanaşma; URL əl ilə dəyişdirilə bilər).
 */
export function parseFaqParams(input: FaqSearchParamsInput): FaqFilterState {
  const category = firstText(input, FAQ_PARAMS.category);
  const parsed = category === null ? null : FaqCategorySchema.safeParse(category);

  return {
    category: parsed?.success ? parsed.data : null,
    query: firstText(input, FAQ_PARAMS.q),
  };
}

export function serializeFaqParams(filters: FaqFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.category !== null) params.set(FAQ_PARAMS.category, filters.category);
  if (filters.query !== null) params.set(FAQ_PARAMS.q, filters.query);
  return params;
}

export function faqHref(filters: FaqFilterState): string {
  const query = serializeFaqParams(filters).toString();
  return query === "" ? "/faq" : `/faq?${query}`;
}

// ---------------------------------------------------------------------------
// Süzgəc və qruplaşdırma
// ---------------------------------------------------------------------------

/** Ayrıştırıcının minimal gözləntisi — servis tipinə bağlanmır (SAF qalsın). */
export interface FaqLike {
  question: string;
  answer: string;
  category: string;
}

/**
 * Mətn axtarışı: sual VƏ cavab üzərində, diakritikaya həssas OLMADAN.
 * Boş sorğu → siyahı olduğu kimi qayıdır (filtr yoxdur).
 */
export function searchFaqs<T extends FaqLike>(items: readonly T[], query: string | null): T[] {
  if (query === null) return [...items];

  const needle = foldForSearch(query);
  if (needle === "") return [...items];

  return items.filter((item) =>
    `${foldForSearch(item.question)} ${foldForSearch(item.answer)}`.includes(needle),
  );
}

export function filterFaqs<T extends FaqLike>(
  items: readonly T[],
  filters: FaqFilterState,
): T[] {
  const byCategory =
    filters.category === null
      ? [...items]
      : items.filter((item) => item.category === filters.category);

  return searchFaqs(byCategory, filters.query);
}

export interface FaqGroup<T extends FaqLike> {
  category: FaqCategory;
  items: T[];
}

/**
 * Kateqoriya üzrə qruplaşdırma — SIRA `FAQ_CATEGORY_VALUES`-dandır, DB-dən yox.
 *
 * ⚠️ BOŞ QRUP BURAXILIR: axtarışdan sonra bir kateqoriyada nəticə qalmasa
 * başlığı göstərmək «burada nəsə var» illüziyası yaradar.
 *
 * ⚠️ Naməlum `category` dəyəri (DB sütunu `String`-dir) heç bir qrupa düşmür və
 * SƏSSİZCƏ İTİR — ona görə çağıran tərəf sayı `filterFaqs` nəticəsindən oxuyur,
 * qrupların cəmindən yox.
 */
export function groupFaqsByCategory<T extends FaqLike>(items: readonly T[]): FaqGroup<T>[] {
  return FAQ_CATEGORY_VALUES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}
