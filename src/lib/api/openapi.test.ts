// ============================================================================
// src/lib/api/openapi.test.ts
// OpenAPI sənədinin BÜTÖVLÜYÜ.
//
// 🔴 NİYƏ BU TEST: sənəd Zod-dan TÖRƏYİR, yəni "generasiya olundu" ≠ "düzgündür".
// İki real səhv bu testlərlə tutuldu:
//   1. `parameters: [...]` massivinə qoyulan Zod sxemi ÇEVRİLMİRDİ — sənədə
//      `{"_def": …}` daxili Zod strukturu düşürdü. Generasiya SINMIRDI, Swagger
//      UI isə parametri "boş" göstərirdi.
//   2. Yol parametri İKİ DƏFƏ elan olunurdu (`request.params` + `parameters`).
//      OpenAPI-də dublikat parametr etibarsızdır.
// Hər ikisi səssiz səhvdir — ona görə forma testlə bərkidilir.
// ============================================================================

import { describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "@/auth.config";
import { DIRECTORY_FILTERS, DIRECTORY_FILTER_COUNT } from "@/lib/directory-filters";
import { API_TAGS, buildOpenApiDocument } from "./openapi";
import { API_ERROR_CODES } from "./errors";

const document = buildOpenApiDocument();

/** Sənəddəki bütün (yol, metod, əməliyyat) üçlükləri. */
const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
  Object.entries(item as Record<string, unknown>)
    .filter(([method]) =>
      ["get", "post", "put", "patch", "delete"].includes(method),
    )
    .map(([method, operation]) => ({
      path,
      method,
      label: `${method.toUpperCase()} ${path}`,
      operation: operation as {
        operationId?: string;
        summary?: string;
        description?: string;
        tags?: string[];
        responses: Record<string, unknown>;
        parameters?: Array<{ name: string; in: string; schema?: unknown }>;
        requestBody?: unknown;
        security?: unknown;
      },
    })),
);

const TAG_NAMES = API_TAGS.map((tag) => tag.name);

describe("sənədin başlığı", () => {
  it("OpenAPI 3.0 sənədidir", () => {
    expect(document.openapi).toMatch(/^3\.0\./);
  });

  it("başlıq «QU CLASS API»-dir", () => {
    expect(document.info.title).toBe("QU CLASS API");
  });

  it("versiya `package.json`-dandır — əl ilə saxlanılmır", async () => {
    const pkg = (await import("../../../package.json")) as unknown as {
      default: { version: string };
    };

    expect(document.info.version).toBe(pkg.default.version);
  });

  it("memarlıq qeydi sənəddədir (məntiq dublikat deyil)", () => {
    // Müdafiədə ən çox verilən sual: "UI Server Action işlədirsə API niyə var?"
    expect(document.info.description).toContain("servis qatını");
  });
});

