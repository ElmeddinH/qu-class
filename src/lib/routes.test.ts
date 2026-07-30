// ============================================================================
// src/lib/routes.test.ts
// Route qorunması — `/events` bölünməsi (Blok 9) və `/api/v1` + `/docs`
// səthi (Blok 9S).
//
// 🔴 NİYƏ MƏHZ BU TESTLƏR: `/events` İKİ route qrupuna bölünüb —
// `(public)/events` (ictimai siyahı) və `(app)/events/[id]` (detal + panel).
// Route qrupu URL-də görünmür, yəni middleware ikisini yalnız yola baxaraq
// ayırd edir. Prefiks uyğunluğu (`startsWith`) təkbaşına işlədilsəydi ictimai
// siyahı auth arxasına düşərdi və Blok 11-də bu, "niyə welcome page-dən
// tədbirlərə keçid /login-ə atır?" şəklində üzə çıxardı.
// ============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AFTER_LOGIN_PATH,
  APP_ROUTE_PREFIXES,
  LOGIN_PATH,
  PUBLIC_EXACT_PATHS,
  SESSION_EXPIRED_PATH,
  isAdminRoute,
  isAppRoute,
  isAuthRoute,
  isProtectedRoute,
  isPublicExactPath,
  resolveRouteAccess,
  routeRedirectTarget,
  safeCallbackUrl,
  type ViewerKind,
} from "./routes";

describe("isAppRoute", () => {
  it("qorunan prefikslər tanınır", () => {
    for (const prefix of APP_ROUTE_PREFIXES) {
      // `/events` istisnadır — aşağıdaki ayrıca bloka bax.
      if (isPublicExactPath(prefix)) continue;
      expect(isAppRoute(prefix), prefix).toBe(true);
      expect(isAppRoute(`${prefix}/alt`), prefix).toBe(true);
    }
  });

  it("qorunmayan yol `false` verir", () => {
    expect(isAppRoute("/")).toBe(false);
    expect(isAppRoute("/about")).toBe(false);
    expect(isAppRoute("/khankendi")).toBe(false);
  });

  it("oxşar başlanğıclı yol SƏHVƏN tutulmur", () => {
    // `/eventsomething` `/events` prefiksi DEYİL.
    expect(isAppRoute("/eventsomething")).toBe(false);
    expect(isAppRoute("/classroom")).toBe(false);
  });
});

describe("🔴 /events bölünməsi", () => {
  it("DƏQİQ `/events` AÇIQDIR — (public) qrupundadır", () => {
    expect(isPublicExactPath("/events")).toBe(true);
    expect(isAppRoute("/events")).toBe(false);
    expect(isProtectedRoute("/events")).toBe(false);
  });

  it("`/events/[id]` QORUNUR — tədbir detalı (app) qrupundadır", () => {
    expect(isAppRoute("/events/evt-1")).toBe(true);
    expect(isProtectedRoute("/events/evt-1")).toBe(true);
  });

  it("`/events/[id]/manage` və `/report` də qorunur", () => {
    expect(isAppRoute("/events/evt-1/manage")).toBe(true);
    expect(isAppRoute("/events/evt-1/report")).toBe(true);
  });

  it("istisna YALNIZ dəqiq bərabərlikdir, alt yollara yayılmır", () => {
    expect(isPublicExactPath("/events/evt-1")).toBe(false);
    expect(PUBLIC_EXACT_PATHS).toEqual(["/events"]);
  });
});

