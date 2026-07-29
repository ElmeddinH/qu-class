// ============================================================================
// src/lib/directory-filters.ts
// Class Directory — 13 filtrin TƏRİFİ və URL vəziyyəti (spec §8).
//
// 🔴 BU FAYL SAFDIR: Prisma, servis, React — heç biri import edilmir.
// Səbəb `features/class-home/order.ts` ilə eynidir: filtr məntiqi vahid testlə
// örtülüdür (`directory-filters.test.ts`), komponentlər və servislər isə
// Prisma → next-auth zəncirini gətirir və jsdom-da yüklənmir.
//
// ----------------------------------------------------------------------------
// 🔒 FİLTR → PROFİL SAHƏSİ XƏRİTƏSİ — ƏN VACİB CƏDVƏL
// ----------------------------------------------------------------------------
// Gizlədilmiş sahəyə görə filtrləmə həmin sahəni SIZDIRIR. Nümunə: Aysel
// `currentCity`-ni PRIVATE edib; `?city=Bakı` onu nəticədə göstərsə, dəyər
// ekranda görünməsə də istifadəçi Ayselin gizlətdiyi şəhəri ÖYRƏNDİ.
//
// Buna görə hər filtr İKİ şərt qurur və ikisi də DB-dədir:
//   1. dəyər uyğunluğu   → { currentCity: "Bakı" }
//   2. sahə GÖRÜNÜRLÜYÜ  → fieldVisibleWhere(viewer, "currentCity")
//                           (bax `src/lib/visibility.ts`)
// Eyni nümunə Blok 5-də `listSimilarMembers`-də işlədilir.
//
//   #   filtr açarı        tip     URL parametri     profil sahəsi
//   ──  ─────────────────  ──────  ────────────────  ─────────────────────────
//    1  name               text    name              — (ad-soyad həmişə görünür)
//    2  faculty            select  faculty           — (struktur: cohort)
//    3  program            select  program           — (struktur: cohort)
//    4  admissionYear      select  admissionYear     — (struktur: cohort)
//    5  graduationYear     select  graduationYear    — (struktur: cohort)
//    6  city               select  city              currentCity
//    7  country            select  country           currentCountry
//    8  industry           select  industry          industry
//    9  company            select  company           currentCompany
//   10  interest           multi   interest          interests
//   11  language           multi   language          languages
//   12  club               multi   club              clubs
//   13  status             select  status            — (struktur: cohort tarixləri)
//
// `profileField: null` YAZILAN sətirlər QƏSDƏNDİR, unudulmuş deyil:
//   · `name` — `redactProfile` ad-soyadı heç vaxt gizlətmir (platformanın
//     işləməsi üçün minimum), ona görə ada görə axtarış sızma yaratmır.
//   · `faculty` / `program` / `admissionYear` / `graduationYear` / `status` —
//     bunlar `CohortMembership` struktur məlumatıdır, `FieldVisibility` ilə
//     idarə olunan profil sahəsi DEYİL (`getProfile` şərhinə bax: `stage` və
//     `cohorts` redaksiyaya tabe deyil). Üzvlüyün özü isə ayrıca qapıdadır —
//     kataloq yalnız viewer-in ÖZ siniflərini göstərir.
//
// ⚠️ Yeni filtr əlavə edirsənsə `profileField`-i AÇIQ ŞƏKİLDƏ yaz (tip məcbur
// edir) və sahə idarə olunandırsa mütləq göstər — `null` qoymaq sızma açır.
// ============================================================================

import { UserStageSchema, type UserStage } from "@/lib/enums";
import type { ControlledField } from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Filtr tərifləri
// ---------------------------------------------------------------------------

/**
 * `text`   — sərbəst mətn (ada görə axtarış)
 * `select` — DB-dən gələn dəyərlərdən BİRİ
 * `multi`  — DB-dən gələn dəyərlərdən BİR NEÇƏSİ (URL-də vergüllə, «hər hansı
 *            biri» semantikası ilə)
 */
export type DirectoryFilterType = "text" | "select" | "multi";

