// ============================================================================
// src/lib/content-routes.ts
// İctimai məzmun səhifələrinin ÜNVAN ↔ MƏZMUN xəritəsi — SAF modul.
//
// 🔴 NİYƏ XƏRİTƏ LAZIMDIR: ünvanlar İNGİLİSCƏDİR (`/about`, `/campus-life` —
// PLAN.md §4.2 route xəritəsi), `ContentPage.slug` isə AZƏRBAYCANCA
// (`haqqimizda`, `kampus-heyati` — redaksiya məzmununun öz dili). İkisini
// eyniləşdirmək iki pis variantdan birini seçmək demək idi: ya route-lar
// azərbaycanca olardı (plana zidd, beynəlxalq oxunuşu çətin), ya da seed
// slug-ları ingiliscə (CMS-də redaktor öz dilində axtara bilməz). Xəritə hər
// ikisini öz yerində saxlayır.
//
// İKİ NÖV SƏHİFƏ VAR və fərq spec §2-nin bəndlərindən gəlir:
//   · `page`    — bir bənd = bir yazı (`/about`, `/history`, `/mission`,
//                 `/campus-life`, `/clubs`)
//   · `section` — bir bənd = bölmənin BÜTÜN yazıları, hər biri `#<slug>`
//                 anchor-lu (`/services`, `/newcomers`). Səbəb: "tələbə
//                 xidmətləri" və "yeni tələbələr üçün vacib məlumatlar"
//                 bəndləri təbii olaraq çoxbaşlıqlıdır (dekanlıq + karyera +
//                 psixoloji dəstək…), onları bir yazıya sıxmaq redaksiyanı
//                 məhdudlaşdırardı.
//
// ⚠️ `slug` seed-də MÖVCUD OLMALIDIR — `content-routes.test.ts` bunu seed
// datasına qarşı yoxlayır. Slug yazı səhvi olsa səhifə 404 verərdi və bunu
// yalnız brauzerdə görərdik.
// ============================================================================

import { ContentSection, type ContentSection as ContentSectionValue } from "@/lib/enums";

interface ContentRouteBase {
  /** URL yolu — `PUBLIC_PAGE_PATHS` ilə uzlaşmalıdır (`lib/routes.ts`). */
  path: string;
  section: ContentSectionValue;
  /** Səhifə başlığı — `<h1>` və `<title>`. Redaksiya başlığından FƏRQLİ ola bilər. */
  title: string;
  /** Meta təsvir + səhifə girişi. */
  description: string;
}

export interface SingleContentRoute extends ContentRouteBase {
  kind: "page";
  /** `ContentPage.slug` — dərc olunmuş yazı. */
  slug: string;
}

export interface SectionContentRoute extends ContentRouteBase {
  kind: "section";
}

export type ContentRoute = SingleContentRoute | SectionContentRoute;

export const CONTENT_ROUTES = [
  {
    kind: "page",
    path: "/about",
    slug: "haqqimizda",
    section: ContentSection.UNIVERSITY,
    title: "Universitet haqqında",
    description:
      "Qarabağ Universitetinin missiyası, akademik istiqamətləri və tədris yanaşması.",
  },
  {
    kind: "page",
    path: "/history",
    slug: "tarixce",
    section: ContentSection.UNIVERSITY,
    title: "Universitetin tarixçəsi",
    description: "Təsisdən ilk buraxılışa qədər əsas mərhələlər.",
  },
  {
    kind: "page",
    path: "/mission",
    slug: "missiya",
    section: ContentSection.UNIVERSITY,
    title: "Missiya və dəyərlər",
    description:
      "Universitetin missiyası, strateji hədəfləri və gündəlik işini istiqamətləndirən dəyərlər.",
  },
  {
    kind: "page",
    path: "/campus-life",
    slug: "kampus-heyati",
    section: ContentSection.CAMPUS,
    title: "Kampus həyatı",
    description: "Tədbirlər, idman, gündəlik kampus qaydaları və ictimai məkanlar.",
  },
  {
    kind: "page",
    path: "/clubs",
    slug: "klublar",
    section: ContentSection.CAMPUS,
    title: "Tələbə klubları və təşkilatları",
    description:
      "Kampusda fəaliyyət göstərən klublar, üzvlük qaydaları və klub tədbirləri.",
  },
  {
    kind: "section",
    path: "/services",
    section: ContentSection.SERVICES,
    title: "Tələbə xidmətləri",
    description:
      "Dekanlıq, karyera mərkəzi, psixoloji dəstək, sənəd xidmətləri və yataqxana.",
  },
  {
    kind: "section",
    path: "/newcomers",
    section: ContentSection.NEWCOMERS,
    title: "Yeni tələbələr üçün",
    description:
      "İlk həftədə görüləcək işlər, faydalı bölmələr və məzun şəbəkəsi haqqında qısa bələdçi.",
  },
] as const satisfies readonly ContentRoute[];

