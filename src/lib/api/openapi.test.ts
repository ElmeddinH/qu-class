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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

/**
 * `/api/v1` altındaki əməliyyatlar — v1-in VAHİD müqaviləsinə (zərf, 401
 * forması, JSON gövdə + 415) bağlı testlər BUNUN üzərində işləyir.
 *
 * 🔴 `/api/upload` və `.../ics` bu siyahıda YOXDUR: onlar v1 zərfindən
 * keçmir (bax `openapi.ts` → "Media" / "Events — təqvim ixracı" bölmələri) və
 * v1-ə xas qaydaları onlara tətbiq etmək sənədi YALAN edərdi.
 *
 * ⚠️ `GET /api/v1/openapi.json` isə BU siyahıdadır və 401/415 qaydalarına
 * tabedir, LAKİN cavab gövdəsi zərfsizdir — sənədin özünü `{ data }`-ya
 * salmaq onu maşınla oxunmaz edərdi. Zərf üçün ayrıca qapı YOXDUR (heç bir
 * test bütün v1 200-lərindən `{ data }` tələb etmir), ona görə bu istisna
 * mövcud qoruyucuları zəiflətmir.
 */
const v1Operations = operations.filter((o) => o.path.startsWith("/api/v1"));

const TAG_NAMES = API_TAGS.map((tag) => tag.name);

// ---------------------------------------------------------------------------
// AĞ SİYAHI — `src/app/api` altındaki BÜTÜN route-lar
//
// `src/app/api` altında tapılan HƏR route ya sənəddə OLMALIDIR, ya da bu
// siyahıda SƏBƏBLƏ yer almalıdır. Yeni route əlavə olunanda test AŞIR —
// müəllif ya sənədə salır, ya buraya səbəblə yazır.
//
// 🔴 KOR NÖQTƏNİN BAĞLANIŞI (Sprint 3/4 auditi §5.3). Gəzici əvvəl
// `/api/v1`-i İSTİSNA EDİRDİ, yəni qoruyucu məhz ictimai müqavilənin
// yaşadığı yerə BAXMIRDI: yeni `/api/v1/...` route əlavə edən adam sənədə
// heç nə yazmasa test YAŞIL qalırdı. Audit bunu belə tutdu —
// `GET /api/v1/openapi.json` 53 əməliyyatdan yeganə elan edilməmişi idi və
// heç bir test bundan şikayət etmirdi. Filtr GÖTÜRÜLDÜ; həmin əməliyyat
// `openapi.ts` → «System» bölməsində sənədləşdirildi.
// ---------------------------------------------------------------------------

/**
 * Sənədə salınmayan daxili route-lar. Hər sətrin səbəbi
 * `docs/ARCHITECTURE.md` § "Sənədə salınmayan daxili route-lar"da da var —
 * ikisi eyni qərarın iki üzüdür (kod ↔ nəsr).
 */
const UNDOCUMENTED_ROUTE_WHITELIST: Record<string, string> = {
  "/api/feed": "UI müqaviləsi (FeedList → useInfiniteQuery); sənədlənmiş qarşılıq /api/v1/cohorts/{slug}/posts (TƏLƏ F).",
  "/api/search": "UI müqaviləsi (⌘K palitrası); sənədlənmiş qarşılıq /api/v1/search (TƏLƏ F).",
  "/api/session/expired": "Auth.js yönləndirmə dövrəsini kəsən daxili qaçış yolu — brauzer naviqasiyası ilə çağırılır, JSON müştərisi yoxdur.",
  "/api/auth/[...nextauth]":
    "Auth.js v5-in ÖZ daxili protokolu (`handlers`-dən birbaşa) — bizim müqavilə deyil. " +
    "Segment `[...nextauth]` KATCH-ALL olduğu üçün `{param}`-a çevrilmir (bax `toRoutePath`).",
};

/** `[id]` / `[slug]` → `{id}` / `{slug}`. Catch-all seqment (`[...x]`) TOXUNULMUR. */
function toRoutePath(segments: string): string {
  return segments.replace(/\[([^.\]]+)\]/g, "{$1}");
}