describe("isAdminRoute / isAuthRoute", () => {
  it("admin prefiksi", () => {
    expect(isAdminRoute("/admin")).toBe(true);
    expect(isAdminRoute("/admin/users")).toBe(true);
    expect(isAdminRoute("/administration")).toBe(false);
  });

  it("giriş səhifələri", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/register")).toBe(true);
    expect(isAuthRoute("/home")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveRouteAccess — cədvəl testi
// ---------------------------------------------------------------------------

/** Test cədvəli: yol × ziyarətçi növü → gözlənilən qərar. */
const ACCESS_TABLE: ReadonlyArray<{
  path: string;
  anonymous: string;
  user: string;
  admin: string;
}> = [
  //                        ANONYMOUS        USER              ADMIN
  { path: "/", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/login", anonymous: "PUBLIC", user: "REDIRECT_HOME", admin: "REDIRECT_HOME" },
  { path: "/register", anonymous: "PUBLIC", user: "REDIRECT_HOME", admin: "REDIRECT_HOME" },
  // Swagger UI (Blok 9S) — sənəd auth arxasında DEYİL.
  { path: "/docs", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // `/events` — ictimai siyahı, `/events/<id>` — tədbir detalı (qorunur).
  { path: "/events", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/events/evt-01", anonymous: "REQUIRE_AUTH", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/class/x", anonymous: "REQUIRE_AUTH", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/class/x/events", anonymous: "REQUIRE_AUTH", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/home", anonymous: "REQUIRE_AUTH", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/me", anonymous: "REQUIRE_AUTH", user: "PUBLIC", admin: "PUBLIC" },
  { path: "/admin", anonymous: "REQUIRE_AUTH", user: "REQUIRE_ADMIN", admin: "PUBLIC" },
  // Auth.js-in öz endpoint-i middleware matcher-indən kənardadır, amma məntiq
  // yenə də "açıq" deməlidir — sessiya heç vaxt öz-özünü qorumamalıdır.
  { path: "/api/auth/session", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // 🔴 REST qatı (Blok 9S) ÖZ qapısını işlədir — `lib/api/guard.ts` → `withUser`
  // 401 JSON qaytarır. Middleware bura QARIŞMAMALIDIR: qarışsaydı cavab 307 +
  // `/login`-in HTML-i olardı və Swagger UI «Try it out» JSON əvəzinə səhifə
  // göstərərdi. Aşağıdaki dörd sətir `/api`-nin `APP_ROUTE_PREFIXES`-ə
  // əlavə edilməsini maşınla bloklayır.
  { path: "/api/v1/health", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // ⚠️ `/login` auth prefiksidir, bu isə REST login endpoint-idir. Prefiks
  // məntiqi səhvən tutsaydı, giriş etmiş müştəri üçün REDIRECT_HOME çıxardı və
  // `POST /api/v1/auth/login` sınardı.
  { path: "/api/v1/auth/login", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // Kuka MƏCBURİ olan v1 endpoint-i — icazə yoxlaması guard-dadır, route-da yox.
  {
    path: "/api/v1/cohorts/sec2023/posts",
    anonymous: "PUBLIC",
    user: "PUBLIC",
    admin: "PUBLIC",
  },
  // Sərhəd: `/search` QORUNAN prefiksdir, `/api/v1/search` isə ondan asılı deyil.
  { path: "/api/v1/search", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // Sərhəd: `/eventsomething` `/events` prefiksi DEYİL.
  { path: "/eventsomething", anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
  // 🔴 Qaçış yolu — aşağıdaki ayrıca bloka bax.
  { path: SESSION_EXPIRED_PATH, anonymous: "PUBLIC", user: "PUBLIC", admin: "PUBLIC" },
];

describe("resolveRouteAccess", () => {
  for (const row of ACCESS_TABLE) {
    it(`${row.path}`, () => {
      expect(resolveRouteAccess(row.path, "ANONYMOUS"), "ANONYMOUS").toBe(row.anonymous);
      expect(resolveRouteAccess(row.path, "USER"), "USER").toBe(row.user);
      expect(resolveRouteAccess(row.path, "ADMIN"), "ADMIN").toBe(row.admin);
    });
  }
});

describe("routeRedirectTarget", () => {
  it("icazə varsa yönləndirmə yoxdur", () => {
    expect(routeRedirectTarget("/class/x", "", "USER")).toBeNull();
    expect(routeRedirectTarget("/login", "", "ANONYMOUS")).toBeNull();
  });

  it("anonim ziyarətçi callbackUrl ilə /login-ə gedir", () => {
    expect(routeRedirectTarget("/home", "", "ANONYMOUS")).toBe(
      `${LOGIN_PATH}?callbackUrl=%2Fhome`,
    );
    expect(routeRedirectTarget("/class/x/events", "?scope=REUNION", "ANONYMOUS")).toBe(
      `${LOGIN_PATH}?callbackUrl=%2Fclass%2Fx%2Fevents%3Fscope%3DREUNION`,
    );
  });

  it("giriş etmiş istifadəçi auth səhifəsindən (app) içinə atılır", () => {
    expect(routeRedirectTarget("/login", "", "USER")).toBe(AFTER_LOGIN_PATH);
    expect(routeRedirectTarget("/register", "", "ADMIN")).toBe(AFTER_LOGIN_PATH);
  });

  it("admin olmayan /admin-dən (app) içinə atılır — /login-ə DEYİL", () => {
    const target = routeRedirectTarget("/admin", "", "USER");
    expect(target).toBe(AFTER_LOGIN_PATH);
    expect(isAuthRoute(target!)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 🔴 DÖVRƏ TESTİ
//
// Bu blok 2026-07-30-dakı "ağ ekran" nasazlığının qoruyucusudur: `/login`
// `/home`-a, `/home` isə yenidən `/login`-ə atırdı və brauzer iki ünvan
// arasında ilişirdi. Qayda sadədir — YÖNLƏNDİRMƏ HƏDƏFİ SON DAYANACAQ
// OLMALIDIR, yəni hədəfin özü bir daha yönləndirilməməlidir (maksimum 1 keçid).
// ---------------------------------------------------------------------------

const VIEWER_KINDS: readonly ViewerKind[] = ["ANONYMOUS", "USER", "ADMIN"];

/** `/login?callbackUrl=%2Fhome` → `{ pathname: "/login", search: "?callback…" }` */
function splitTarget(target: string): { pathname: string; search: string } {
  const url = new URL(target, "http://qu.test");
  return { pathname: url.pathname, search: url.search };
}

describe("🔴 yönləndirmə dövrəsi", () => {
  for (const kind of VIEWER_KINDS) {
    it(`${kind}: heç bir yol dövrəyə düşmür (maksimum 1 keçid)`, () => {
      for (const row of ACCESS_TABLE) {
        const target = routeRedirectTarget(row.path, "", kind);
        if (!target) continue;

        const next = splitTarget(target);
        const secondHop = routeRedirectTarget(next.pathname, next.search, kind);

        expect(
          secondHop,
          `${row.path} → ${target} → ${secondHop} (dövrə: hədəfin özü yenidən yönləndirilir)`,
        ).toBeNull();
      }
    });
  }

  it("🔴 qaçış yolu (SESSION_EXPIRED_PATH) giriş etmiş istifadəçi üçün DƏ açıqdır", () => {
    // Məhz bu sətir dövrəni kəsir: sessiya kukisi hələ brauzerdədir (yəni
    // ziyarətçi "giriş etmiş" görünür), buna baxmayaraq kukanı təmizləyən yol
    // yönləndirilməməlidir. Qorunan siyahıya düşsəydi `/login`-ə atılar və
    // dövrə geri qayıdardı.
    for (const kind of VIEWER_KINDS) {
      expect(routeRedirectTarget(SESSION_EXPIRED_PATH, "", kind), kind).toBeNull();
    }
    expect(isAuthRoute(SESSION_EXPIRED_PATH)).toBe(false);
    expect(isProtectedRoute(SESSION_EXPIRED_PATH)).toBe(false);
  });

  // 🔴 Dövrənin İKİNCİ ucu server tərəfindədir və saf funksiya ilə yoxlanmır:
  // layout `getSessionUser()` `null` qaytaranda hara yönləndirir? `/login`
  // yazılsa kuka yerində qalır və middleware onu geri atır. Bu, məhz həmin
  // sətrin qoruyucusudur — sadə, amma nasazlığı birbaşa təkrarlanmaz edir.
  describe("server layout-ları", () => {
    const LAYOUTS = ["src/app/(app)/layout.tsx", "src/app/(admin)/layout.tsx"];

    for (const file of LAYOUTS) {
      it(`${file} kukanı təmizləyən qaçış yolunu işlədir`, () => {
        const source = readFileSync(resolve(process.cwd(), file), "utf8");
        // Şərhlər çıxarılır — həmin fayllarda məhz bu tələni izah edən
        // "`redirect(LOGIN_PATH)` YAZMA" qeydi var və o, KODUN özü deyil.
        const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

        expect(code).toContain("SESSION_EXPIRED_PATH");
        expect(
          code.includes("redirect(LOGIN_PATH)"),
          "sessiya kukisi yerində qalarkən /login-ə yönləndirmək dövrə yaradır",
        ).toBe(false);
      });
    }
  });

  it("auth səhifələrinin hədəfi HEÇ VAXT auth səhifəsi deyil", () => {
    for (const authPath of ["/login", "/register"]) {
      for (const kind of VIEWER_KINDS) {
        const target = routeRedirectTarget(authPath, "", kind);
        if (!target) continue;
        expect(isAuthRoute(splitTarget(target).pathname), `${authPath} → ${target}`).toBe(
          false,
        );
      }
    }
  });
});

describe("safeCallbackUrl", () => {
  it("boş dəyər defolt yola düşür", () => {
    expect(safeCallbackUrl(null)).toBe("/home");
    expect(safeCallbackUrl("")).toBe("/home");
  });

  it("🔒 açıq yönləndirmə bloklanır", () => {
    expect(safeCallbackUrl("https://evil.example.com")).toBe("/home");
    expect(safeCallbackUrl("//evil.example.com")).toBe("/home");
  });

  it("eyni sayt daxilindəki yol saxlanılır", () => {
    expect(safeCallbackUrl("/events/evt-1")).toBe("/events/evt-1");
    expect(safeCallbackUrl("/class/sec2023/events?scope=REUNION")).toBe(
      "/class/sec2023/events?scope=REUNION",
    );
  });
});