export type ContentRoutePath = (typeof CONTENT_ROUTES)[number]["path"];

/** Yol → marşrut qeydi. Tapılmasa `undefined` (səhifə `notFound()` çağırır). */
export function contentRouteOf(path: string): ContentRoute | undefined {
  return CONTENT_ROUTES.find((route) => route.path === path);
}

/**
 * Eyni bölmədəki DİGƏR səhifələr — «bu bölmədə daha nə var?» keçidləri.
 *
 * ⚠️ `/history` və `/mission` eyni bölmədədir (UNIVERSITY), yəni hər biri
 * digərinə keçid verir. Bu, spec §2-nin üç ayrı bəndini bir-birinə bağlayır və
 * ziyarətçini açılış səhifəsinə qaytarmadan gəzməyə imkan verir.
 */
export function siblingRoutes(path: string): ContentRoute[] {
  const current = contentRouteOf(path);
  if (!current) return [];

  return CONTENT_ROUTES.filter(
    (route) => route.section === current.section && route.path !== current.path,
  );
}

// ---------------------------------------------------------------------------
// Hüquqi səhifələr — `/legal/[slug]`
// ---------------------------------------------------------------------------

/**
 * 🔴 HÜQUQİ SƏHİFƏLƏR NİYƏ AYRI QRUPDADIR (GW analizi #13):
 * onlar redaksiya məzmunu deyil, MÜQAVİLƏDİR. Ünvanları qəsdən `/legal/`
 * altındadır ki, footer-də bir sütun kimi qruplaşsınlar və gələcəkdə hüquq
 * şöbəsinin redaktə etdiyi hər şey bir prefiksdə qalsın.
 *
 * ⚠️ Slug-lar İNGİLİSCƏDİR — `/legal/privacy` beynəlxalq oxunuşdur və hüquqi
 * sənədin ünvanı adətən dəyişmir (link paylaşılır, PDF-ə çevrilir). Yuxarıdakı
 * məzmun səhifələrindən fərqli olaraq burada xəritəyə ehtiyac yoxdur: seed
 * slug-ı ilə URL slug-ı EYNİDİR.
 *
 * ⚠️ Bölmə `ContentSection.UNIVERSITY`-dir (sxemdə hüquqi bölmə YOXDUR və
 * miqrasiya açmadıq — dəyər `String` olsa da `CONTENT_SECTION_VALUES` sabitdir
 * və yeni dəyər `Record<>` cədvəllərini pozardı). Ayrılma `LEGAL_SLUGS` ilə
 * aparılır: bu siyahıdakı slug-lar `/about` bölməsinin «digər səhifələr»
 * siyahısına DÜŞMÜR.
 */
export const LEGAL_PATH_PREFIX = "/legal";

export const LEGAL_PAGES = [
  { slug: "privacy", label: "Məxfilik bildirişi" },
  { slug: "terms", label: "İstifadə şərtləri" },
  { slug: "copyright", label: "Müəllif hüququ" },
  { slug: "equal-opportunity", label: "Bərabər imkanlar bəyanatı" },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];

export const LEGAL_SLUGS: readonly string[] = LEGAL_PAGES.map((page) => page.slug);

export function legalHref(slug: string): string {
  return `${LEGAL_PATH_PREFIX}/${slug}`;
}

export function isLegalSlug(slug: string): slug is LegalSlug {
  return LEGAL_SLUGS.includes(slug);
}

/**
 * Redaksiya bölməsindəki "adi" səhifələr — hüquqi sənədlər KƏNARDA.
 *
 * ⚠️ Bu süzgəc olmasaydı `/about` səhifəsinin altındaki «Universitet
 * bölməsindəki digər səhifələr» siyahısında «Məxfilik bildirişi» görünərdi —
 * texniki cəhətdən doğru (eyni `section`), redaksiya baxımından səhv.
 */
export function excludeLegal<T extends { slug: string }>(pages: readonly T[]): T[] {
  return pages.filter((page) => !LEGAL_SLUGS.includes(page.slug));
}