export interface DirectoryFilterDef {
  /** URL parametrinin adı — açarla eynidir, paylaşılan linkin sabitliyi üçün. */
  param: string;
  type: DirectoryFilterType;
  /** UI etiketi (azərbaycanca, CLAUDE.md §9). */
  label: string;
  /**
   * Bu filtrin oxuduğu İDARƏ OLUNAN profil sahəsi.
   * `null` — sahə `FieldVisibility` ilə idarə olunmur (fayl başındakı cədvəl).
   */
  profileField: ControlledField | null;
  /** `select` / `multi` üçün boş seçim mətni. */
  placeholder?: string;
}

/**
 * 13 filtr — spec §8 sırası ilə.
 *
 * `Record<DirectoryFilterKey, …>` tipindədir: açar əlavə/çıxarsan `tsc` bütün
 * istifadə yerlərində dayanır (facet-lər, parse, serialize, panel).
 */
export const DIRECTORY_FILTERS = {
  name: {
    param: "name",
    type: "text",
    label: "Ad və ya soyad",
    profileField: null,
  },
  faculty: {
    param: "faculty",
    type: "select",
    label: "Fakültə",
    profileField: null,
    placeholder: "Bütün fakültələr",
  },
  program: {
    param: "program",
    type: "select",
    label: "İxtisas",
    profileField: null,
    placeholder: "Bütün ixtisaslar",
  },
  admissionYear: {
    param: "admissionYear",
    type: "select",
    label: "Qəbul ili",
    profileField: null,
    placeholder: "Bütün illər",
  },
  graduationYear: {
    param: "graduationYear",
    type: "select",
    label: "Məzuniyyət ili",
    profileField: null,
    placeholder: "Bütün illər",
  },
  city: {
    param: "city",
    type: "select",
    label: "Şəhər",
    profileField: "currentCity",
    placeholder: "Bütün şəhərlər",
  },
  country: {
    param: "country",
    type: "select",
    label: "Ölkə",
    profileField: "currentCountry",
    placeholder: "Bütün ölkələr",
  },
  industry: {
    param: "industry",
    type: "select",
    label: "Fəaliyyət sahəsi",
    profileField: "industry",
    placeholder: "Bütün sahələr",
  },
  company: {
    param: "company",
    type: "select",
    label: "Şirkət",
    profileField: "currentCompany",
    placeholder: "Bütün şirkətlər",
  },
  interest: {
    param: "interest",
    type: "multi",
    label: "Maraqlar",
    profileField: "interests",
  },
  language: {
    param: "language",
    type: "multi",
    label: "Dil bacarıqları",
    profileField: "languages",
  },
  club: {
    param: "club",
    type: "multi",
    label: "Tələbə klubu",
    profileField: "clubs",
  },
  status: {
    param: "status",
    type: "select",
    label: "Status",
    profileField: null,
    placeholder: "Tələbə və məzun",
  },
} as const satisfies Record<string, DirectoryFilterDef>;

export type DirectoryFilterKey = keyof typeof DIRECTORY_FILTERS;

/** Tərif sırası = panelin sırası = URL-də parametrlərin sırası. */
export const DIRECTORY_FILTER_KEYS = Object.keys(
  DIRECTORY_FILTERS,
) as DirectoryFilterKey[];

/** Spec §8 dəqiq 13 filtr tələb edir — sapma testdə tutulur. */
export const DIRECTORY_FILTER_COUNT = 13;

export function directoryFilterDef(key: DirectoryFilterKey): DirectoryFilterDef {
  return DIRECTORY_FILTERS[key];
}

/**
 * `select` / `multi` filtrlər — facet (mövcud dəyərlər + say) tələb edənlər.
 *
 * Tip tərif cədvəlindən ÇIXARILIR: `type: "text"` olan açar avtomatik kənarda
 * qalır. Əl ilə `Exclude<…, "name">` yazsaydıq yeni mətn filtri əlavə edən adam
 * bunu yeniləməyi unudardı və `tsc` səssiz qalardı.
 */
export type FacetedFilterKey = {
  [K in DirectoryFilterKey]: (typeof DIRECTORY_FILTERS)[K]["type"] extends "text"
    ? never
    : K;
}[DirectoryFilterKey];

export const FACETED_FILTER_KEYS = DIRECTORY_FILTER_KEYS.filter(
  (key) => DIRECTORY_FILTERS[key].type !== "text",
) as FacetedFilterKey[];

