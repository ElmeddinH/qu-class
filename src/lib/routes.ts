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
  "/kuds", // daxili dizayn sənədi — auth arxasındadır
] as const;

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

export function isAppRoute(pathname: string): boolean {
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
