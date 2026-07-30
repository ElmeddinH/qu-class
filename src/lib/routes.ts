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

/**
 * 🔴 İCTİMAİ SƏTHİN MÜQAVİLƏSİ (Blok 11A) — İCAZƏ MƏNTİQİ DEYİL, YOXLAMA SİYAHISI.
 *
 * Bu siyahı HEÇ NƏYƏ İCAZƏ VERMİR: `resolveRouteAccess` qorunan prefikslərin
 * siyahısına baxır və burada olmayan hər yol onsuz da açıqdır. Siyahının işi
 * ƏKSİNİ sübut etməkdir — sadalanan yolların HEÇ BİRİ qorunan prefikslə
 * kəsişmir və heç biri yönləndirilmir.
 *
 * NİYƏ LAZIMDIR: Blok 11A ~15 yeni ictimai səhifə gətirdi. Qorunan prefiks
 * siyahısı isə qısadır (`/events`, `/search`, `/me`…) və yeni bir ictimai ad
 * onlardan birinin ALT YOLU ola bilər — məsələn `/events/public` yazsaydıq
 * `/events` istisnası ONU TUTMAZDI (istisna DƏQİQ bərabərlikdir) və səhifə
 * səssizcə `/login`-ə atardı. 2026-07-30 dövrəsi məhz belə bir səssiz
 * uyuşmazlıqdan doğmuşdu.
 *
 * İki test bu siyahı üzərində işləyir:
 *   · `routes.test.ts`     — hər yol × 3 ziyarətçi → `PUBLIC`, yönləndirmə yox
 *   · `tests/e2e/public.spec.ts` — anonim VƏ giriş etmiş brauzerdə 200
 *
 * ⚠️ Dinamik yollar (`/faculties/[slug]`, `/khankendi/[id]`, `/legal/[slug]`)
 * burada PREFİKS kimi deyil, `PUBLIC_DYNAMIC_PARENTS`-də saxlanılır: onların
 * konkret nümunəsi bazadan gəlir və e2e testi onu seed-dən oxuyur.
 */
export const PUBLIC_PAGE_PATHS = [
  "/",
  "/about",
  "/history",
  "/mission",
  "/faculties",
  "/campus-life",
  "/clubs",
  "/services",
  "/newcomers",
  "/khankendi",
  "/faq",
  "/events",
  "/accessibility",
  "/docs",
] as const;

/**
 * Dinamik ictimai səhifələrin valideyn yolları — alt yolları da AÇIQDIR.
 *
 * ⚠️ `/events` BURADA YOXDUR və bu, qəsdəndir: `/events/<id>` tədbir detalıdır
 * və AUTH ARXASINDADIR (`PUBLIC_EXACT_PATHS` qeydinə bax). Yəni ictimai
 * siyahıdan detala keçən anonim ziyarətçi `/login`-ə düşür — bu, sızma deyil,
 * qərardır: detal səhifəsi RSVP və iştirakçı siyahısı daşıyır.
 */
export const PUBLIC_DYNAMIC_PARENTS = ["/faculties", "/khankendi", "/legal"] as const;

/** Yalnız UNIVERSITY_ADMIN üçün — `(admin)` qrupu. */
export const ADMIN_ROUTE_PREFIXES = ["/admin"] as const;

/** Giriş etmiş istifadəçinin görməməli olduğu səhifələr (login/register). */
export const AUTH_ROUTE_PREFIXES = ["/login", "/register"] as const;

export const LOGIN_PATH = "/login";
export const AFTER_LOGIN_PATH = "/home";
export const AFTER_LOGOUT_PATH = "/";

/** `?callbackUrl=` — girişdən sonra qayıdılacaq ünvanın sorğu açarı. */
export const CALLBACK_URL_PARAM = "callbackUrl";

/**
 * 🔴 SESSİYA QAÇIŞ YOLU — YÖNLƏNDİRMƏ DÖVRƏSİNİN QARŞISINI ALIR.
 *
 * Kuka KEÇƏRLİDİR (imza düzgündür), amma içindəki `userId` DB-də YOXDUR
 * (hesab silinib, baza yenidən seed edilib). Bu halda `(app)` / `(admin)`
 * layout-u səhifəni render edə bilmir və istifadəçini çıxarmalıdır — amma
 * birbaşa `/login`-ə atmaq SONSUZ DÖVRƏ yaradır:
 *
 *   /login --(middleware: kuka var → giriş edib)--> /home
 *   /home  --(layout: DB-də istifadəçi yoxdur)-----> /login   ← dövrə
 *
 * Dövrənin səbəbi kukanın YERİNDƏ QALMASIDIR. Ona görə çıxış bu route
 * handler-dən keçir: o, əvvəlcə sessiya kukisini SİLİR, sonra `/login`-ə
 * yönləndirir — ikinci keçiddə middleware artıq "anonim" görür və dayanır.
 *
 * ⚠️ Bu yol HEÇ VAXT qorunan siyahıya salınmamalıdır (bax `routes.test.ts` →
 * "qaçış yolu" testi): qorunsaydı middleware onu da /login-ə atardı və dövrə
 * geri qayıdardı.
 */
