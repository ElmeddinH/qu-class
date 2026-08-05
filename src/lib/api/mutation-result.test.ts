// ============================================================================
// src/lib/api/mutation-result.test.ts
// Xəta xəritəsinin TAM ƏHATƏSİ və MƏXFİLİK qərarları.
//
// 🔴 NİYƏ BU TEST, HALBUKİ `satisfies` ONSUZ DA VAR:
// `satisfies` yalnız AÇARIN mövcudluğunu yoxlayır — yeni `reason` əlavə edən
// adam onu xəritəyə yazmağa məcburdur, AMMA nə yazdığına baxan yoxdur.
// «Kompilyasiya keçsin» deyə `FORBIDDEN`-ə 403 yazmaq bir saniyəlik işdir və
// həmin an mövcudluq orakulu açılır. Bu fayl STATUSLARI bərkidir, yəni qərarı
// dəyişmək üçün adam testi də dəyişməli olur — və orada səbəbi oxuyur.
//
// ⚠️ Səbəb siyahısı BURADA da təkrar yazılmır: `MUTATION_ERROR_MAP`-ın
// açarlarından oxunur. Xəritə boşalsa test də susardı, ona görə say aşağıda
// ayrıca yoxlanılır.
// ============================================================================

import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, DEFAULT_ERROR_STATUS } from "./errors";
import {
  MUTATION_ERROR_MAP,
  failMutation,
  type MutationErrorMapping,
  type MutationFailureReason,
} from "./mutation-result";

const REASONS = Object.keys(MUTATION_ERROR_MAP) as MutationFailureReason[];

/** `failMutation` cavabının statusu və gövdəsi. */
async function respond(reason: MutationFailureReason) {
  const response = failMutation(reason);
  const body = (await response.json()) as {
    error: { code: string; message: string };
  };

  return { status: response.status, ...body.error };
}

describe("xəritənin bütövlüyü", () => {
  it("üç servisin BÜTÜN səbəbləri əhatə olunub", () => {
    // Say `post` (5) + `memory` (2 yeni) + `event` (4 yeni) + RSVP (3) = 13.
    // ⚠️ Rəqəm sabit gözləmədir: servisə yeni `reason` əlavə edən adam əvvəl
    // `satisfies`-dən, sonra bu testdən keçir və hər ikisində qərar verməli olur.
    expect(REASONS).toHaveLength(13);
  });

  it("hər səbəbin TANINAN xəta kodu var", () => {
    for (const reason of REASONS) {
      expect(API_ERROR_CODES, reason).toContain(MUTATION_ERROR_MAP[reason].code);
    }
  });

  it("hər səbəbin azərbaycanca mesajı var", () => {
    for (const reason of REASONS) {
      const message = MUTATION_ERROR_MAP[reason].message;
      expect(message.length, reason).toBeGreaterThan(10);
      // Mətn cümlə kimi bitir — `reason` sabitinin özü sızmasın.
      expect(message, reason).not.toContain(reason);
    }
  });

  it("status yalnız DEFAULT-dan fərqli olanda açıq yazılıb", () => {
    for (const reason of REASONS) {
      // ⚠️ Açıq annotasiya lazımdır: `satisfies` literal tipləri saxlayır, yəni
      // `status`-suz sətirlərdə həmin sahə TİPDƏ ÜMUMİYYƏTLƏ yoxdur.
      const mapping: MutationErrorMapping = MUTATION_ERROR_MAP[reason];
      if (mapping.status === undefined) continue;

      expect(
        mapping.status,
        `«${reason}» üçün açıq status kodun default-u ilə eynidir — sətir artıqdır`,
      ).not.toBe(DEFAULT_ERROR_STATUS[mapping.code]);
    }
  });
});

// ---------------------------------------------------------------------------
// 🔴 Məxfilik qərarları — hər biri ayrıca bərkidilir
// ---------------------------------------------------------------------------