// ---------------------------------------------------------------------------
// Normallaşdırılmış filtr vəziyyəti
// ---------------------------------------------------------------------------

/**
 * URL-dən oxunmuş, doğrulanmış filtr vəziyyəti.
 *
 * Boş `select`/`text` → `null`, boş `multi` → `[]`. Belə olanda servis şərti
 * ümumiyyətlə qurmur və "hamısı" mənasını verir.
 */
export interface DirectoryFilterState {
  name: string | null;
  faculty: string | null;
  program: string | null;
  admissionYear: number | null;
  graduationYear: number | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  company: string | null;
  interest: string[];
  language: string[];
  club: string[];
  status: UserStage | null;
  /** 1-dən başlayır. Filtr deyil, səhifələmə — `DIRECTORY_FILTERS`-də yoxdur. */
  page: number;
}

export const PAGE_PARAM = "page";
export const FIRST_PAGE = 1;

export function emptyDirectoryFilters(): DirectoryFilterState {
  return {
    name: null,
    faculty: null,
    program: null,
    admissionYear: null,
    graduationYear: null,
    city: null,
    country: null,
    industry: null,
    company: null,
    interest: [],
    language: [],
    club: [],
    status: null,
    page: FIRST_PAGE,
  };
}

/** Səhifə nömrəsi filtr sayılmır — "filtrləri sıfırla" düyməsi onu da atır. */
export function activeFilterCount(filters: DirectoryFilterState): number {
  return DIRECTORY_FILTER_KEYS.reduce((count, key) => {
    const value = filters[key];
    if (Array.isArray(value)) return count + (value.length > 0 ? 1 : 0);
    return count + (value === null ? 0 : 1);
  }, 0);
}

