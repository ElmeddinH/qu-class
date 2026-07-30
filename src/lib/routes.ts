// ============================================================================
// src/lib/routes.ts
// QU CLASS — hansı URL prefiksi hansı icazəni tələb edir.
//
// ⚠️ Route QRUPLARI ((public) / (app) / (admin)) URL-də görünmür — Next.js
// onları ünvandan silir. Yəni middleware qrup adına baxa BİLMİR və qorunan
// yollar burada açıq siyahı kimi saxlanılır. Yeni `(app)` səhifəsi əlavə
// edəndə prefiksini bura da əlavə et.
//
// Bu fayl EDGE runtime-da (middleware) yüklənir → Prisma, bcrypt və digər
// Node-a bağlı modulları İMPORT ETMƏ.
// ============================================================================

/** Giriş tələb edən yollar — `(app)` qrupu. */
export const APP_ROUTE_PREFIXES = [
  "/home",
  "/class",
  "/u",
  "/me",
  "/notifications",
  "/search",
  "/events", // tədbir detalı + koordinator paneli (⚠️ istisnaya bax)
  "/kuds", // daxili dizayn sənədi — auth arxasındadır
] as const;

/**
 * Prefiksi qorunan siyahıda olsa da AÇIQ qalan DƏQİQ yollar.
 *
 * 🔴 `/events` İKİ route qrupuna bölünüb və bu, təsadüf deyil (PLAN.md §4.2):
 *   · `(public)/events`      → ictimai tədbirlər (`visibility = PUBLIC`),
 *                              giriş etməmiş ziyarətçi üçün
 *   · `(app)/events/[id]`    → tədbir detalı + RSVP
 *   · `(app)/events/[id]/manage` → koordinator paneli
 *
 * Route qrupu URL-də görünmür, yəni middleware `/events` ilə
 * `/events/<id>`-ni yalnız YOLUN ÖZÜNƏ baxaraq ayırd edə bilər. Prefiks
 * uyğunluğu (`startsWith`) ikisini də tutardı və ictimai siyahı auth arxasına
 * düşərdi — ona görə DƏQİQ `/events` burada istisna edilir.
 *
 * ⚠️ Yalnız dəqiq bərabərlik yoxlanılır: `/events/abc` istisna DEYİL.
 */
export const PUBLIC_EXACT_PATHS = ["/events"] as const;

/** Yalnız UNIVERSITY_ADMIN üçün — `(admin)` qrupu. */
export const ADMIN_ROUTE_PREFIXES = ["/admin"] as const;

/** Giriş etmiş istifadəçinin görməməli olduğu səhifələr (login/register). */
export const AUTH_ROUTE_PREFIXES = ["/login", "/register"] as const;

export const LOGIN_PATH = "/login";
export const AFTER_LOGIN_PATH = "/home";
export const AFTER_LOGOUT_PATH = "/";

/** `?callbackUrl=` — girişdən sonra qayıdılacaq ünvanın sorğu açarı. */
export const CALLBACK_URL_PARAM = "callbackUrl";

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Prefiks uyğun gəlsə də açıq qalan dəqiq yol — bax `PUBLIC_EXACT_PATHS`. */
export function isPublicExactPath(pathname: string): boolean {
  return (PUBLIC_EXACT_PATHS as readonly string[]).includes(pathname);
}

export function isAppRoute(pathname: string): boolean {
  if (isPublicExactPath(pathname)) return false;
  return matchesPrefix(pathname, APP_ROUTE_PREFIXES);
}

export function isAdminRoute(pathname: string): boolean {
  return matchesPrefix(pathname, ADMIN_ROUTE_PREFIXES);
}

export function isAuthRoute(pathname: string): boolean {
  return matchesPrefix(pathname, AUTH_ROUTE_PREFIXES);
}

/** Ən azı autentifikasiya tələb edən istənilən yol. */
export function isProtectedRoute(pathname: string): boolean {
  return isAppRoute(pathname) || isAdminRoute(pathname);
}

/**
 * Açıq yönləndirmənin (open redirect) qarşısını alır: `callbackUrl` yalnız
 * eyni sayt daxilindəki mütləq yol ola bilər.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return AFTER_LOGIN_PATH;
  if (!raw.startsWith("/") || raw.startsWith("//")) return AFTER_LOGIN_PATH;
  return raw;
}