describe("görünürlük qapısı → 404", () => {
  it("🔴 `NOT_A_MEMBER` 404 verir, 403 YOX", async () => {
    // 403 «bu sinif var, amma sən üzv deyilsən» deməkdir və slug sıralayan
    // hücumçuya real sinifləri siyahılamağa imkan verər.
    expect(await respond("NOT_A_MEMBER")).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("🔴 `NOT_A_MEMBER` mesajı ÜZVLÜKDƏN danışmır", async () => {
    // Status 404 deyirsə, mətn «üzv deyilsiniz» deyə bilməz — birlikdə
    // oxunanda sinfin mövcudluğu təsdiqlənərdi.
    const { message } = await respond("NOT_A_MEMBER");
    expect(message.toLowerCase()).not.toContain("üzv");
  });

  it("`NOT_FOUND` 404 verir", async () => {
    expect(await respond("NOT_FOUND")).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("sahiblik qapısı → 403", () => {
  it("`FORBIDDEN` 403 verir", async () => {
    // ⚠️ Bu, YALNIZ route görünürlük qapısından (məs. `getPost`) keçdikdən
    // sonra təhlükəsizdir — bax `posts/[id]/route.ts` başlığı. Qapısız
    // route-da eyni xəritə sızma yaradar.
    expect(await respond("FORBIDDEN")).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});

describe("gövdənin qüsurları → 422", () => {
  const bodyReasons = [
    "EVENT_NOT_FOUND",
    "ACHIEVEMENT_DETAILS_REQUIRED",
    "PLACE_NOT_FOUND",
    "TIMELINE_REQUIRES_FEED",
    "COHORT_REQUIRED",
    "FACULTY_REQUIRED",
    "INVALID_DATES",
  ] as const;

  it.each(bodyReasons)("%s → 422 VALIDATION_FAILED", async (reason) => {
    expect(await respond(reason)).toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED",
    });
  });

  it("🔴 `EVENT_NOT_FOUND` 404 DEYİL — ünvanlanan resurs yox, GÖVDƏ qüsurludur", async () => {
    // 404 olsaydı müştəri «paylaşım tapılmadı» deyə anlayardı; əslində
    // `referencedEventId` sahəsi səhvdir.
    const { status } = await respond("EVENT_NOT_FOUND");
    expect(status).not.toBe(404);
  });
});

describe("resursun vəziyyəti → 409", () => {
  const stateReasons = ["EVENT_CLOSED", "REGISTRATION_CLOSED", "EVENT_FINISHED"] as const;

  it.each(stateReasons)("%s → 409", async (reason) => {
    // Gövdə düzgündür, RESURSUN VƏZİYYƏTİ imkan vermir.
    expect((await respond(reason)).status).toBe(409);
  });

  it("🔴 kod `VALIDATION_FAILED`-dir — yeni `CONFLICT` kodu ƏLAVƏ EDİLMƏDİ", () => {
    // Layihədə 409 üçün artıq nümunə var: `auth/register` təkrar e-poçtda
    // `fail("VALIDATION_FAILED", { status: 409 })` qaytarır. İkinci kod eyni
    // statusa iki maşın-oxunan ad verərdi və köhnə müştərilər birini gözləməyə
    // davam edərdi.
    for (const reason of stateReasons) {
      expect(MUTATION_ERROR_MAP[reason].code).toBe("VALIDATION_FAILED");
    }
    expect(API_ERROR_CODES as readonly string[]).not.toContain("CONFLICT");
  });
});

describe("failMutation", () => {
  it("cavab vahid xəta ZƏRFİNDƏDİR", async () => {
    const response = failMutation("NOT_FOUND");
    const body = (await response.json()) as Record<string, unknown>;

    expect(Object.keys(body)).toEqual(["error"]);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("heç bir səbəb 500 vermir — hamısı müştəri xətasıdır", async () => {
    // Səssiz 500 məhz bu xəritənin qarşısını aldığı nasazlıqdır.
    for (const reason of REASONS) {
      expect(failMutation(reason).status, reason).toBeLessThan(500);
    }
  });
});
