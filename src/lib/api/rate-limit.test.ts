// ============================================================================
// src/lib/api/rate-limit.test.ts
// Login cəhd sayğacı.
//
// ⚠️ "İndi" TESTDƏ ÖTÜRÜLÜR (`now` arqumenti), `vi.useFakeTimers()` DEYİL:
// modul `Date.now()`-u default dəyər kimi işlədir və saf funksiya kimi
// yoxlanıla bilir. Saxta taymer bütün faylı qlobal vəziyyətə bağlayardı.
//
// ⚠️ Hər testdən əvvəl `resetLoginRateLimiter()` — sayğac MODUL SƏVİYYƏSİNDƏ
// `Map`-dir və testlər arasında yaşayır (bu, məhz istehsaldakı davranışdır,
// bax modulun başlığındaki "tək proses" qeydi).
// ============================================================================

import { beforeEach, describe, expect, it } from "vitest";

import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  checkLoginRate,
  clearLoginAttempts,
  loginAttemptKey,
  recordFailedLogin,
  requestIp,
  resetLoginRateLimiter,
} from "./rate-limit";

const KEY = loginAttemptKey("rep@qu.edu.az", "127.0.0.1");
const T0 = 1_800_000_000_000;

beforeEach(() => {
  resetLoginRateLimiter();
});

describe("loginAttemptKey", () => {
  it("e-poçt VƏ IP-ni birləşdirir", () => {
    expect(loginAttemptKey("a@qu.edu.az", "10.0.0.1")).toBe("a@qu.edu.az|10.0.0.1");
  });

  it("🔴 fərqli e-poçt AYRI xanadır — NAT arxasında bir nəfər hamını bloklamasın", () => {
    const a = loginAttemptKey("a@qu.edu.az", "10.0.0.1");
    const b = loginAttemptKey("b@qu.edu.az", "10.0.0.1");

    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) recordFailedLogin(a, T0);

    expect(checkLoginRate(a, T0).allowed).toBe(false);
    expect(checkLoginRate(b, T0).allowed).toBe(true);
  });
});

describe("checkLoginRate", () => {
  it("cəhd yoxdursa icazə verir və tam limit qalır", () => {
    expect(checkLoginRate(KEY, T0)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: LOGIN_MAX_ATTEMPTS,
    });
  });

  it("sayğacı ARTIRMIR — yalnız oxuyur", () => {
    checkLoginRate(KEY, T0);
    checkLoginRate(KEY, T0);

    expect(checkLoginRate(KEY, T0).remaining).toBe(LOGIN_MAX_ATTEMPTS);
  });

  it(`${LOGIN_MAX_ATTEMPTS - 1} uğursuz cəhddən sonra HƏLƏ icazə var`, () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i += 1) recordFailedLogin(KEY, T0);

    const verdict = checkLoginRate(KEY, T0);
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBe(1);
  });

  it(`🔴 ${LOGIN_MAX_ATTEMPTS}-ci uğursuz cəhddən sonra BLOKLANIR`, () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) recordFailedLogin(KEY, T0);

    const verdict = checkLoginRate(KEY, T0);
    expect(verdict.allowed).toBe(false);
    expect(verdict.remaining).toBe(0);
    // `Retry-After` başlığı üçün — ən azı 1 saniyə.
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0);
    expect(verdict.retryAfterSeconds).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000);
  });

  it("qalan vaxt pəncərənin sonuna qədər hesablanır", () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) recordFailedLogin(KEY, T0);

    // Pəncərənin yarısı keçdi → ~5 dəqiqə qalır.
    const halfway = T0 + LOGIN_WINDOW_MS / 2;
    expect(checkLoginRate(KEY, halfway).retryAfterSeconds).toBe(LOGIN_WINDOW_MS / 2000);
  });

  it("🔴 PƏNCƏRƏ KEÇƏNDƏN SONRA sıfırlanır", () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) recordFailedLogin(KEY, T0);
    expect(checkLoginRate(KEY, T0).allowed).toBe(false);

    const afterWindow = T0 + LOGIN_WINDOW_MS + 1;
    expect(checkLoginRate(KEY, afterWindow)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
      remaining: LOGIN_MAX_ATTEMPTS,
    });
  });
});

describe("recordFailedLogin", () => {
  it("pəncərə İLK cəhddən başlayır və sonrakı cəhdlərlə UZANMIR", () => {
    // Fixed window, sliding DEYİL: əks halda hər cəhd gözləməni uzadardı və
    // düzgün şifrəni sonradan yazan istifadəçi də cəzalanardı.
    recordFailedLogin(KEY, T0);
    recordFailedLogin(KEY, T0 + LOGIN_WINDOW_MS - 1000);
    recordFailedLogin(KEY, T0 + LOGIN_WINDOW_MS - 500);
    recordFailedLogin(KEY, T0 + LOGIN_WINDOW_MS - 400);
    recordFailedLogin(KEY, T0 + LOGIN_WINDOW_MS - 300);

    expect(checkLoginRate(KEY, T0 + LOGIN_WINDOW_MS - 200).allowed).toBe(false);
    // İlk cəhddən 10 dəqiqə sonra — pəncərə bitib.
    expect(checkLoginRate(KEY, T0 + LOGIN_WINDOW_MS + 1).allowed).toBe(true);
  });

  it("pəncərə bitmiş xanaya yazanda YENİ pəncərə açır", () => {
    recordFailedLogin(KEY, T0);
    recordFailedLogin(KEY, T0 + LOGIN_WINDOW_MS + 1);

    const verdict = checkLoginRate(KEY, T0 + LOGIN_WINDOW_MS + 2);
    expect(verdict.remaining).toBe(LOGIN_MAX_ATTEMPTS - 1);
  });
});

describe("clearLoginAttempts", () => {
  it("🔴 UĞURLU giriş sayğacı silir — düzgün şifrə cəzalandırılmır", () => {
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i += 1) recordFailedLogin(KEY, T0);

    clearLoginAttempts(KEY);

    expect(checkLoginRate(KEY, T0).remaining).toBe(LOGIN_MAX_ATTEMPTS);
  });
});

describe("requestIp", () => {
  it("`x-forwarded-for`-un İLK dəyərini götürür (proxy zənciri)", () => {
    const request = new Request("http://localhost/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" },
    });

    expect(requestIp(request)).toBe("203.0.113.7");
  });

  it("`x-real-ip`-ə düşür", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.4" },
    });

    expect(requestIp(request)).toBe("198.51.100.4");
  });

  it("başlıq yoxdursa «unknown» qaytarır (sayğac yenə işləyir)", () => {
    expect(requestIp(new Request("http://localhost/"))).toBe("unknown");
  });

  it("boş `x-forwarded-for` `x-real-ip`-i bloklamır", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "", "x-real-ip": "198.51.100.9" },
    });

    expect(requestIp(request)).toBe("198.51.100.9");
  });
});