export const SESSION_EXPIRED_PATH = "/api/session/expired";

/** `?expired=1` — `/login`-də "sessiyanız etibarsız oldu" bildirişinin açarı. */
export const SESSION_EXPIRED_PARAM = "expired";

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

// ---------------------------------------------------------------------------
// İcazə qərarı — VAHİD MƏNBƏ
//
// 🔴 Middleware ÖZ siyahısını saxlamır: `auth.config.ts` → `authorized()`
// yalnız bu iki SAF funksiyanı çağırır. Siyahı iki yerdə saxlanılsaydı
// (middleware + səhifə) onlar vaxtla ayrılar və məhz yönləndirmə dövrəsi
// yaranardı — bir tərəf "bu yol açıqdır", digəri "qorunur" deyərdi.
// ---------------------------------------------------------------------------

/**
 * Sorğunu edən tərəf — Edge-də TOKEN-dən bilinən qədəri.
 * Cohort səviyyəli rollar (`CLASS_MODERATOR` və s.) BURADA YOXDUR: onlar
 * DB-dən gəlir və middleware-də əlçatan deyil (bax `src/auth.config.ts`).
 */
export type ViewerKind = "ANONYMOUS" | "USER" | "ADMIN";

/**
 * Yolun həmin ziyarətçi üçün ÖDƏNİLMƏMİŞ tələbi.
 *   · `PUBLIC`         — tələb yoxdur, sorğu keçir
 *   · `REQUIRE_AUTH`   — giriş lazımdır (anonim ziyarətçi qorunan yolda)
 *   · `REQUIRE_ADMIN`  — giriş var, amma sistem admini deyil
 *   · `REDIRECT_HOME`  — giriş edən istifadəçinin auth səhifəsində işi yoxdur
 */
export type RouteAccess = "PUBLIC" | "REQUIRE_AUTH" | "REQUIRE_ADMIN" | "REDIRECT_HOME";

/**
 * ⚠️ ŞƏRTLƏRİN SIRASI DAVRANIŞIN ÖZÜDÜR:
 *   1. Dəqiq ictimai yol istisnası (`isAppRoute` içində, `===` ilə) prefiks
 *      yoxlamasından ƏVVƏL — `/events` ictimai, `/events/<id>` qorunan.
 *   2. Auth səhifəsi qaydası prefiks yoxlamasından ƏVVƏL — `/login`
 *      qorunan siyahıda deyil, yəni sıra pozulsa qayda heç işə düşməzdi.
 *   3. Qorunmayan hər şey dərhal keçir — qalan yoxlamalar yalnız qorunan
 *      yollara aiddir.
 */
export function resolveRouteAccess(
  pathname: string,
  viewerKind: ViewerKind,
): RouteAccess {
  const authenticated = viewerKind !== "ANONYMOUS";

  if (authenticated && isAuthRoute(pathname)) return "REDIRECT_HOME";

  if (!isProtectedRoute(pathname)) return "PUBLIC";

  if (!authenticated) return "REQUIRE_AUTH";

  if (isAdminRoute(pathname) && viewerKind !== "ADMIN") return "REQUIRE_ADMIN";

  return "PUBLIC";
}

/**
 * Yönləndirmə hədəfi — icazə varsa `null`.
 *
 * 🔴 HƏDƏF HƏMİŞƏ "SON DAYANACAQ" OLMALIDIR: hədəfin özü üçün bu funksiya
 * `null` qaytarmalıdır, yoxsa brauzer iki ünvan arasında ilişir. Qayda
 * `routes.test.ts`-dəki DÖVRƏ testi ilə hər yol üçün maşınla yoxlanılır.
 *
 * @param search `?`-lə başlayan sorğu sətri (`URL.search` kimi) və ya boş sətir.
 */
export function routeRedirectTarget(
  pathname: string,
  search: string,
  viewerKind: ViewerKind,
): string | null {
  switch (resolveRouteAccess(pathname, viewerKind)) {
    case "PUBLIC":
      return null;

    case "REQUIRE_AUTH": {
      // Girişdən sonra istifadəçi getmək istədiyi yerə qayıtsın.
      const params = new URLSearchParams({
        [CALLBACK_URL_PARAM]: `${pathname}${search}`,
      });
      return `${LOGIN_PATH}?${params.toString()}`;
    }

    // Admin olmayanı `/login`-ə atmaq mənasızdır (o, artıq giriş edib) →
    // hədəf HƏR İKİ halda `(app)` içindədir, auth səhifəsi DEYİL.
    case "REQUIRE_ADMIN":
    case "REDIRECT_HOME":
      return AFTER_LOGIN_PATH;
  }
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
