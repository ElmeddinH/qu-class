// ============================================================================
// src/lib/consent.ts
// Kuki razılığı — SAF modul (React / Prisma / `next/headers` importu YOXDUR).
//
// 🔴 TƏLƏ E — RAZILIQ `localStorage`-DA SAXLANMIR.
// `localStorage` yalnız brauzerdədir: server komponenti onu OXUYA BİLMİR, yəni
// banner HƏR YÜKLƏMƏDƏ HTML-ə düşür və client hidrasiyasından sonra yox olur.
// Nəticə iki cür pisdir: (a) razılıq vermiş istifadəçi banneri bir anlıq yenidən
// görür (hidrasiya sıçrayışı), (b) JS-siz brauzerdə banner heç vaxt bağlanmır.
//
// Həll: dəyər `document.cookie`-yə yazılır (client) və serverdə `cookies()` ilə
// OXUNUR — razılıq varsa banner ÜMUMİYYƏTLƏ render olunmur, yəni DOM-da izi
// qalmır.
//
// ⚠️ Kuki YALNIZ seçimi daşıyır (`all` / `necessary`), istifadəçi identifikatoru
// DAŞIMIR — özü izləyici olsaydı ziddiyyət yaranardı. `SameSite=Lax` +
// `path=/`; `HttpOnly` QOYULMUR, çünki dəyəri məhz client yazır (server action
// üçün istifadəçini formaya göndərmək lazım gələrdi).
//
// ⚠️ Bu fayl SAFDIR ki, oxu/yazı köməkçiləri bazasız unit testlə örtülsün —
// «razılıq vermiş istifadəçi banneri təkrar görmür» qaydası regressiyaya ən
// açıq yerdir.
// ============================================================================

/** Kukanın adı — client yazıcısı və server oxuyucusu EYNİ sabitdən oxuyur. */
export const CONSENT_COOKIE_NAME = "qu_cookie_consent";

/**
 * Bir il (saniyə). Razılıq müddəti — bundan sonra ziyarətçidən yenidən soruşulur.
 * (AB praktikasında 6-12 ay; sərhədin üstü seçilib, çünki tələbə istifadəsi
 * semestr ritmindədir və hər giriş bannerlə qarşılamaq düşmən davranışdır.)
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Razılıq səviyyələri.
 *   · `all`       — bütün kateqoriyalar (analitika daxil)
 *   · `necessary` — yalnız zəruri kukilər (sessiya) — «Rədd et» də buraya düşür
 *
 * ⚠️ «Rədd et» AYRI dəyər DEYİL: zəruri kukiləri (sessiya) söndürmək mümkün
 * deyil — onlarsız giriş işləmir. Rədd = "yalnız zəruri". Bunu banner mətni də
 * açıq yazır, yoxsa düymə yalan vəd edərdi.
 */
export const CONSENT_VALUES = ["all", "necessary"] as const;
export type ConsentValue = (typeof CONSENT_VALUES)[number];

// ---------------------------------------------------------------------------
// KATEQORİYALAR — «Seçimlər» ekranının mənbəyi (Blok 12B)
// ---------------------------------------------------------------------------
//
// 🔴 BURADA UYDURMA KATEQORİYA YOXDUR. Layihədə analitika, reklam və ya
// üçüncü tərəf izləyicisi QURULMAYIB — «Analitika» adlı söndürülə bilən açar
// göstərsək istifadəçiyə mövcud olmayan şey üzərində nəzarət illüziyası
// satardıq. Bu, GDPR mənasında da səhvdir: razılıq real emal əməliyyatına
// verilir, dekorativ açara yox.
//
// ⚠️ STRUKTUR İSƏ HAZIRDIR: gələcəkdə real kateqoriya əlavə olunanda bura BİR
// sətir yazılır — banner, «Seçimlər» ekranı və `consentValueFor()` avtomatik
// onu götürür. İki yerdə siyahı saxlanmır.
//
// ⚠️ `required: true` olan kateqoriya UI-da AÇIQ və PASSİV göstərilir: onu
// söndürmək mümkün deyil (sessiya kukisi olmadan giriş işləmir) və düymə bunu
// yalan vəd etməməlidir.

export interface ConsentCategory {
  id: string;
  title: string;
  /** Nə üçün lazımdır — istifadəçi dilində, bir cümlə. */
  description: string;
  /** Söndürülə bilməzmi? (Zəruri kukilər üçün `true`.) */
  required: boolean;
}

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  {
    id: "necessary",
    title: "Zəruri kukilər",
    description:
      "Giriş sessiyası (Auth.js) və bu kuki seçiminin özü. Söndürülə bilməz — onlarsız hesabınıza daxil ola bilməzsiniz.",
    required: true,
  },
];

/** Söndürülə bilən kateqoriyalar. HAZIRDA BOŞDUR — bax yuxarıdakı qeyd. */
export const OPTIONAL_CONSENT_CATEGORIES: readonly ConsentCategory[] =
  CONSENT_CATEGORIES.filter((category) => !category.required);

/**
 * Seçilmiş ixtiyari kateqoriyalardan razılıq dəyəri qurur.
 *
 * ⚠️ İxtiyari kateqoriya YOXDURSA nəticə həmişə `"necessary"`-dir: «hamısını
 * qəbul et» ilə «yalnız zəruri» bu gün EYNİ emalı bildirir və kuki bunu olduğu
 * kimi yazır. Uydurma fərq yaratmaq jurnalı yalan edərdi.
 */
export function consentValueFor(acceptedOptionalIds: readonly string[]): ConsentValue {
  if (OPTIONAL_CONSENT_CATEGORIES.length === 0) return "necessary";

  return OPTIONAL_CONSENT_CATEGORIES.every((category) =>
    acceptedOptionalIds.includes(category.id),
  )
    ? "all"
    : "necessary";
}

/**
 * Xam kuki dəyərini doğrulanmış seçimə çevirir.
 * Naməlum / boş dəyər → `null` (yəni "hələ soruşulmayıb", banner göstərilir).
 */
export function parseConsent(raw: string | null | undefined): ConsentValue | null {
  if (!raw) return null;
  const value = raw.trim();
  return (CONSENT_VALUES as readonly string[]).includes(value)
    ? (value as ConsentValue)
    : null;
}

/** Razılıq verilibmi? Banner məhz bunun `false` olduğu halda render olunur. */
export function hasConsentDecision(raw: string | null | undefined): boolean {
  return parseConsent(raw) !== null;
}

/** Analitika kukilərinə icazə varmı? (Hazırda analitika YOXDUR — qapı hazırdır.) */
export function allowsAnalytics(raw: string | null | undefined): boolean {
  return parseConsent(raw) === "all";
}

/**
 * `document.cookie`-yə yazılacaq sətir.
 *
 * ⚠️ `Secure` bayrağı YALNIZ HTTPS-də əlavə olunur: `localhost`-da (http)
 * `Secure` kuka brauzer tərəfindən SƏSSİZCƏ ATILIR və banner heç vaxt
 * bağlanmazdı. Bayraq protokoldan törəyir, mühit dəyişənindən yox — e2e
 * testi http üzərində işləyir.
 */
export function consentCookieString(
  value: ConsentValue,
  options: { secure?: boolean; maxAge?: number } = {},
): string {
  const maxAge = options.maxAge ?? CONSENT_MAX_AGE_SECONDS;

  return [
    `${CONSENT_COOKIE_NAME}=${value}`,
    "path=/",
    `max-age=${maxAge}`,
    "SameSite=Lax",
    ...(options.secure ? ["Secure"] : []),
  ].join("; ");
}
