// ============================================================================
// src/lib/notification-links.test.ts
// 🔴 «404 verən link göstərmə» qaydasının qoruyucusu.
//
// `Notification.url` bildiriş YARADILARKƏN yazılır — sətir ölüdür və route
// xəritəsi sonra dəyişə bilər. Blok 11A-dan əvvəl seed-də `/feed/<id>`,
// `/achievements/<id>` və `/directory/<id>` vardı; heç biri mövcud route
// DEYİL. Məlumat düzəldildi, amma OXU tərəfindəki qoruma da qalmalıdır:
// istehsalda yaranmış köhnə sətir yenə 404-ə aparardı.
// ============================================================================

import { describe, expect, it } from "vitest";

import { isKnownNotificationUrl, safeNotificationUrl } from "./notification-links";

describe("tanınan ünvanlar", () => {
  const KNOWN = [
    "/home",
    "/notifications",
    "/search",
    "/me",
    "/me/privacy",
    "/me/career",
    "/u/usr-042",
    "/events/evt-01",
    "/class/informasiya-tehlukesizliyi-2027",
    "/class/informasiya-tehlukesizliyi-2027/feed",
    "/class/informasiya-tehlukesizliyi-2027/achievements",
    "/class/informasiya-tehlukesizliyi-2027/memories",
    "/class/informasiya-tehlukesizliyi-2027/map",
    "/admin",
    "/admin/moderation",
    "/khankendi",
    "/khankendi/gpl-01",
    "/faculties/muhendislik",
  ];

  it.each(KNOWN)("%s linkə çevrilir", (url) => {
    expect(isKnownNotificationUrl(url)).toBe(true);
    expect(safeNotificationUrl(url)).toBe(url);
  });
});

describe("🔴 mövcud olmayan route linkə çevrilmir", () => {
  // Blok 11A-dan ƏVVƏLKİ seed dəyərləri — məhz bunlar 404 verirdi.
  const DEAD = ["/feed/pst-001", "/achievements/ach-001", "/directory/usr-042"];

  it.each(DEAD)("%s (köhnə seed forması) link DEYİL", (url) => {
    expect(isKnownNotificationUrl(url)).toBe(false);
    expect(safeNotificationUrl(url)).toBeNull();
  });

  it("naməlum sinif alt-səhifəsi də kəsilir", () => {
    expect(isKnownNotificationUrl("/class/sec2023/qeyri-mövcud")).toBe(false);
  });
});

describe("🔒 açıq yönləndirmə bloklanır", () => {
  it("xarici ünvan qəbul edilmir", () => {
    expect(isKnownNotificationUrl("https://evil.example.com")).toBe(false);
    // Protokolsuz ünvan — `//host` XARİCİDİR, sayt daxili yol deyil.
    expect(isKnownNotificationUrl("//evil.example.com")).toBe(false);
    expect(isKnownNotificationUrl("javascript:alert(1)")).toBe(false);
  });

  it("nisbi yol qəbul edilmir (yalnız mütləq)", () => {
    expect(isKnownNotificationUrl("home")).toBe(false);
    expect(isKnownNotificationUrl("../admin")).toBe(false);
  });

  it("boş dəyər `null` verir", () => {
    expect(isKnownNotificationUrl(null)).toBe(false);
    expect(isKnownNotificationUrl(undefined)).toBe(false);
    expect(safeNotificationUrl("")).toBeNull();
  });
});