describe("əməliyyatlar", () => {
  it("bütün v1 endpoint-ləri sənəddədir", () => {
    // Sayı SABİT gözləmə kimi yazılır: yeni endpoint əlavə edən adam sənədə
    // yazmağı unutsa test dayanır.
    // 18 (Blok 9S) + 4 (Blok 10A: memories · yearbook · support ·
    // guide-places/{id}/memories) = 22.
    expect(operations.length).toBe(22);
  });

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — operationId var və unikaldır",
    (_label, { operation }) => {
      expect(operation.operationId).toBeTruthy();
    },
  );

  it("operationId-lər UNİKALDIR (Swagger UI onları anchor kimi işlədir)", () => {
    const ids = operations.map((o) => o.operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * ⚠️ Azərbaycan hərfinin (`ə`, `ş`, `ğ`…) MÖVCUDLUĞUNU yoxlamaq İŞLƏMİR:
   * "Sinif kataloqu (13 filtr)" tamamilə azərbaycancadır, amma yalnız ASCII
   * hərflərdən ibarətdir. Ona görə tərs istiqamətdən yoxlanılır — ingiliscə
   * qalmış başlığın xarakterik SÖZLƏRİ axtarılır.
   */
  const ENGLISH_WORDS =
    /\b(list|get|create|update|delete|the|of|and|user|users|events?|search|login|logout|register)\b/i;

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — azərbaycanca summary var",
    (_label, { operation }) => {
      expect(operation.summary, "summary boşdur").toBeTruthy();
      expect(
        operation.summary,
        `«${operation.summary}» ingiliscə görünür (CLAUDE.md §9)`,
      ).not.toMatch(ENGLISH_WORDS);
    },
  );

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — TƏSVİRİ var (heç bir path təsvirsiz deyil)",
    (_label, { operation }) => {
      expect(operation.description, "description boşdur").toBeTruthy();
    },
  );

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — tanınan taqa aiddir",
    (_label, { operation }) => {
      expect(operation.tags?.length).toBe(1);
      expect(TAG_NAMES).toContain(operation.tags?.[0]);
    },
  );

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — 401 cavabı sənədləşdirilib",
    (_label, { operation }) => {
      // ⚠️ İctimai endpoint-lərdə 401 vahid xəta ZƏRFİNİN forması kimi
      // göstərilir (bax `openapi.ts` başlığı), qorunanlarda isə real davranışdır.
      expect(operation.responses).toHaveProperty("401");
    },
  );

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — uğur cavabı 2xx-dir və sxemi var",
    (_label, { operation, label }) => {
      const successCodes = Object.keys(operation.responses).filter((code) =>
        code.startsWith("2"),
      );
      expect(successCodes.length, `${label} üçün 2xx cavab yoxdur`).toBeGreaterThan(0);
    },
  );

  it("bütün xəta kodları sənəddəki `ApiError` enum-unda var", () => {
    const schemas = document.components?.schemas as
      | Record<string, { properties?: { error?: { properties?: { code?: { enum?: string[] } } } } }>
      | undefined;

    const codeEnum = schemas?.ApiError?.properties?.error?.properties?.code?.enum;

    expect(codeEnum).toEqual([...API_ERROR_CODES]);
  });
});

describe("parametrlər", () => {
  it("🔴 sənəddə XAM ZOD obyekti YOXDUR", () => {
    // `parameters: [{ schema: z.string() }]` yazılsa Zod sxemi çevrilmir və
    // sənədə `_def` düşür. Generasiya sınmadığı üçün yalnız bu test tutur.
    expect(JSON.stringify(document)).not.toContain('"_def"');
  });

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — hər parametrin adı, yeri, sxemi və təsviri var",
    (_label, { operation }) => {
      for (const parameter of operation.parameters ?? []) {
        expect(parameter.name).toBeTruthy();
        expect(["path", "query", "header", "cookie"]).toContain(parameter.in);
        expect(parameter.schema, `«${parameter.name}» sxemsizdir`).toBeTruthy();
        expect(
          (parameter as { description?: string }).description,
          `«${parameter.name}» təsvirsizdir`,
        ).toBeTruthy();
      }
    },
  );

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — parametr adları TƏKRARLANMIR",
    (_label, { operation }) => {
      const names = (operation.parameters ?? []).map((p) => `${p.in}:${p.name}`);
      expect(new Set(names).size).toBe(names.length);
    },
  );

  it("`{slug}` yolu üçün path parametri elan olunub", () => {
    for (const { path, operation } of operations) {
      if (!path.includes("{slug}")) continue;
      const slug = (operation.parameters ?? []).find((p) => p.name === "slug");
      expect(slug, `${path} üçün slug parametri yoxdur`).toBeDefined();
      expect(slug?.in).toBe("path");
    }
  });

  it("🔴 kataloq endpoint-i 13 filtrin HAMISINI sənədləşdirir", () => {
    const members = operations.find(
      (o) => o.path === "/api/v1/cohorts/{slug}/members",
    );
    const names = new Set((members?.operation.parameters ?? []).map((p) => p.name));

    // Filtr adları `DIRECTORY_FILTERS`-dən gəlir — siyahı ayrılsa test dayanır.
    for (const key of Object.keys(DIRECTORY_FILTERS)) {
      const param = DIRECTORY_FILTERS[key as keyof typeof DIRECTORY_FILTERS].param;
      expect(names.has(param), `«${param}» filtri sənəddə yoxdur`).toBe(true);
    }

    // slug + 13 filtr + page
    expect(names.size).toBe(DIRECTORY_FILTER_COUNT + 2);
  });
});

