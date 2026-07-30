// ============================================================================
// src/features/welcome/sections.ts
// Açılış səhifəsinin bölmə metadatası.
//
// 🔴 BAŞLIQ VƏ `id` BURADA TƏYİN OLUNMUR — `layouts/nav.ts` → `LANDING_SECTIONS`
// VAHİD MƏNBƏDİR. Səbəb: `PUBLIC_NAV` və `FOOTER_NAV` linkləri həmin siyahının
// anchor-larına baxır (Blok 9 əlavəsi). Başlığı burada təkrar yazsaydıq nav
// linki səssizcə "heç yerə" apara bilərdi — 404-dən pisdir, çünki xəta yoxdur.
//
// ⚠️ `NUMBERS_SECTION` və `CLOSING_SECTION` naviqasiya HƏDƏFİ DEYİL (nav-da
// onlara link yoxdur), ona görə `LANDING_SECTIONS`-ə ƏLAVƏ EDİLMİR: o siyahı
// "linkin gedə biləcəyi yerlər" müqaviləsidir, səhifənin bölmə sayı deyil.
// ============================================================================

import { LANDING_SECTIONS, type LandingSection } from "@/layouts/nav";

export type LandingSectionId =
  | "about"
  | "faculties"
  | "campus-life"
  | "khankendi"
  | "events"
  | "faq";

/**
 * Naviqasiya hədəfi olan bölmənin metadatası.
 *
 * ⚠️ `LANDING_SECTIONS`-də `id` tapılmasa ATIR. Bu, qəsdən sərtdir: bölmə
 * silinsə və ya `id` dəyişsə səhifə BUILD zamanı sınmalıdır, istifadəçi
 * işləməyən anchor-a kliklədikdən sonra deyil.
 */
export function landingSection(id: LandingSectionId): LandingSection {
  const section = LANDING_SECTIONS.find((entry) => entry.id === id);
  if (!section) {
    throw new Error(
      `[welcome] «${id}» bölməsi LANDING_SECTIONS-də yoxdur — naviqasiya linki qırılardı.`,
    );
  }
  return section;
}

/** Naviqasiya hədəfi OLMAYAN bölmələr — `id` yalnız `aria` bağlantısı üçündür. */
export const NUMBERS_SECTION = {
  id: "numbers",
  title: "Rəqəmlərlə",
  description:
    "Universitetin akademik strukturu. Şəxsi və ya sinif səviyyəli üzv sayı " +
    "ictimai səhifədə göstərilmir.",
} as const;

/**
 * Blok 11A-nın üç CANLI bölməsi (GW analizi #12).
 *
 * ⚠️ `LANDING_SECTIONS`-ə ƏLAVƏ EDİLMİR: o siyahı «linkin gedə biləcəyi
 * yerlər» müqaviləsidir və bu üç bölməyə naviqasiyadan link YOXDUR. Üstəlik
 * onlar BOŞ HALDA GİZLƏNİR — nav hədəfi olsaydı link heç yerə aparardı.
 */
export const STORIES_SECTION = {
  id: "stories",
  title: "İcmamızdan hekayələr",
  description:
    "Tələbələrin və məzunların ictimai paylaşdığı xatirələr. Sinif daxili " +
    "xatirələr burada görünmür — onlar yalnız öz sinfinə açıqdır.",
} as const;

export const NEWS_SECTION = {
  id: "news",
  title: "Son xəbərlər",
  description: "Universitet icmasının ictimaiyyətə açıq paylaşımları.",
} as const;

export const QUOTE_SECTION = {
  id: "quote",
  title: "Məzunlarımız deyir",
  description: "Hər gün başqa bir məzunun universitetə mesajı.",
} as const;

/** Açılışda göstərilən canlı blokların limitləri. */
export const STORY_LIMIT = 2;
export const NEWS_LIMIT = 4;
/** Sitat hovuzu — gün nömrəsinə görə birinin seçildiyi siyahı. */
export const QUOTE_POOL_LIMIT = 12;

export const CLOSING_SECTION = {
  id: "start",
  title: "Sinif səhifən səni gözləyir",
  description:
    "Qeydiyyat bir dəqiqə çəkir: fakültə, ixtisas və qəbul ilini seçirsən — " +
    "sinif səhifən avtomatik açılır.",
} as const;

/** Kart siyahılarının açılış səhifəsindəki limiti (KUDS: 3 sütunlu qrid). */
export const PREVIEW_CARD_LIMIT = 3;

/** FAQ akkordeonunda göstərilən sual sayı (spec §2: 5-6 sual). */
export const FAQ_PREVIEW_LIMIT = 6;
