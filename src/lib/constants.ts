// ============================================================================
// src/lib/constants.ts
// QU CLASS — domenə aid sabitlər.
//
// ⚠️ Universitet e-poçt domeni BURADA saxlanılır. Zod sxemində, servisdə və ya
// UI mətnində "qu.edu.az" sətrini təkrar yazma — universitet domeni dəyişsə
// (məs. alt-domen əlavə olunsa) yalnız bu fayl redaktə olunmalıdır.
// ============================================================================

/** Universitet e-poçt domeni — qeydiyyat yalnız bu domenlə mümkündür. */
export const UNIVERSITY_EMAIL_DOMAIN = "qu.edu.az";

/** Formalarda göstərilən nümunə e-poçt (placeholder). */
export const UNIVERSITY_EMAIL_EXAMPLE = `ad.soyad@${UNIVERSITY_EMAIL_DOMAIN}`;

/** E-poçt universitet domenindədirmi? Böyük-kiçik hərfə həssas deyil. */
export function isUniversityEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(`@${UNIVERSITY_EMAIL_DOMAIN}`);
}

/**
 * E-poçtu saxlama/müqayisə forması: kənar boşluqlar atılır və kiçik hərfə
 * salınır. `User.email` unikal olduğu üçün qeydiyyat və giriş EYNİ
 * normalizasiyadan keçməlidir, yoxsa "Ali@..." və "ali@..." iki hesab olur.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** bcrypt "cost factor" — qeydiyyatda hər şifrə üçün təsadüfi duz yaradılır. */
export const BCRYPT_ROUNDS = 10;

/**
 * 🔴 ŞİFRƏSİZ HESABIN `passwordHash` DƏYƏRİ (Blok 11B — SIS CSV importu).
 *
 * `User.passwordHash` sxemdə MƏCBURİDİR (`String`, nullable deyil), toplu
 * import isə şifrə QƏBUL ETMİR (bax `src/lib/sis-import.ts` başlığı). Ona görə
 * hesab bu sabitlə yaradılır və istifadəçi şifrəsini qeydiyyat / bərpa axını
 * ilə özü təyin edir.
 *
 * Dəyər QƏSDƏN ETİBARSIZ bcrypt hash-dır (`$2` prefiksi yoxdur): bcrypt
 * müqayisəsi onunla heç vaxt `true` qaytara bilməz. Buna baxmayaraq
 * `src/auth.ts` onu AÇIQ ŞƏKİLDƏ də rədd edir — "kitabxana özü qoruyar"
 * mülahizəsinə söykənmirik.
 *
 * ⚠️ Boş sətir (`""`) İŞLƏDİLMİR: bəzi bcrypt implementasiyaları boş hash-da
 * xəta atır və giriş axını 500 verərdi (uğursuz giriş 500 olmamalıdır).
 */
export const UNSET_PASSWORD_HASH = "!unset";

/** Şifrə hələ təyin edilməyib? (SIS importu ilə yaradılmış hesab) */
export function isPasswordUnset(passwordHash: string): boolean {
  return passwordHash === UNSET_PASSWORD_HASH || !passwordHash.startsWith("$2");
}

/** Şifrənin minimal uzunluğu (spesifikasiya: ən azı bir hərf və bir rəqəm). */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Qeydiyyatda seçilə bilən qəbul illəri üçün aşağı hədd.
 * Universitet 2021-ci ildə yaradılıb — bundan əvvəlki il mənasızdır.
 */
export const MIN_ADMISSION_YEAR = 2021;