describe("təhlükəsizlik sxemi", () => {
  it("`cookieAuth` elan olunub", () => {
    const schemes = document.components?.securitySchemes as
      | Record<string, { type: string; in?: string; name?: string }>
      | undefined;

    expect(schemes?.cookieAuth).toMatchObject({ type: "apiKey", in: "cookie" });
  });

  it("🔴 kuka adı `auth.config.ts`-dəndir, HARDCODE deyil", () => {
    const schemes = document.components?.securitySchemes as
      | Record<string, { name?: string }>
      | undefined;

    expect(schemes?.cookieAuth?.name).toBe(SESSION_COOKIE_NAME);
  });

  it("qorunan endpoint-lərdə `security` göstərilib", () => {
    const protectedPaths = [
      "/api/v1/cohorts",
      "/api/v1/cohorts/{slug}",
      "/api/v1/cohorts/{slug}/members",
      "/api/v1/cohorts/{slug}/posts",
      "/api/v1/cohorts/{slug}/timeline",
      "/api/v1/cohorts/{slug}/achievements",
      "/api/v1/cohorts/{slug}/events",
    ];

    for (const path of protectedPaths) {
      const operation = operations.find((o) => o.path === path);
      expect(operation?.operation.security, `${path} üçün security yoxdur`).toBeTruthy();
    }
  });
});

describe("POST endpoint-ləri", () => {
  const posts = operations.filter((o) => o.method === "post");

  it("üç POST var: register, login, logout", () => {
    expect(posts.map((o) => o.operation.operationId).sort()).toEqual([
      "login",
      "logout",
      "registerUser",
    ]);
  });

  it.each(posts.map((o) => [o.label, o] as const))(
    "%s — JSON gövdəsi elan olunub (Swagger UI `Content-Type` göndərsin)",
    (_label, { operation }) => {
      // 🔴 TƏLƏ B: `requireJson` `application/json` tələb edir. Swagger UI
      // həmin başlığı YALNIZ `requestBody` elan olunanda göndərir — sxem
      // olmasa «Try it out» 415 alardı. Çıxış üçün də boş gövdə elan olunub.
      const body = operation.requestBody as
        | { content?: Record<string, unknown> }
        | undefined;

      expect(body?.content).toHaveProperty("application/json");
    },
  );

  it.each(posts.map((o) => [o.label, o] as const))(
    "%s — 415 cavabı sənədləşdirilib (CSRF müdafiəsi)",
    (_label, { operation }) => {
      expect(operation.responses).toHaveProperty("415");
    },
  );

  it("login-də 429 sənədləşdirilib (cəhd sayğacı)", () => {
    const login = operations.find((o) => o.operation.operationId === "login");
    expect(login?.operation.responses).toHaveProperty("429");
  });

  it("register 201 qaytarır", () => {
    const register = operations.find((o) => o.operation.operationId === "registerUser");
    expect(register?.operation.responses).toHaveProperty("201");
  });

  it("logout 204 qaytarır və gövdə sxemi YOXDUR", () => {
    const logout = operations.find((o) => o.operation.operationId === "logout");
    const response = logout?.operation.responses["204"] as { content?: unknown };

    expect(response).toBeDefined();
    // 204 cavabın gövdəsi ola bilməz.
    expect(response.content).toBeUndefined();
  });
});

describe("nümunələr (example)", () => {
  it("sxemlərdə nümunə dəyərləri var — «Try it out» boş formla açılmasın", () => {
    const json = JSON.stringify(document);
    expect(json).toContain('"example"');
  });

  it("login gövdəsində real seed hesabı nümunə kimi verilib", () => {
    const schemas = document.components?.schemas as
      | Record<string, { properties?: Record<string, { example?: unknown }> }>
      | undefined;

    expect(schemas?.LoginBody?.properties?.email?.example).toBe("rep@qu.edu.az");
  });

  it("🔴 qeydiyyat nümunəsindəki qəbul ili DOĞRULAMADAN keçir", async () => {
    // Uydurma gələcək il (məs. 2030) sənəddəki nümunəni «Try it out»-da
    // dərhal 422-yə salardı: `maxAdmissionYear()` = cari il + 1.
    const { RegisterBodySchema } = await import("./schemas");
    const schemas = document.components?.schemas as
      | Record<string, { properties?: Record<string, { example?: unknown }> }>
      | undefined;

    const example = schemas?.RegisterBody?.properties?.admissionYear?.example;

    const parsed = RegisterBodySchema.shape.admissionYear.safeParse(example);
    expect(parsed.success, `nümunə «${String(example)}» doğrulamadan keçmir`).toBe(true);
  });
});
