// ============================================================================
// src/lib/api/respond.test.ts
// Cavab zərfinin FORMASI — OpenAPI sənədi məhz bunu elan edir.
//
// 🔴 NİYƏ BU TEST: sənəd hər cavabı `{ data }` / `{ error: { code, message } }`
// kimi göstərir. Zərf pozulsa sənəd YALAN olur və müştəri kodu (Swagger
// «Try it out», mobil tətbiq) səssizcə sınır — cavab 200-dür, sadəcə forma
// başqadır. Ona görə forma testlə bərkidilir, şərhlə deyil.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  API_ERROR_CODES,
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_STATUS,
  type ApiErrorCode,
} from "./errors";
import { created, fail, forbidden, noContent, notFound, ok, unauthenticated } from "./respond";

async function bodyOf(response: Response): Promise<unknown> {
  return response.json();
}

describe("ok()", () => {
  it("200 və `{ data }` zərfi qaytarır", async () => {
    const response = ok({ id: "abc" });

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ data: { id: "abc" } });
  });

  it("`meta` VERİLMƏSƏ zərfə əlavə olunmur", async () => {
    // ⚠️ Boş `meta: {}` göndərmək müştərini çaşdırır: "səhifələmə var, amma
    // sahələr boşdur?" Sahə YA var, YA yoxdur.
    expect(await bodyOf(ok([1, 2]))).toEqual({ data: [1, 2] });
  });

  it("`meta` verilsə səhifələmə məlumatını daşıyır", async () => {
    const response = ok([{ id: "a" }], { meta: { total: 42, page: 2, pageSize: 24 } });

    expect(await bodyOf(response)).toEqual({
      data: [{ id: "a" }],
      meta: { total: 42, page: 2, pageSize: 24 },
    });
  });

  it("`nextCursor: null` zərfdə QALIR (məlumat bitdi siqnalıdır)", async () => {
    const body = (await bodyOf(ok([], { meta: { nextCursor: null } }))) as {
      meta: { nextCursor: string | null };
    };

    expect(body.meta).toHaveProperty("nextCursor", null);
  });

  it("əlavə başlıq ötürülür", () => {
    const response = ok(null, { headers: { "x-test": "1" } });
    expect(response.headers.get("x-test")).toBe("1");
  });
});

describe("created()", () => {
  it("201 qaytarır və zərfi saxlayır", async () => {
    const response = created({ userId: "usr-1" });

    expect(response.status).toBe(201);
    expect(await bodyOf(response)).toEqual({ data: { userId: "usr-1" } });
  });
});

describe("noContent()", () => {
  it("204 və BOŞ gövdə qaytarır", async () => {
    const response = noContent();

    expect(response.status).toBe(204);
    // 🔴 204 cavabın gövdəsi OLA BİLMƏZ. `NextResponse.json(null, {status:204})`
    // bəzi runtime-larda xəta atır — ona görə gövdəsiz `Response` qurulur.
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toBeNull();
  });
});

describe("fail()", () => {
  it("koda uyğun DEFAULT statusu işlədir", () => {
    expect(fail("NOT_FOUND").status).toBe(404);
    expect(fail("VALIDATION_FAILED").status).toBe(422);
    expect(fail("UNSUPPORTED_MEDIA_TYPE").status).toBe(415);
    expect(fail("TOO_MANY_REQUESTS").status).toBe(429);
  });

  it("`{ error: { code, message } }` forması", async () => {
    expect(await bodyOf(fail("FORBIDDEN"))).toEqual({
      error: { code: "FORBIDDEN", message: DEFAULT_ERROR_MESSAGE.FORBIDDEN },
    });
  });

  it("mesaj əvəz edilə bilir, kod DƏYİŞMİR", async () => {
    const body = (await bodyOf(
      fail("UNAUTHENTICATED", { message: "E-poçt və ya şifrə yanlışdır." }),
    )) as { error: { code: string; message: string } };

    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("E-poçt və ya şifrə yanlışdır.");
  });

  it("`details` YALNIZ verildikdə mövcud olur", async () => {
    const without = (await bodyOf(fail("VALIDATION_FAILED"))) as { error: object };
    expect(without.error).not.toHaveProperty("details");

    const withDetails = (await bodyOf(
      fail("VALIDATION_FAILED", { details: [{ path: "email", message: "səhv" }] }),
    )) as { error: { details: unknown } };
    expect(withDetails.error.details).toEqual([{ path: "email", message: "səhv" }]);
  });

  it("status açıq şəkildə üstələnə bilir (409 — e-poçt toqquşması)", () => {
    expect(fail("VALIDATION_FAILED", { status: 409 }).status).toBe(409);
  });

  it("`Retry-After` başlığı ötürülür (429)", () => {
    const response = fail("TOO_MANY_REQUESTS", { headers: { "retry-after": "600" } });
    expect(response.headers.get("retry-after")).toBe("600");
  });
});

describe("qısayollar", () => {
  it("`unauthenticated()` → 401", () => {
    expect(unauthenticated().status).toBe(401);
  });

  it("🔴 `notFound()` → 404 — icazəsiz resurs üçün DƏ məhz bu işlədilir", async () => {
    // Mövcudluq faktı özü də məlumatdır: 403 cavabı "bu resurs var" deyərdi.
    const response = notFound();
    expect(response.status).toBe(404);
    expect((await bodyOf(response)) as { error: { code: string } }).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });

  it("`forbidden()` → 403 (yalnız ROL qapıları üçün)", () => {
    expect(forbidden().status).toBe(403);
  });
});

describe("errors.ts — Record tipinin əhatəsi", () => {
  it("HƏR kod üçün status var", () => {
    for (const code of API_ERROR_CODES) {
      expect(DEFAULT_ERROR_STATUS[code], `«${code}» statusu`).toBeTypeOf("number");
    }
    // Cədvəldə ARTIQ açar da olmamalıdır.
    expect(Object.keys(DEFAULT_ERROR_STATUS).sort()).toEqual([...API_ERROR_CODES].sort());
  });

  it("HƏR kod üçün azərbaycanca mesaj var", () => {
    for (const code of API_ERROR_CODES) {
      const message = DEFAULT_ERROR_MESSAGE[code];
      expect(message, `«${code}» mesajı`).toBeTruthy();
      // Latın hərfləri ilə yazılıb, amma azərbaycanca cümlə olmalıdır —
      // ən azı bir azərbaycan hərfi / söz sonluğu gözlənilir.
      expect(message).toMatch(/[əöüğışçİ]/);
    }
    expect(Object.keys(DEFAULT_ERROR_MESSAGE).sort()).toEqual([...API_ERROR_CODES].sort());
  });

  it("statuslar HTTP diapazonundadır və məntiqə uyğundur", () => {
    const expected: Record<ApiErrorCode, number> = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      VALIDATION_FAILED: 422,
      UNSUPPORTED_MEDIA_TYPE: 415,
      TOO_MANY_REQUESTS: 429,
      INTERNAL: 500,
    };

    expect(DEFAULT_ERROR_STATUS).toEqual(expected);
  });
});