export function hasActiveFilters(filters: DirectoryFilterState): boolean {
  return activeFilterCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// parseDirectoryParams
// ---------------------------------------------------------------------------

/**
 * Next.js `searchParams` və `URLSearchParams` — ikisi də qəbul olunur.
 * Səhifə serverdə `Record`, client-də `URLSearchParams` verir.
 */
export type DirectorySearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

/** `multi` dəyərləri URL-də vergüllə ayrılır — `nuqs` massiv parser-i ilə eyni. */
export const MULTI_SEPARATOR = ",";

function rawValues(input: DirectorySearchParamsInput, param: string): string[] {
  if (input instanceof URLSearchParams) return input.getAll(param);

  const value = input[param];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstText(input: DirectorySearchParamsInput, param: string): string | null {
  const value = rawValues(input, param)[0]?.trim();
  return value === undefined || value === "" ? null : value;
}

/**
 * Vergüllə ayrılmış VƏ təkrarlanan parametrlərin ikisini də qəbul edir
 * (`?interest=a,b` və `?interest=a&interest=b` eyni nəticə verir), boşları və
 * dublikatları atır.
 */
function multiText(input: DirectorySearchParamsInput, param: string): string[] {
  const parts = rawValues(input, param)
    .flatMap((value) => value.split(MULTI_SEPARATOR))
    .map((value) => value.trim())
    .filter((value) => value !== "");

  return [...new Set(parts)];
}

/** Təqvim ili — 4 rəqəm. Zibil dəyər filtri SƏSSİZCƏ ləğv edir, 404 vermir. */
function parseYear(input: DirectorySearchParamsInput, param: string): number | null {
  const raw = firstText(input, param);
  if (raw === null) return null;

  const year = Number.parseInt(raw, 10);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

function parsePage(input: DirectorySearchParamsInput): number {
  const raw = firstText(input, PAGE_PARAM);
  if (raw === null) return FIRST_PAGE;

  const page = Number.parseInt(raw, 10);
  if (!Number.isInteger(page) || page < FIRST_PAGE) return FIRST_PAGE;
  return page;
}

/**
 * URL parametrlərini doğrulanmış filtr obyektinə çevirir.
 *
 * ⚠️ NAMƏLUM AÇARLAR ATILIR və tanınmayan dəyər (səhv il, mövcud olmayan
 * status) filtri sadəcə ləğv edir — URL əl ilə dəyişdirilə bilər, bu, səhv
 * deyil (`feed/page.tsx`-də kateqoriya ilə eyni yanaşma).
 *
 * Dəyərin ÖZÜ burada DB-yə qarşı yoxlanmır: mövcud olmayan şəhər sadəcə boş
 * nəticə verir. Məxfilik isə dəyərdən asılı deyil — o, servisdə hər filtr üçün
 * `fieldVisibleWhere` ilə qurulur.
 */
export function parseDirectoryParams(
  input: DirectorySearchParamsInput,
): DirectoryFilterState {
  const status = firstText(input, DIRECTORY_FILTERS.status.param);
  const parsedStatus = status === null ? null : UserStageSchema.safeParse(status);

  return {
    name: firstText(input, DIRECTORY_FILTERS.name.param),
    faculty: firstText(input, DIRECTORY_FILTERS.faculty.param),
    program: firstText(input, DIRECTORY_FILTERS.program.param),
    admissionYear: parseYear(input, DIRECTORY_FILTERS.admissionYear.param),
    graduationYear: parseYear(input, DIRECTORY_FILTERS.graduationYear.param),
    city: firstText(input, DIRECTORY_FILTERS.city.param),
    country: firstText(input, DIRECTORY_FILTERS.country.param),
    industry: firstText(input, DIRECTORY_FILTERS.industry.param),
    company: firstText(input, DIRECTORY_FILTERS.company.param),
    interest: multiText(input, DIRECTORY_FILTERS.interest.param),
    language: multiText(input, DIRECTORY_FILTERS.language.param),
    club: multiText(input, DIRECTORY_FILTERS.club.param),
    status: parsedStatus?.success ? parsedStatus.data : null,
    page: parsePage(input),
  };
}

// ---------------------------------------------------------------------------
// serializeDirectoryParams
// ---------------------------------------------------------------------------

/**
 * Filtr vəziyyətindən PAYLAŞILA BİLƏN sorğu sətri qurur.
 *
 * `parse` ilə dövrə bağlıdır: `parse(serialize(f))` → `f` (testlə bərkidilib).
 * Parametr sırası `DIRECTORY_FILTER_KEYS` tərifinə bağlıdır — eyni filtr dəsti
 * həmişə EYNİ URL verir, yəni link keşlənə və müqayisə edilə bilir.
 *
 * Boş dəyərlər və `page = 1` yazılmır — təmiz URL üçün.
 */
export function serializeDirectoryParams(
  filters: DirectoryFilterState,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of DIRECTORY_FILTER_KEYS) {
    const def = DIRECTORY_FILTERS[key];
    const value = filters[key];

    if (Array.isArray(value)) {
      if (value.length > 0) params.set(def.param, value.join(MULTI_SEPARATOR));
      continue;
    }

    if (value !== null) params.set(def.param, String(value));
  }

  if (filters.page > FIRST_PAGE) params.set(PAGE_PARAM, String(filters.page));

  return params;
}

/** `?a=b` formasında hazır sorğu hissəsi — boşsa boş sətir (URL "?" ilə bitməsin). */
export function directoryQueryString(filters: DirectoryFilterState): string {
  const query = serializeDirectoryParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

/** Kataloq linki — səhifələmə və filtr çipləri bunu işlədir. */
export function directoryHref(
  cohortSlug: string,
  filters: DirectoryFilterState,
): string {
  return `/class/${cohortSlug}/directory${directoryQueryString(filters)}`;
}

// ---------------------------------------------------------------------------
// Səhifələmə
// ---------------------------------------------------------------------------

/** KUDS §14 cədvəl tələbi: səhifələmə. Sonsuz scroll DEYİL (lentdən fərqli). */
export const DIRECTORY_PAGE_SIZE = 24;

export function pageCountOf(total: number, pageSize = DIRECTORY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Prisma `skip` dəyəri.
 *
 * Diapazon YOXLANMIR: `?page=99` boş nəticə verir və səhifə "nəticə yoxdur"
 * vəziyyətini göstərir. Sıxmaq üçün `total` lazım olardı, yəni sorğudan ƏVVƏL
 * bir sorğu — bu modul isə safdır və DB-yə çıxmır.
 */
export function skipOf(
  filters: DirectoryFilterState,
  pageSize = DIRECTORY_PAGE_SIZE,
): number {
  return (Math.max(filters.page, FIRST_PAGE) - 1) * pageSize;
}
