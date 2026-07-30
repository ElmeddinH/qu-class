// ============================================================================
// src/lib/consent.test.ts
// 🔴 TƏLƏ E-nin qoruyucusu: razılıq KUKİDƏ saxlanılır, `localStorage`-da YOX.
//
// Bu fayl iki şeyi bərkidir:
//   1. OXU tərəfi — razılıq verilmiş dəyər «qərar var» sayılır, naməlum dəyər
//      isə YOX (banner yenidən göstərilir, amma səhv seçimlə deyil);
//   2. YAZI tərəfi — kuka sətrinin atributları (`SameSite`, `max-age`, `path`)
//      və `Secure` bayrağının PROTOKOLDAN törəməsi.
//
// İkincisi ən vacibidir: `localhost`-da (http) `Secure` kuka brauzer tərəfindən
// SƏSSİZCƏ atılır — banner heç vaxt bağlanmazdı və e2e testi məhz http üzərində
// işləyir.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VALUES,
  allowsAnalytics,
  consentCookieString,
  hasConsentDecision,
  parseConsent,
} from "./consent";

describe("parseConsent", () => {
  it("məlum dəyərləri qəbul edir", () => {
    expect(parseConsent("all")).toBe("all");
    expect(parseConsent("necessary")).toBe("necessary");
  });

  it("boşluqlar kəsilir", () => {
    expect(parseConsent("  all  ")).toBe("all");
  });

  it("🔴 naməlum / boş dəyər `null` verir — banner yenidən göstərilir", () => {
    // Kuka əl ilə dəyişdirilə bilər. Naməlum dəyəri "razılıq var" saymaq
    // istifadəçinin heç vaxt vermədiyi razılığı uydurmaq olardı.
    expect(parseConsent("hamısı")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
  });

  it("bütün elan olunan dəyərlər parse olunur", () => {
    for (const value of CONSENT_VALUES) {
      expect(parseConsent(value), value).toBe(value);
    }
  });
});

describe("hasConsentDecision", () => {
  it("qərar varsa `true`, yoxdursa `false`", () => {
    expect(hasConsentDecision("all")).toBe(true);
    expect(hasConsentDecision("necessary")).toBe(true);
    expect(hasConsentDecision(undefined)).toBe(false);
  });
});

describe("allowsAnalytics", () => {
  it("yalnız `all` analitikaya icazə verir", () => {
    expect(allowsAnalytics("all")).toBe(true);
    // «Rədd et» = yalnız zəruri — analitika QAPALIDIR.
    expect(allowsAnalytics("necessary")).toBe(false);
    expect(allowsAnalytics(null)).toBe(false);
  });
});

describe("consentCookieString", () => {
  it("adı, yolu, müddəti və SameSite-i daşıyır", () => {
    const cookie = consentCookieString("all");

    expect(cookie).toContain(`${CONSENT_COOKIE_NAME}=all`);
    expect(cookie).toContain("path=/");
    expect(cookie).toContain(`max-age=${CONSENT_MAX_AGE_SECONDS}`);
    expect(cookie).toContain("SameSite=Lax");
  });

  it("müddət bir ildir", () => {
    expect(CONSENT_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 365);
  });

  it("🔴 `Secure` YALNIZ HTTPS-də əlavə olunur", () => {
    // http-də `Secure` kuka atılır → banner bağlanmazdı (e2e http-dədir).
    expect(consentCookieString("all", { secure: false })).not.toContain("Secure");
    expect(consentCookieString("all")).not.toContain("Secure");
    expect(consentCookieString("all", { secure: true })).toContain("Secure");
  });

  it("🔴 kukada istifadəçi identifikatoru YOXDUR", () => {
    // Razılıq kukisinin özü izləyici olsaydı ziddiyyət yaranardı.
    const cookie = consentCookieString("necessary", { secure: true });
    const value = cookie.split(";")[0].split("=")[1];

    expect(CONSENT_VALUES as readonly string[]).toContain(value);
  });

  it("yazılan dəyər geri OXUNA bilir (dövrə)", () => {
    for (const value of CONSENT_VALUES) {
      const raw = consentCookieString(value).split(";")[0].split("=")[1];
      expect(parseConsent(raw), value).toBe(value);
    }
  });
});