/** `src/app/api` altında bütün `route.ts` fayllarının URL yolu, kök `/api`-dən. */
function discoverApiRoutes(): string[] {
  const root = join(process.cwd(), "src", "app", "api");

  function walk(dir: string, prefix: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        found.push(...walk(full, `${prefix}/${entry}`));
      } else if (entry === "route.ts") {
        found.push(prefix);
      }
    }
    return found;
  }

  return walk(root, "/api").map(toRoutePath);
}

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
    // guide-places/{id}/memories) + 1 (Blok 10B: stats/where-are-we-now)
    // + 5 (Blok 11A: notifications · notifications/{id}/read ·
    // notifications/read-all · content/pages/{slug} · guide-places/{id})
    // + 5 (Blok 11B: admin/stats · admin/reports · admin/reports/{id}/resolve ·
    // admin/audit · admin/users) = 33
    // + 4 (Blok 14B — paylaşım CRUD-u: POST cohorts/{slug}/posts ·
    // GET/PATCH/DELETE posts/{id}) = 37.
    // + 7 (Blok 14C — EYNİ şablon iki modula):
    //     · xatirə: POST cohorts/{slug}/memories + GET/PATCH/DELETE
    //       memories/{id} (bu resursun oxu endpoint-i də YENİDİR)
    //     · tədbir: POST cohorts/{slug}/events + PATCH/DELETE events/{id}
    //       (GET events/{id} Blok 9S-dən onsuz da var idi)
    // = 44. Yazma əməliyyatı 6-dır, yeni YOL isə 7 — fərq məhz budur.
    // + 1 (bu blok — `GET /api/v1/openapi.json`): route Blok 9S-dən BƏRİ
    //   mövcud idi, amma sənədə düşməmişdi və gəzici qoruyucu `/api/v1`-i
    //   istisna etdiyi üçün heç nə şikayət etmirdi (audit §5.3 «kor nöqtə»).
    // = 45.
    expect(v1Operations.length).toBe(45);
  });

  it(
    "Sprint 2 boşluğu: v1-dən kənar 2 route sənədə əlavə olundu (3 əməliyyat)",
    () => {
      // `/api/upload` (GET + POST) və `.../ics` (GET) — bax `openapi.ts`
      // "Media" / "Events — təqvim ixracı" bölmələri. v1-ə DAXİL DEYİLLƏR,
      // ona görə yuxarıdaki 44-ə DAXİL EDİLMİRLƏR.
      const nonV1 = operations.filter((o) => !o.path.startsWith("/api/v1"));
      expect(nonV1.map((o) => o.operation.operationId).sort()).toEqual([
        "downloadEventIcs",
        "getUploadLimits",
        "uploadMedia",
      ]);
    },
  );

  /**
   * 🔴 TƏLƏ D — AUDIT JURNALI YALNIZ ƏLAVƏ OLUNUR (Blok 11B).
   *
   * Sənəd müqavilədir: `/admin/audit` üçün YAZMA əməliyyatı elan edilsəydi,
   * inteqrasiya yazan adam onu gözləyər və gec-tez kimsə route handler-i də
   * əlavə edərdi. Test hər iki istiqaməti bağlayır — yolda yalnız `get` var.
   */
  it("🔴 `/admin/audit` yalnız OXU əməliyyatı elan edir (TƏLƏ D)", () => {
    const auditPath = (document.paths ?? {})["/api/v1/admin/audit"];
    expect(auditPath, "audit yolu sənəddə yoxdur").toBeTruthy();

    const methods = Object.keys(auditPath ?? {});
    expect(methods).toEqual(["get"]);
  });

  it("🔴 admin endpoint-lərinin hamısı KUKA tələb edir", () => {
    const adminOps = operations.filter((o) => o.path.startsWith("/api/v1/admin"));
    expect(adminOps.length).toBe(5);

    for (const { label, operation } of adminOps) {
      const security = operation.security as unknown[] | undefined;
      expect(security, `${label} — security yoxdur`).toBeTruthy();
      expect(security?.length ?? 0, `${label} — security boşdur`).toBeGreaterThan(0);
    }
  });

  /**
   * 🔴 TƏLƏ A — şikayət növbəsi sxemində MƏTN sahəsi yoxdur.
   *
   * `AdminReport` sxemi hədəfin yalnız qoruma kontekstini elan edir. Sənədə
   * `title` / `body` düşsəydi, müştəri onu gözləyər və nə vaxtsa kimsə servisə
   * həmin sahələri əlavə edərdi — məzmun audit izi olmadan sızardı.
   */
  it("🔴 `AdminReport` sxemində şikayət olunan MƏZMUN yoxdur (TƏLƏ A)", () => {
    const schema = (document.components?.schemas ?? {}) as Record<
      string,
      { properties?: Record<string, unknown> }
    >;
    const target = schema.AdminReport?.properties?.target as
      | { properties?: Record<string, unknown> }
      | undefined;

    expect(target, "AdminReport.target sənəddə yoxdur").toBeTruthy();

    for (const forbidden of ["title", "body", "description", "content"]) {
      expect(
        Object.keys(target?.properties ?? {}),
        `AdminReport.target-də «${forbidden}» var`,
      ).not.toContain(forbidden);
    }
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

  it.each(v1Operations.map((o) => [o.label, o] as const))(
    "%s — 401 cavabı sənədləşdirilib",
    (_label, { operation }) => {
      // ⚠️ İctimai endpoint-lərdə 401 vahid xəta ZƏRFİNİN forması kimi
      // göstərilir (bax `openapi.ts` başlığı), qorunanlarda isə real davranışdır.
      expect(operation.responses).toHaveProperty("401");
    },
  );

  /**
   * 🔴 `/api/upload` və `.../ics` 401 SƏNƏDLƏMİR — bu, unudulma DEYİL.
   * `requireUser()` səhifə kimi çağırılıb: sessiyasız sorğu JSON 401 yox,
   * 307 ilə `/login`-ə yönləndirilir. 401 yazmaq real davranışı YALAN
   * göstərərdi (bax `openapi.ts` "Media" bölməsinin başlığı).
   */
  it.each(
    operations
      .filter((o) => !o.path.startsWith("/api/v1"))
      .map((o) => [o.label, o] as const),
  )("%s — 401 QƏSDƏN sənədlənməyib (307 redirect)", (_label, { operation }) => {
    expect(operation.responses).not.toHaveProperty("401");
  });

  it.each(operations.map((o) => [o.label, o] as const))(
    "%s — uğur cavabı 2xx-dir və sxemi var",
    (_label, { operation, label }) => {
      const successCodes = Object.keys(operation.responses).filter((code) =>
        code.startsWith("2"),
      );
      expect(successCodes.length, `${label} üçün 2xx cavab yoxdur`).toBeGreaterThan(0);
    },
  );

  /**
   * 🔴 TƏLƏ D (Blok 10B) — ƏMƏK HAQQI QƏSDƏN YOXDUR.
   *
   * Qərar kodda deyil, MÜQAVİLƏDƏ sübut olunur: sənəd maaş sahəsi elan etmirsə
   * heç bir müştəri onu gözləmir və heç bir gələcək endpoint onu "geri
   * uyğunluq üçün" əlavə edə bilməz. 14-28 nəfərlik sinifdə aqreqasiya olunmuş
   * maaş belə fərdiləşdirilə bilər (bir nəfər öz rəqəmini bilirsə qalanları
   * çıxarır) — səbəb README və STATE.md-dədir.
   */
  it("🔴 sənəddə maaş / bonus sahəsi YOXDUR (TƏLƏ D)", () => {
    expect(JSON.stringify(document)).not.toMatch(
      /"(salary|salaryRange|bonus|wage|income|compensation)"/i,
    );
  });

  /**
   * Aqreqasiya sxemi `additionalProperties: false` olmalıdır — əks halda
   * yuxarıdaki test "sahə yoxdur" deyər, sxem isə "istənilən sahə ola bilər"
   * deyər və müqavilə mənasız qalar.
   */
  it("🔴 «İndi haradayıq?» sxemi ƏLAVƏ SAHƏYƏ İCAZƏ VERMİR", () => {
    const schemas = document.components?.schemas as
      | Record<string, { additionalProperties?: unknown; properties?: Record<string, unknown> }>
      | undefined;

    const schema = schemas?.WhereAreWeNow;
    expect(schema, "WhereAreWeNow sxemi sənəddə yoxdur").toBeTruthy();
    expect(schema?.additionalProperties).toBe(false);

    // Səkkiz xana + beş sayğac.
    expect(Object.keys(schema?.properties ?? {})).toEqual([
      "respondentCount",
      "totalConsented",
      "memberCount",
      "suppressedCount",
      "viewerIncluded",
      "countries",
      "cities",
      "companies",
      "industries",
      "jobFunctions",
      "educationLevels",
      "mapPins",
      "azPins",
      "countryFills",
    ]);
  });

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
  // 🔴 v1-ə MƏHDUD: `uploadMedia` (`POST /api/upload`) da `method === "post"`
  // filtrinə düşərdi, amma o, `multipart/form-data` göndərir (JSON YOX) və
  // 415 sənədləmir — v1-in JSON+415 qaydası ona aid deyil (aşağıdakı ayrı
  // "Media" describe blokunda yoxlanılır).
  const posts = v1Operations.filter((o) => o.method === "post");

  it("doqquz POST var: auth × 3 + bildiriş × 2 + moderasiya qərarı + paylaşım + xatirə + tədbir", () => {
    // ⚠️ Siyahı SABİT gözləmədir: yeni yazma endpoint-i əlavə edən adam
    // aşağıdaki İKİ testin (JSON gövdəsi + 415) əhatəsinə düşdüyünü görsün.
    // Blok 11A-da bildiriş işarələmə, Blok 11B-də şikayət qərarı əlavə olundu.
    //
    // Blok 14B — `createCohortPost`. Testin MƏNASI dəyişmir: sadalanan hər
    // POST-un NİYƏ orada olduğu bilinməlidir.
    //   · login / logout / registerUser  → sessiya
    //   · markNotificationRead / …ReadAll → bildiriş vəziyyəti
    //   · resolveAdminReport              → moderasiya qərarı
    //   · createCohortPost                → paylaşım yaradılması (CRUD-un «C»-si)
    //   · createCohortMemory / …Event     → Blok 14C, EYNİ şablon
    // `PATCH` və `DELETE` bu siyahıda YOXDUR — onlar `method === "post"`
    // filtrinə düşmür və ayrıca aşağıda yoxlanılır.
    //
    // 🔴 SİYAHIDA `/admin/audit` ÜÇÜN HEÇ NƏ YOXDUR VƏ OLMAYACAQ (TƏLƏ D) —
    // audit jurnalı yalnız əlavə olunur, yazma səthi açılmır.
    expect(posts.map((o) => o.operation.operationId).sort()).toEqual([
      "createCohortEvent",
      "createCohortMemory",
      "createCohortPost",
      "login",
      "logout",
      "markAllNotificationsRead",
      "markNotificationRead",
      "registerUser",
      "resolveAdminReport",
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

/**
 * Blok 14B — Sprint 2 meyarı «CRUD tam işləyir» SƏNƏDDƏ sübut olunur.
 *
 * Yoxlayıcı Swagger-i açır və yalnız oxu görürsə nəticə "CRUD yoxdur" olur,
 * kodda nə olmasından asılı olmayaraq. Ona görə dörd hərfin hər biri burada
 * bərkidilir.
 */
describe("paylaşım CRUD-u (Blok 14B)", () => {
  const postOps = operations.filter((o) => o.operation.tags?.[0] === "Posts");

  it("dörd əməliyyat da `Posts` taqındadır", () => {
    expect(postOps.map((o) => o.operation.operationId).sort()).toEqual([
      "createCohortPost",
      "deletePost",
      "getPost",
      "updatePostSurfaces",
    ]);
  });

  it("C-R-U-D dörd METODLA elan olunub", () => {
    const byId = new Map(postOps.map((o) => [o.operation.operationId, o]));

    expect(byId.get("createCohortPost")?.method).toBe("post");
    expect(byId.get("getPost")?.method).toBe("get");
    expect(byId.get("updatePostSurfaces")?.method).toBe("patch");
    expect(byId.get("deletePost")?.method).toBe("delete");
  });

  it("🔴 yazma əməliyyatları KUKA tələb edir, oxu isə anonimə açıqdır", () => {
    const byId = new Map(postOps.map((o) => [o.operation.operationId, o.operation]));

    for (const id of ["createCohortPost", "updatePostSurfaces", "deletePost"]) {
      expect((byId.get(id)?.security as unknown[])?.length ?? 0, id).toBeGreaterThan(0);
    }

    // `PUBLIC` paylaşım giriş etməmiş ziyarətçiyə də açıqdır — `getEvent` ilə
    // eyni qərar (`activeVisibleWhere` anonim üçün yalnız PUBLIC seçir).
    expect(byId.get("getPost")?.security).toBeUndefined();
  });

  it("🔴 `DELETE` 204 qaytarır və gövdə sxemi YOXDUR", () => {
    const remove = operations.find((o) => o.operation.operationId === "deletePost");
    const response = remove?.operation.responses["204"] as { content?: unknown };

    expect(response).toBeDefined();
    expect(response.content).toBeUndefined();
  });

  it("🔴 `DELETE`-də 415 YOXDUR — gövdəsiz sorğuda məzmun tipi tələb olunmur", () => {
    // Qoruma cross-site `<form>` POST-una qarşıdır; brauzer forması `DELETE`
    // göndərə bilmir, yəni 415 burada yalnız süni maneə olardı.
    const remove = operations.find((o) => o.operation.operationId === "deletePost");
    expect(remove?.operation.responses).not.toHaveProperty("415");
  });

  it("🔴 yazma əməliyyatlarında 429 sənədləşdirilib (spam qapısı bağlıdır)", () => {
    for (const id of ["createCohortPost", "updatePostSurfaces", "deletePost"]) {
      const operation = operations.find((o) => o.operation.operationId === id);
      expect(operation?.operation.responses, id).toHaveProperty("429");
    }
  });

  it("`POST` 201 qaytarır və `Location` başlığını təsvir edir", () => {
    const create = operations.find((o) => o.operation.operationId === "createCohortPost");
    const created = create?.operation.responses["201"] as { description?: string };

    expect(created).toBeDefined();
    expect(created.description).toContain("Location");
  });

  it("🔴 yaratma gövdəsində `cohortId` YOXDUR — sinif YOLDAN gəlir", () => {
    // İki mənbə olsaydı, `{slug}` ilə gövdənin ziddiyyəti hər çağırış
    // nöqtəsində fərqli həll olunardı.
    const schemas = document.components?.schemas as
      | Record<string, { properties?: Record<string, unknown> }>
      | undefined;

    expect(Object.keys(schemas?.CreatePostBody?.properties ?? {})).not.toContain(
      "cohortId",
    );
  });

  it("🔴 qismən yeniləmə: `UpdatePostBody`-də MƏCBURİ sahə yoxdur", () => {
    // Bayraqlardan biri məcburi olsaydı, tək bayraq göndərən müştəri o birini
    // səssizcə söndürərdi.
    const schemas = document.components?.schemas as
      | Record<string, { required?: string[] }>
      | undefined;

    expect(schemas?.UpdatePostBody?.required).toBeUndefined();
  });

  it("🔴 yaratma nümunəsi DOĞRULAMADAN keçir — «Try it out» 422 verməsin", async () => {
    const { CreatePostBodySchema } = await import("./schemas");
    const schemas = document.components?.schemas as
      | Record<string, { example?: unknown }>
      | undefined;

    const parsed = CreatePostBodySchema.safeParse(schemas?.CreatePostBody?.example);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});

/**
 * Blok 14C — EYNİ meyar iki modul üçün: xatirə və tədbirin yazma səthi
 * SƏNƏDDƏ görünməlidir. Yoxlayıcı Swagger-i açıb yalnız oxu görürsə nəticə
 * "yazma yoxdur" olur, kodda nə olmasından asılı olmayaraq.
 */
describe("xatirə və tədbir yazma səthi (Blok 14C)", () => {
  const byId = new Map(operations.map((o) => [o.operation.operationId, o]));

  it("xatirənin dörd əməliyyatı `Memories` taqındadır", () => {
    const memoryOps = operations.filter((o) => o.operation.tags?.[0] === "Memories");

    expect(memoryOps.map((o) => o.operation.operationId).sort()).toEqual([
      "createCohortMemory",
      "deleteMemory",
      "getMemory",
      "updateMemory",
    ]);
  });

  it("altı yazma əməliyyatı DÜZGÜN METODLA elan olunub", () => {
    expect(byId.get("createCohortMemory")?.method).toBe("post");
    expect(byId.get("updateMemory")?.method).toBe("patch");
    expect(byId.get("deleteMemory")?.method).toBe("delete");
    expect(byId.get("createCohortEvent")?.method).toBe("post");
    expect(byId.get("updateEvent")?.method).toBe("patch");
    expect(byId.get("deleteEvent")?.method).toBe("delete");
  });

  const WRITE_IDS = [
    "createCohortMemory",
    "updateMemory",
    "deleteMemory",
    "createCohortEvent",
    "updateEvent",
    "deleteEvent",
  ] as const;

  it.each(WRITE_IDS)("%s — KUKA tələb edir və 429 sənədləşdirilib", (id) => {
    const operation = byId.get(id)?.operation;

    expect((operation?.security as unknown[])?.length ?? 0, id).toBeGreaterThan(0);
    // Limitsiz yazma endpoint-i spam qapısıdır (`lib/api/rate-limit.ts`).
    expect(operation?.responses, id).toHaveProperty("429");
  });

  it.each(["deleteMemory", "deleteEvent"] as const)(
    "%s — 204 qaytarır, gövdə sxemi və 415 YOXDUR",
    (id) => {
      const operation = byId.get(id)?.operation;
      const response = operation?.responses["204"] as { content?: unknown };

      expect(response).toBeDefined();
      expect(response.content).toBeUndefined();
      // Brauzer `<form>`-u `DELETE` göndərə bilmir — məzmun tipi tələbi süni
      // maneə olardı (paylaşım `DELETE`-i ilə eyni qərar).
      expect(operation?.responses).not.toHaveProperty("415");
    },
  );

  it.each(["CreateMemoryBody", "CreateEventBody"] as const)(
    "🔴 %s gövdəsində `cohortId` YOXDUR — sinif YOLDAN gəlir",
    (name) => {
      const schemas = document.components?.schemas as
        | Record<string, { properties?: Record<string, unknown> }>
        | undefined;

      expect(Object.keys(schemas?.[name]?.properties ?? {})).not.toContain("cohortId");
    },
  );

  it.each(["UpdateMemoryBody", "UpdateEventBody"] as const)(
    "🔴 %s-də MƏCBURİ sahə yoxdur (qismən yeniləmə)",
    (name) => {
      // Sahələrdən biri məcburi olsaydı, tək sahə göndərən müştəri qalanını
      // səssizcə sıfırlardı.
      const schemas = document.components?.schemas as
        | Record<string, { required?: string[] }>
        | undefined;

      expect(schemas?.[name]?.required).toBeUndefined();
    },
  );

  it("🔴 yaratma nümunələri DOĞRULAMADAN keçir — «Try it out» 422 verməsin", async () => {
    const { CreateEventBodySchema, CreateMemoryBodySchema } = await import("./schemas");
    const schemas = document.components?.schemas as
      | Record<string, { example?: unknown }>
      | undefined;

    const memory = CreateMemoryBodySchema.safeParse(schemas?.CreateMemoryBody?.example);
    expect(memory.success, JSON.stringify(memory.error?.issues)).toBe(true);

    const event = CreateEventBodySchema.safeParse(schemas?.CreateEventBody?.example);
    expect(event.success, JSON.stringify(event.error?.issues)).toBe(true);
  });

  it("201 cavabları `Location` başlığını təsvir edir", () => {
    for (const id of ["createCohortMemory", "createCohortEvent"] as const) {
      const created = byId.get(id)?.operation.responses["201"] as {
        description?: string;
      };

      expect(created, id).toBeDefined();
      expect(created.description, id).toContain("Location");
    }
  });
});

/**
 * Sprint 2 boşluğu — TAPŞIRIQ 1/2: `/api/upload` (a) və `.../ics` (a) v1-in
 * DIŞINDA olsalar da real müqavilədirlər. Testlər onların v1-DƏN FƏRQLİ
 * cavab formasını (zərfsiz, öz xəta sxemi, 401 yox) bərkidir.
 */
describe("Media və təqvim ixracı — v1-dən kənar, amma sənədli (Sprint 2)", () => {
  const byId = new Map(operations.map((o) => [o.operation.operationId, o]));

  it("üç əməliyyat da düzgün taqda və metoddadır", () => {
    expect(byId.get("getUploadLimits")?.method).toBe("get");
    expect(byId.get("getUploadLimits")?.operation.tags).toEqual(["Media"]);

    expect(byId.get("uploadMedia")?.method).toBe("post");
    expect(byId.get("uploadMedia")?.operation.tags).toEqual(["Media"]);

    expect(byId.get("downloadEventIcs")?.method).toBe("get");
    expect(byId.get("downloadEventIcs")?.operation.tags).toEqual(["Events"]);
  });

  it("🔴 heç biri v1 zərfi işlətmir — `{ data }` deyil, xam sahələr", () => {
    // `UploadedMediaAsset` `registerPath`-də `$ref`-lə bağlanıb — real forma
    // `components.schemas`-dadır, `responses` yalnız istinad daşıyır.
    const schemas = document.components?.schemas as
      | Record<string, { properties?: Record<string, unknown> }>
      | undefined;
    const properties = schemas?.UploadedMediaAsset?.properties ?? {};

    expect(properties).not.toHaveProperty("data");
    expect(properties).toHaveProperty("url");
    expect(properties).toHaveProperty("sizeBytes");
  });

  it("🔴 ölçü aşımı 400-dür, 413 DEYİL", () => {
    // Başlanğıc fərziyyə 413 idi — koda baxmadan qəbul edilməzdi (TAPŞIRIQ-da
    // «kor-koranə qəbul etmə» xəbərdarlığı var idi). Route handler `TOO_LARGE`-ı
    // digər doğrulama xətaları ilə eyni statusa (400) yazır.
    const upload = byId.get("uploadMedia")?.operation;
    expect(upload?.responses).toHaveProperty("400");
    expect(upload?.responses).not.toHaveProperty("413");
  });

  it("uploadMedia JSON gövdə/415 elan ETMİR — multipart, v1 qaydası tətbiq olunmur", () => {
    const upload = byId.get("uploadMedia")?.operation;
    expect(upload?.responses).not.toHaveProperty("415");
  });

  it("downloadEventIcs cavabı `text/calendar`-dır, `application/json` YOX", () => {
    const ics = byId.get("downloadEventIcs")?.operation.responses["200"] as {
      content?: Record<string, unknown>;
    };

    expect(ics?.content).toHaveProperty("text/calendar");
    expect(ics?.content).not.toHaveProperty("application/json");
  });

  it("downloadEventIcs `{id}` yol parametrini elan edir", () => {
    const ics = byId.get("downloadEventIcs")?.operation;
    const idParam = (ics?.parameters ?? []).find((p) => p.name === "id");

    expect(idParam, "id parametri yoxdur").toBeDefined();
    expect(idParam?.in).toBe("path");
  });
});

/**
 * AĞ SİYAHI. `src/app/api` altında tapılan HƏR route — `/api/v1` DAXİL —
 * ya sənəddə (yuxarıdaki `document.paths`) olmalıdır, ya da
 * `UNDOCUMENTED_ROUTE_WHITELIST`-də səbəblə yazılmalıdır. Yeni route əlavə
 * olunanda (sənədlənməyib və ağ siyahıda yoxdursa) bu test AŞIR.
 */
/**
 * 🔴 TƏLƏ A — ÇEVİRMƏNİN ÖZÜ ÖLÇÜLÜR. Fayl sistemi `[slug]`, OpenAPI `{slug}`
 * yazır. `toRoutePath` səhv olsa aşağıdakı ağ siyahı testi HƏR dinamik route
 * üçün «sənəddə yoxdur» deyərdi — 20+ saxta tapıntı, hamısı eyni səbəbdən.
 * Qoruyucunun özünə güvənmək üçün əvvəlcə çevirici sübut olunur.
 */
describe("toRoutePath — fayl seqmenti → OpenAPI yolu", () => {
  it("tək dinamik seqmenti `{param}`-a çevirir", () => {
    expect(toRoutePath("/api/v1/posts/[id]")).toBe("/api/v1/posts/{id}");
  });

  it("bir yolda BİRDƏN ÇOX dinamik seqmenti çevirir", () => {
    expect(toRoutePath("/api/v1/cohorts/[slug]/events/[id]")).toBe(
      "/api/v1/cohorts/{slug}/events/{id}",
    );
  });

  it("statik yolu OLDUĞU KİMİ saxlayır", () => {
    expect(toRoutePath("/api/v1/health")).toBe("/api/v1/health");
  });

  it("seqmentdəki NÖQTƏYƏ toxunmur (`openapi.json` real qovluq adıdır)", () => {
    expect(toRoutePath("/api/v1/openapi.json")).toBe("/api/v1/openapi.json");
  });

  it("🔴 catch-all seqment (`[...x]`) çevrilmir — OpenAPI-də qarşılığı yoxdur", () => {
    // `{...nextauth}` ETİBARSIZ OpenAPI-dir; catch-all route ya sənədə heç
    // düşmür, ya ağ siyahıya gedir (bax `/api/auth/[...nextauth]`).
    expect(toRoutePath("/api/auth/[...nextauth]")).toBe("/api/auth/[...nextauth]");
  });

  it("🔴 çevrilmiş yol sənəddəki REAL açarla üst-üstə düşür", () => {
    // Bağlayıcı sübut: çevirici sənədin öz açar formatını verir.
    expect(Object.keys(document.paths ?? {})).toContain(
      toRoutePath("/api/v1/cohorts/[slug]/posts"),
    );
  });
});

describe("BÜTÜN api route-larının AĞ SİYAHISI", () => {
  const discovered = discoverApiRoutes();
  const documentedPaths = new Set(Object.keys(document.paths ?? {}));

  it("🔴 gəzici `/api/v1`-i də əhatə edir — kor nöqtə qapalıdır", () => {
    // Bu testin ÖZÜ filtrin geri qayıtmasını tutur: kimsə `discoverApiRoutes()`
    // nəticəsini yenidən `!p.startsWith("/api/v1")` ilə süzsə burada sıfır v1
    // route qalar və test aşar. Aşağıdakı «hər route ya sənəddə, ya ağ
    // siyahıda» testi onda SƏSSİZCƏ boşalardı — ona görə qapı ayrıca lazımdır.
    const v1Discovered = discovered.filter((p) => p.startsWith("/api/v1"));

    expect(v1Discovered.length).toBeGreaterThan(30);
    expect(v1Discovered).toContain("/api/v1/openapi.json");
  });

  it("v1-dən KƏNAR route-ların siyahısı gözlənilənlə üst-üstə düşür", () => {
    // Sabit gözləmə: v1 xaricində yeni fayl əlavə olunanda bu testin dayanması
    // müəllifi aşağıdakı «hər route ya sənəddə, ya ağ siyahıda» testinə
    // baxmağa məcbur edir. (v1 tərəfində sabit siyahı SAXLANMIR — 36 sətirlik
    // siyahı hər endpoint-də əl ilə yenilənərdi; oranı elə həmin «sənəddə ya
    // ağ siyahıda» qapısı tutur.)
    expect(discovered.filter((p) => !p.startsWith("/api/v1")).sort()).toEqual(
      [
        "/api/auth/[...nextauth]",
        "/api/events/{id}/ics",
        "/api/feed",
        "/api/search",
        "/api/session/expired",
        "/api/upload",
      ].sort(),
    );
  });

  it.each(discovered.map((p) => [p, p] as const))(
    "%s — sənəddədir YA DA ağ siyahıda səbəblə yazılıb",
    (_label, routePath) => {
      const documented = documentedPaths.has(routePath);
      const whitelisted = Object.prototype.hasOwnProperty.call(
        UNDOCUMENTED_ROUTE_WHITELIST,
        routePath,
      );

      if (!documented && !whitelisted) {
        throw new Error(
          `«${routePath}» nə OpenAPI sənədində, nə də ağ siyahıdadır. ` +
            "Ya (a) ictimai müqavilədirsə `openapi.ts`-ə sal, ya da (b) daxili " +
            "UI detalıdırsa `UNDOCUMENTED_ROUTE_WHITELIST`-ə səbəblə əlavə et " +
            "(bax `docs/ARCHITECTURE.md` § «Sənədə salınmayan daxili route-lar»).",
        );
      }

      // Whitelist-ə düşübsə sənəddə OLMAMALIDIR — əks halda iki mənbə
      // ziddiyyət təşkil edər (test hansının doğru olduğunu deyə bilməz).
      if (whitelisted) {
        expect(documented, `«${routePath}» HƏM sənəddə, HƏM ağ siyahıdadır`).toBe(false);
        expect(UNDOCUMENTED_ROUTE_WHITELIST[routePath].length).toBeGreaterThan(10);
      }
    },
  );
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

describe("docs/openapi.json drift qoruyucusu", () => {
  it("🔴 repodakı statik snapshot buildOpenApiDocument() ilə eynidir", () => {
    const snapshotPath = join(process.cwd(), "docs", "openapi.json");
    const snapshot = readFileSync(snapshotPath, "utf-8");

    expect(
      snapshot,
      "`docs/openapi.json` kodla üst-üstə düşmür — `npm run docs:openapi` işlədib yenidən commit et.",
    ).toBe(`${JSON.stringify(document, null, 2)}\n`);
  });
});
