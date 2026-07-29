// ============================================================================
// src/lib/form-fields.ts
// Formaların ORTAQ Zod primitivləri — saf modul, `features/*`-dan asılı deyil.
//
// Blok 4-də bu köməkçilər `features/feed/schemas.ts`-də yaranmışdı. Blok 7-nin
// üç forması (`/me/edit`, karyera, təhsil) eyni qaydalara ehtiyac duyur; ikinci
// nüsxə yazmaq T13-ün (etiket dublikatı) təkrarı olardı — ona görə primitivlər
// `lib/`-ə çıxarıldı, lent sxemi onları yenidən ixrac edir (köhnə import
// yolları qorunur).
//
// ⚠️ TƏLƏ T3: `z.coerce.*` İŞLƏDİLMİR. Coerce sxemin GİRİŞ tipini `unknown`-a
// çevirir və `useForm<z.infer<…>>` sahə tipləri dağılır (`field.value` artıq
// `string` olmur). Buna görə:
//   · tarixlər formada SƏTİR kimi doğrulanır (`isParsableDate`), `Date`-ə
//     çevirmə SERVER ACTION-da olur;
//   · illər (`startYear`) sətir kimi doğrulanır (`isYearString`), `Number`-ə
//     çevirmə yenə action-da.
// Nəticədə hər sxemin giriş tipi = çıxış tipi.
// ============================================================================

import { z } from "zod";

/** `new Date(v)` həqiqətən tarix verirmi? (`"abc"` → `Invalid Date`) */
export function isParsableDate(value: string): boolean {
  return value.trim().length > 0 && !Number.isNaN(new Date(value).getTime());
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * `""` → `null`. DB-də «boş sətir» ilə «yoxdur» fərqlənməlidir: boş sətir
 * kataloq filtrində və facet saylarında xana kimi görünərdi.
 */
export function emptyToNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Boş sətir = «doldurulmadı».
 *
 * `.optional()` İŞLƏDİLMİR: RHF boş `<input>`-u `""` kimi verir, `undefined`
 * kimi yox. Sahəni `string` saxlayıb `""`-i serverdə `null`-a çevirmək
 * (bax `emptyToNull`) RHF ilə ən az sürtünmə yaradan formadır.
 */
export const optionalText = (max: number) =>
  z.string().trim().max(max, `Maksimum ${max} simvol.`);

export const optionalUrl = (max = 600) =>
  z
    .string()
    .trim()
    .max(max, `Maksimum ${max} simvol.`)
    .refine((v) => v === "" || isHttpUrl(v), {
      message: "Ünvan http:// və ya https:// ilə başlamalıdır.",
    });

// ---------------------------------------------------------------------------
// İllər — `EducationEntry.startYear` / `endYear` (`Int` sütunları)
// ---------------------------------------------------------------------------

/**
 * İl aralığı QƏSDƏN sabitdir (`new Date().getFullYear()` DEYİL).
 *
 * Sxem modulu saf qalmalıdır: cari ilə bağlı sərhəd testi "2027-ci ildə
 * qırılan" testə çevirərdi. Aralıq geniş seçilib — məqsəd real diapazonu
 * daraltmaq deyil, `Int` sütununa "20260" kimi yazı düşməsinin qarşısını almaq.
 */
export const MIN_ENTRY_YEAR = 1950;
export const MAX_ENTRY_YEAR = 2100;

export function isYearString(value: string): boolean {
  if (!/^\d{4}$/.test(value.trim())) return false;
  const year = Number.parseInt(value, 10);
  return year >= MIN_ENTRY_YEAR && year <= MAX_ENTRY_YEAR;
}

const YEAR_MESSAGE = `İl ${MIN_ENTRY_YEAR}—${MAX_ENTRY_YEAR} aralığında dörd rəqəm olmalıdır.`;

export const yearField = () =>
  z.string().trim().min(1, "İl tələb olunur.").refine(isYearString, YEAR_MESSAGE);

export const optionalYearField = () =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || isYearString(v), YEAR_MESSAGE);
