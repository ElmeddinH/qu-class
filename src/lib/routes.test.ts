// ============================================================================
// src/lib/routes.test.ts
// Route qorunması — xüsusən `/events` bölünməsi (Blok 9).
//
// 🔴 NİYƏ MƏHZ BU TESTLƏR: `/events` İKİ route qrupuna bölünüb —
// `(public)/events` (ictimai siyahı) və `(app)/events/[id]` (detal + panel).
// Route qrupu URL-də görünmür, yəni middleware ikisini yalnız yola baxaraq
// ayırd edir. Prefiks uyğunluğu (`startsWith`) təkbaşına işlədilsəydi ictimai
// siyahı auth arxasına düşərdi və Blok 11-də bu, "niyə welcome page-dən
// tədbirlərə keçid /login-ə atır?" şəklində üzə çıxardı.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  APP_ROUTE_PREFIXES,
  PUBLIC_EXACT_PATHS,
  isAdminRoute,
  isAppRoute,
  isAuthRoute,
  isProtectedRoute,
  isPublicExactPath,
  safeCallbackUrl,
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
