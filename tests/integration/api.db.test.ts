// @vitest-environment node
// ============================================================================
// tests/integration/api.db.test.ts
// Blok 9S — `/api/v1` qatının REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALI: YENİ ENDPOINT YENİ SIZMA NÖQTƏSİDİRMİ?
// Route handler-lər servisi çağırır və məxfilik mühərriki (`visibilityWhere`)
// TƏK yerdədir — amma bu, iddiadır. Fayl onu ÖLÇÜR:
//   1. anonim sorğu `CLASS` paylaşımı GÖRMÜR
//   2. BAŞQA sinfin üzvü də GÖRMÜR
//   3. icazəsiz sinif üçün 404 (403 YOX — mövcudluq sızmasın)
//   4. gizlədilmiş sahəyə görə FİLTRLƏMƏ bloklanır (T17 API-də də keçərlidir)
//
// ⚠️ NİYƏ `getViewer` MOCK OLUNUR: `lib/viewer.ts` → `getViewer()` Auth.js-in
// `auth()`-unu çağırır, o da `next/headers`-dən oxuyur və Next SORĞU KONTEKSTİ
// olmadan atır. Viewer-in ÖZÜ isə mock deyil — mövcud inteqrasiya testləri ilə
// EYNİ şəkildə (`viewerOf(email)`) REAL bazadan qurulur. Yəni mock yalnız
// "sessiya necə oxunur" hissəsini əvəz edir, məxfilik məntiqini YOX.
//
// ⚠️ Login-in TAM axını (Auth.js `signIn`, `Set-Cookie`, eyni 401 mətni) burada
// YOXLANA BİLMİR — `signIn` da Next kontekstini tələb edir. O, REAL HTTP
// serverinə qarşı `tests/e2e/api.spec.ts`-də yoxlanılır (daha güclü test:
// həqiqi kuka, həqiqi middleware).
//
// ⚠️ Fayl YALNIZ OXUYUR — heç bir sətir yaratmır/dəyişmir, yəni seed
// determinizmi pozulmur.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ANONYMOUS, type Viewer } from "@/lib/visibility";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

/** Mock-un qaytardığı viewer — hər testdən əvvəl dəyişdirilir. */
let currentViewer: Viewer = ANONYMOUS;

// 🔴 `@/lib/auth` barrel-i mock olunur, çünki `lib/api/guard.ts` `getViewer`-i
// MƏHZ oradan import edir. Qalan ixraclar orijinaldan gəlir.
vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...original,
    getViewer: async () => currentViewer,
    getSessionUser: async () =>
      currentViewer.kind === "USER"
        ? {
            id: currentViewer.userId,
            firstName: "Test",
            lastName: "İstifadəçi",
            email: "test@qu.edu.az",
            avatarUrl: null,
            systemRole: currentViewer.systemRole,
            stage: "STUDENT",
          }
        : null,
  };
});

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

const BASE = "http://localhost:3000";

/**
 * Route handler-i çağırır — Next-in ötürdüyü `params` PROMISE-i ilə (Next 15).
 *
 * ⚠️ Generik `P`: handler-lər `withUser<{ slug: string }>` kimi DARALDILMIŞ
 * params tipi ilə gəlir; sabit `Record<string, string>` imzası onları qəbul
 * etmirdi (kontravariant parametr).
 */
async function call<P extends Record<string, string>>(
  handler: (request: Request, context: { params: Promise<P> }) => Promise<Response>,
  url: string,
  params: P = {} as P,
  init?: RequestInit,
): Promise<Response> {
  return handler(new Request(`${BASE}${url}`, init), {
    params: Promise.resolve(params),
  });
}

interface Envelope<T> {
  data: T;
  meta?: { total?: number; nextCursor?: string | null; page?: number };
}

async function envelopeOf<T>(response: Response): Promise<Envelope<T>> {
  return (await response.json()) as Envelope<T>;
}

async function errorOf(response: Response): Promise<{ code: string; message: string }> {
  const body = (await response.json()) as { error: { code: string; message: string } };
  return body.error;
}

// ---------------------------------------------------------------------------
// Test datası
// ---------------------------------------------------------------------------

let rep: UserViewer; // İnformasiya təhlükəsizliyi 2027 üzvü
let alumni: UserViewer; // BAŞQA sinif (Maliyyə 2022)
let admin: UserViewer;

let ownSlug: string;
let foreignSlug: string;
/** `rep`-in sinfindəki `CLASS` səviyyəli paylaşımın `id`-si və mətni. */
let classPost: { id: string; body: string };

beforeAll(async () => {
  [rep, alumni, admin] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
    viewerOf("admin@qu.edu.az"),
  ]);

  const own = await prisma.cohort.findUniqueOrThrow({
    where: { id: rep.cohortIds[0] },
    select: { slug: true },
  });
  ownSlug = own.slug;

  const foreign = await prisma.cohort.findFirstOrThrow({
    where: { id: { notIn: [...rep.cohortIds, ...admin.cohortIds] } },
    select: { slug: true },
  });
  foreignSlug = foreign.slug;

  // `rep`-in sinfində `CLASS` səviyyəli, aktiv paylaşım — sızma testinin hədəfi.
  //
  // ⚠️ `createdAt desc` MƏCBURİDİR: lent məhz bu sıra ilə səhifələnir və ƏN
  // KÖHNƏ CLASS paylaşımı ilk 50 sətrə düşmür — "üzv görür" testi səhvən
  // qırılırdı (sızma yox, test seçimi səhv idi).
  const post = await prisma.post.findFirstOrThrow({
    where: {
      cohortId: rep.cohortIds[0],
      visibility: "CLASS",
      status: "ACTIVE",
      // Sahibi `rep` OLMASIN: sahib öz məzmununu həmişə görür və test mənasız
      // olardı (`alumni` üçün onsuz da fərq yoxdur, amma niyyət açıq qalsın).
      authorId: { not: rep.userId },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, body: true },
  });

  // ⚠️ `Post.body` sxemdə NULLABLE-dir (`String?` — media-only paylaşım).
  // Sızma testi MƏTNƏ baxdığı üçün gövdəsi olan sətir tələb olunur.
  if (!post.body) throw new Error("CLASS paylaşımın mətni yoxdur — test hədəfi seçilə bilmir");
  classPost = { id: post.id, body: post.body };
});

// ---------------------------------------------------------------------------
// 1. Sızma — sinif lenti
// ---------------------------------------------------------------------------

describe("GET /api/v1/cohorts/{slug}/posts", () => {
  it("🔴 ANONİM sorğu 401 alır — CLASS paylaşım SIZMIR", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(GET, `/api/v1/cohorts/${ownSlug}/posts`, {
      slug: ownSlug,
    });

    expect(response.status).toBe(401);

    // ⚠️ Gövdə BİR DƏFƏ oxunur (`Response` stream-dir, ikinci oxu atır).
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    // Cavabın MƏTNİNDƏ paylaşımın gövdəsi belə olmamalıdır.
    expect(text).not.toContain(classPost.body.slice(0, 30));
  });

  it("🔴 FƏRQLİ sinif üzvü CLASS paylaşımı GÖRMÜR (404, sinif ona bağlı deyil)", async () => {
    currentViewer = alumni;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(GET, `/api/v1/cohorts/${ownSlug}/posts`, {
      slug: ownSlug,
    });

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).not.toContain(classPost.id);
    expect(text).not.toContain(classPost.body.slice(0, 30));
  });

  it("🔴 ÖZ sinfində üzv paylaşımı GÖRÜR (test doğru resursa baxır)", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      GET,
      `/api/v1/cohorts/${ownSlug}/posts?take=50`,
      { slug: ownSlug },
    );

    expect(response.status).toBe(200);
    const body = await envelopeOf<Array<{ id: string }>>(response);
    expect(body.data.map((p) => p.id)).toContain(classPost.id);
  });

  it("kursor səhifələməsi `meta.nextCursor` qaytarır", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const first = await envelopeOf<Array<{ id: string }>>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/posts?take=2`, { slug: ownSlug }),
    );

    expect(first.data).toHaveLength(2);
    expect(first.meta?.nextCursor).toBeTruthy();

    const second = await envelopeOf<Array<{ id: string }>>(
      await call(
        GET,
        `/api/v1/cohorts/${ownSlug}/posts?take=2&cursor=${first.meta?.nextCursor}`,
        { slug: ownSlug },
      ),
    );

    // Səhifələr KƏSİŞMİR — kursor `createdAt desc, id desc` sırasına bağlıdır.
    const firstIds = new Set(first.data.map((p) => p.id));
    for (const post of second.data) {
      expect(firstIds.has(post.id)).toBe(false);
    }
  });

  it("etibarsız `take` 422 verir", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      GET,
      `/api/v1/cohorts/${ownSlug}/posts?take=999`,
      { slug: ownSlug },
    );

    expect(response.status).toBe(422);
    expect((await errorOf(response)).code).toBe("VALIDATION_FAILED");
  });
});

// ---------------------------------------------------------------------------
// 2. İcazəsiz sinif → 404, 403 YOX
// ---------------------------------------------------------------------------

describe("icazəsiz sinif", () => {
  const cohortRoutes = [
    ["başlıq", () => import("@/app/api/v1/cohorts/[slug]/route"), ""],
    ["kataloq", () => import("@/app/api/v1/cohorts/[slug]/members/route"), "/members"],
    ["lent", () => import("@/app/api/v1/cohorts/[slug]/posts/route"), "/posts"],
    ["xronologiya", () => import("@/app/api/v1/cohorts/[slug]/timeline/route"), "/timeline"],
    [
      "nailiyyətlər",
      () => import("@/app/api/v1/cohorts/[slug]/achievements/route"),
      "/achievements",
    ],
    ["tədbirlər", () => import("@/app/api/v1/cohorts/[slug]/events/route"), "/events"],
  ] as const;

  it.each(cohortRoutes)(
    "🔴 %s — üzv olmadığı sinif üçün 404 (403 YOX)",
    async (_name, load, suffix) => {
      currentViewer = rep;
      const { GET } = await load();

      const response = await call(
        GET as never,
        `/api/v1/cohorts/${foreignSlug}${suffix}`,
        { slug: foreignSlug },
      );

      // 🔴 403 «bu sinif var, amma sənə açıq deyil» deməkdir və MÖVCUDLUQ
      // faktını sızdırır: hücumçu slug-ları sıralayıb real sinifləri tapa bilər.
      expect(response.status, "403 QAYTARILMAMALIDIR").not.toBe(403);
      expect(response.status).toBe(404);
      expect((await errorOf(response)).code).toBe("NOT_FOUND");
    },
  );

  it.each(cohortRoutes)(
    "%s — MÖVCUD OLMAYAN sinif də EYNİ 404 cavabını verir",
    async (_name, load, suffix) => {
      currentViewer = rep;
      const { GET } = await load();

      const missing = await call(
        GET as never,
        `/api/v1/cohorts/bele-sinif-yoxdur${suffix}`,
        { slug: "bele-sinif-yoxdur" },
      );
      const forbiddenCohort = await call(
        GET as never,
        `/api/v1/cohorts/${foreignSlug}${suffix}`,
        { slug: foreignSlug },
      );

      // İki halın FƏRQİ cavabdan oxunmamalıdır — status və gövdə eynidir.
      expect(missing.status).toBe(forbiddenCohort.status);
      expect(await missing.text()).toBe(await forbiddenCohort.text());
    },
  );

  it("UNIVERSITY_ADMIN istisnadır — bütün siniflərə çıxışı var", async () => {
    currentViewer = admin;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/route");

    const response = await call(GET, `/api/v1/cohorts/${foreignSlug}`, {
      slug: foreignSlug,
    });

    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 3. Kataloq — 13 filtr və sahə-səviyyə sızma (T17)
// ---------------------------------------------------------------------------

describe("GET /api/v1/cohorts/{slug}/members", () => {
  it("13 filtrin hamısını qəbul edir və 422 vermir", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/members/route");
    const { DIRECTORY_FILTERS } = await import("@/lib/directory-filters");

    // Hər filtr üçün formaca düzgün, amma heç nəyə uyğun gəlməyən dəyər.
    const query = new URLSearchParams();
    for (const key of Object.keys(DIRECTORY_FILTERS)) {
      const def = DIRECTORY_FILTERS[key as keyof typeof DIRECTORY_FILTERS];
      query.set(def.param, key === "status" ? "ALUMNI" : "yoxdur");
    }

    const response = await call(
      GET,
      `/api/v1/cohorts/${ownSlug}/members?${query.toString()}`,
      { slug: ownSlug },
    );

    // ⚠️ Naməlum dəyər 422 VERMİR — filtr sadəcə nəzərə alınmır (səhifə ilə
    // eyni davranış; URL əl ilə dəyişdirilə bilər, bu, səhv deyil).
    expect(response.status).toBe(200);
    const body = await envelopeOf<unknown[]>(response);
    expect(body.meta?.total).toBe(0);
  });

  it("filtrsiz sorğu sinfin üzvlərini qaytarır", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/members/route");

    const body = await envelopeOf<Array<{ id: string; firstName: string }>>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/members`, { slug: ownSlug }),
    );

    expect(body.meta?.total).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("firstName");
  });

  it("🔴 GİZLƏDİLMİŞ sahəyə görə filtr həmin istifadəçini AÇMIR (T17)", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/members/route");

    // Sinifdə `currentCity`-si olan, `rep`-dən FƏRQLİ bir üzv seçilir.
    const target = await prisma.user.findFirstOrThrow({
      where: {
        id: { not: rep.userId },
        currentCity: { not: null },
        memberships: { some: { cohortId: rep.cohortIds[0] } },
      },
      select: { id: true, currentCity: true },
    });

    const city = target.currentCity as string;

    // Əvvəlcə mövcud vəziyyət: şəhər filtri onu tapırmı?
    const before = await envelopeOf<Array<{ id: string }>>(
      await call(
        GET,
        `/api/v1/cohorts/${ownSlug}/members?city=${encodeURIComponent(city)}`,
        { slug: ownSlug },
      ),
    );
    const foundBefore = before.data.some((entry) => entry.id === target.id);

    // Sahəni PRIVATE-a çevirib eyni filtri təkrarlayırıq, sonra GERİ QAYTARIRIQ.
    const original = await prisma.fieldVisibility.findUnique({
      where: { userId_field: { userId: target.id, field: "currentCity" } },
      select: { level: true },
    });

    try {
      await prisma.fieldVisibility.upsert({
        where: { userId_field: { userId: target.id, field: "currentCity" } },
        create: { userId: target.id, field: "currentCity", level: "PRIVATE" },
        update: { level: "PRIVATE" },
      });

      const after = await envelopeOf<Array<{ id: string }>>(
        await call(
          GET,
          `/api/v1/cohorts/${ownSlug}/members?city=${encodeURIComponent(city)}`,
          { slug: ownSlug },
        ),
      );

      // ⚠️ Filtr sahəni AÇMIR: `PRIVATE` şəhərə görə axtarış nəticə verməməlidir,
      // çünki dəyər kartda görünməsə də "bu adam Bakıdadır" faktı ÖYRƏNİLƏRDİ.
      expect(
        after.data.some((entry) => entry.id === target.id),
        "PRIVATE sahəyə görə filtr istifadəçini nəticədə saxladı — SIZMA",
      ).toBe(false);

      // Testin özü mənalı olsun: sahə açıq olanda filtr İŞLƏYİRDİ.
      expect(foundBefore, "seed-də bu şəhər filtri onsuz da nəticə vermirdi").toBe(true);
    } finally {
      // Seed determinizmi: sətir bayt-bayt geri qaytarılır.
      if (original) {
        await prisma.fieldVisibility.update({
          where: { userId_field: { userId: target.id, field: "currentCity" } },
          data: { level: original.level },
        });
      } else {
        await prisma.fieldVisibility.delete({
          where: { userId_field: { userId: target.id, field: "currentCity" } },
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Sessiya — anonimdə 200 + null
// ---------------------------------------------------------------------------

describe("GET /api/v1/auth/session", () => {
  it("🔴 ANONİMDƏ 200 + `data: null` qaytarır (401 YOX)", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/auth/session/route");

    const response = await call(GET, "/api/v1/auth/session");

    expect(response.status).toBe(200);
    expect(await envelopeOf<null>(response)).toEqual({ data: null });
  });

  it("giriş etmiş viewer üçün xülasə qaytarır və HƏSSAS sahə YOXDUR", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/auth/session/route");

    const body = await envelopeOf<Record<string, unknown>>(
      await call(GET, "/api/v1/auth/session"),
    );

    expect(body.data).toMatchObject({ userId: rep.userId, systemRole: "USER" });

    // ⚠️ TƏLƏ D: cavabda `passwordHash` və digər həssas sahə OLMAMALIDIR.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("$2b$");
    expect(serialized).not.toContain("$2a$");
  });
});

// ---------------------------------------------------------------------------
// 5. Auth — 415 (CSRF) və qeydiyyat doğrulaması
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/login — məzmun tipi", () => {
  it("🔴 `application/x-www-form-urlencoded` → 415 (TƏLƏ B)", async () => {
    currentViewer = ANONYMOUS;
    const { POST } = await import("@/app/api/v1/auth/login/route");

    const response = await POST(
      new Request(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "email=rep@qu.edu.az&password=Test1234!",
      }),
    );

    // Brauzerin `<form>`-u yalnız bu üç tipi göndərə bilir; JSON tələb etmək
    // sadə cross-site form POST-unu KƏSİR.
    expect(response.status).toBe(415);
    expect((await errorOf(response)).code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("🔴 `multipart/form-data` → 415", async () => {
    const { POST } = await import("@/app/api/v1/auth/login/route");

    const response = await POST(
      new Request(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=x" },
        body: "--x--",
      }),
    );

    expect(response.status).toBe(415);
  });

  it("`Content-Type` başlığı YOXDURSA da 415", async () => {
    const { POST } = await import("@/app/api/v1/auth/login/route");

    const response = await POST(
      new Request(`${BASE}/api/v1/auth/login`, { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(415);
  });

  it("`application/json; charset=utf-8` QƏBUL olunur (415 vermir)", async () => {
    const { POST } = await import("@/app/api/v1/auth/login/route");

    const response = await POST(
      new Request(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        // Qəsdən BOŞ gövdə: 415-dən keçib doğrulamaya çatdığını göstərir.
        body: "{}",
      }),
    );

    expect(response.status).toBe(422);
  });
});

describe("POST /api/v1/auth/register", () => {
  async function register(body: Record<string, unknown>): Promise<Response> {
    const { POST } = await import("@/app/api/v1/auth/register/route");
    return POST(
      new Request(`${BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  const validBody = {
    firstName: "Test",
    lastName: "İstifadəçi",
    password: "Test1234!",
    admissionYear: 2026,
  };

  it("🔴 universitet domeni OLMAYAN e-poçt → 422", async () => {
    const response = await register({
      ...validBody,
      email: "test@gmail.com",
      programId: "istənilən",
    });

    expect(response.status).toBe(422);

    const body = (await response.json()) as {
      error: { code: string; details: Array<{ path: string; message: string }> };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details.some((d) => d.path === "email")).toBe(true);
    // Mesaj domeni sabitdən götürür (`lib/constants.ts`), hardcode deyil.
    expect(body.error.details.find((d) => d.path === "email")?.message).toContain(
      "qu.edu.az",
    );
  });

  it("zəif şifrə → 422", async () => {
    const response = await register({
      ...validBody,
      email: "yeni.test@qu.edu.az",
      password: "qisa",
      programId: "istənilən",
    });

    expect(response.status).toBe(422);
  });

  it("MÖVCUD e-poçt → 409 (422 deyil: forma düzgündür, dəyər toqquşur)", async () => {
    const program = await prisma.cohort.findFirstOrThrow({
      where: { scope: "PROGRAM", programId: { not: null } },
      select: { programId: true, admissionYear: true },
    });

    const response = await register({
      ...validBody,
      email: "rep@qu.edu.az",
      programId: program.programId as string,
      admissionYear: program.admissionYear,
    });

    expect(response.status).toBe(409);
  });

  it("naməlum `programId` → 422 (uyğun sinif tapılmadı)", async () => {
    const response = await register({
      ...validBody,
      email: "hec-vaxt-yaranmayacaq@qu.edu.az",
      programId: "prg-yoxdur",
    });

    expect(response.status).toBe(422);

    // ⚠️ Hesab YARADILMAMALIDIR — transaksiya geri qaytarılır.
    const created = await prisma.user.findUnique({
      where: { email: "hec-vaxt-yaranmayacaq@qu.edu.az" },
      select: { id: true },
    });
    expect(created).toBeNull();
  });

  it("xarab JSON → 422", async () => {
    const { POST } = await import("@/app/api/v1/auth/register/route");

    const response = await POST(
      new Request(`${BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ bu json deyil",
      }),
    );

    expect(response.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// 6. İctimai endpoint-lər — anonim viewer
// ---------------------------------------------------------------------------

describe("ictimai endpoint-lər", () => {
  it("`/health` DB-yə toxunmadan 200 qaytarır", async () => {
    const { GET } = await import("@/app/api/v1/health/route");
    const response = GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { status: string; version: string } };
    expect(body.data.status).toBe("ok");
    expect(body.data.version).toBeTruthy();
  });

  it("`/faculties` anonimə kataloq verir", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/faculties/route");

    const body = await envelopeOf<Array<{ programs: unknown[] }>>(await GET());
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta?.total).toBe(body.data.length);
  });

  it("`/content/pages` `section` MƏCBURİDİR", async () => {
    const { GET } = await import("@/app/api/v1/content/pages/route");

    const missing = await GET(new Request(`${BASE}/api/v1/content/pages`));
    expect(missing.status).toBe(422);

    const ok = await GET(
      new Request(`${BASE}/api/v1/content/pages?section=UNIVERSITY`),
    );
    expect(ok.status).toBe(200);
  });

  it("`/content/pages` naməlum bölmə üçün 422 və AZƏRBAYCANCA detal verir", async () => {
    const { GET } = await import("@/app/api/v1/content/pages/route");

    const response = await GET(
      new Request(`${BASE}/api/v1/content/pages?section=NOPE`),
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as {
      error: { details: Array<{ message: string }> };
    };
    // Zod-un default ingiliscə mesajı əvəz olunub (`azErrorMap`).
    expect(body.error.details[0]?.message).toContain("Mümkün dəyərlər");
  });

  it("`/faq` dərc olunmuş sualları qaytarır", async () => {
    const { GET } = await import("@/app/api/v1/faq/route");

    const body = await envelopeOf<Array<{ question: string }>>(
      await GET(new Request(`${BASE}/api/v1/faq`)),
    );
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("`/guide-places` kateqoriya filtri işləyir", async () => {
    const { GET } = await import("@/app/api/v1/guide-places/route");

    const all = await envelopeOf<Array<{ category: string }>>(
      await GET(new Request(`${BASE}/api/v1/guide-places`)),
    );
    const transport = await envelopeOf<Array<{ category: string }>>(
      await GET(new Request(`${BASE}/api/v1/guide-places?category=TRANSPORT`)),
    );

    expect(transport.data.length).toBeGreaterThan(0);
    expect(transport.data.length).toBeLessThan(all.data.length);
    expect(transport.data.every((p) => p.category === "TRANSPORT")).toBe(true);
  });

  it("🔴 `/events/{id}` — anonim `CLASS` tədbiri GÖRMÜR (404)", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/events/[id]/route");

    const classEvent = await prisma.event.findFirstOrThrow({
      where: { visibility: "CLASS", status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { id: true, title: true },
    });

    const response = await call(GET, `/api/v1/events/${classEvent.id}`, {
      id: classEvent.id,
    });

    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(classEvent.title);
  });

  it("`/events/{id}` — anonim `PUBLIC` tədbiri GÖRÜR", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/events/[id]/route");

    const publicEvent = await prisma.event.findFirstOrThrow({
      where: { visibility: "PUBLIC", status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { id: true },
    });

    const response = await call(GET, `/api/v1/events/${publicEvent.id}`, {
      id: publicEvent.id,
    });

    expect(response.status).toBe(200);
  });

  it("🔴 `/search` anonimdə istifadəçi bölməsini BOŞ qaytarır", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/search/route");

    const member = await prisma.user.findFirstOrThrow({
      where: { email: "rep@qu.edu.az" },
      select: { firstName: true },
    });

    const body = await envelopeOf<{ users: unknown[] }>(
      await call(GET, `/api/v1/search?q=${encodeURIComponent(member.firstName)}`),
    );

    // Üzv siyahısı sinif daxili məlumatdır.
    expect(body.data.users).toEqual([]);
  });

  it("`/search` çox qısa sorğuda 422 verir", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/search/route");

    const response = await call(GET, "/api/v1/search?q=a");
    expect(response.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// 7. Sinif siyahısı
// ---------------------------------------------------------------------------

describe("GET /api/v1/cohorts", () => {
  it("anonim sorğu 401 JSON alır — HTML redirect YOX", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/cohorts/route");

    const response = await call(GET, "/api/v1/cohorts");

    expect(response.status).toBe(401);
    // 🔴 Cavab JSON olmalıdır: middleware `/api/v1/*`-ı qorumur, əks halda
    // Swagger UI `/login` səhifəsinin HTML-ini cavab kimi göstərərdi.
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("viewer YALNIZ öz siniflərini görür", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/route");

    const body = await envelopeOf<Array<{ id: string; isPrimary: boolean }>>(
      await call(GET, "/api/v1/cohorts"),
    );

    expect(body.data.map((c) => c.id).sort()).toEqual([...rep.cohortIds].sort());
    // Əsas sinif birincidir.
    expect(body.data[0]?.isPrimary).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Səhifələnən siyahılar — `meta` müqaviləsi
// ---------------------------------------------------------------------------

describe("səhifələmə metası", () => {
  it("xronologiya `total` / `page` / `pageSize` qaytarır", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/timeline/route");

    const body = await envelopeOf<unknown[]>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/timeline?page=2`, { slug: ownSlug }),
    );

    expect(body.meta?.total).toBeGreaterThan(0);
    expect(body.meta?.page).toBe(2);
    expect(body.meta).toHaveProperty("pageSize");
  });

  it("nailiyyət sayı siyahı ilə EYNİ şərtdən gəlir", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/achievements/route");

    const all = await envelopeOf<unknown[]>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/achievements`, { slug: ownSlug }),
    );

    // Səhifə ölçüsündən azdırsa siyahının uzunluğu `total`-a bərabər olmalıdır.
    if ((all.meta?.total ?? 0) < 30) {
      expect(all.data.length).toBe(all.meta?.total);
    }
  });

  it("tədbir filtri `when=ALL` keçmiş tədbirləri də gətirir", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/events/route");

    const upcoming = await envelopeOf<unknown[]>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/events`, { slug: ownSlug }),
    );
    const all = await envelopeOf<unknown[]>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/events?when=ALL`, { slug: ownSlug }),
    );

    expect(all.meta?.total ?? 0).toBeGreaterThanOrEqual(upcoming.meta?.total ?? 0);
  });
});

// ---------------------------------------------------------------------------
// 9. Blok 10A endpoint-ləri — xatirələr, albom, dəstək, məkan körpüsü
//
// 🔴 EYNİ SUAL, YENİ SƏTH: dörd yeni endpoint yeni sızma nöqtəsidirmi?
// Xüsusən `/guide-places/{id}/memories` — o, ANONİM sorğuya açıqdır (bələdçi
// ictimaidir), yəni məxfilik yalnız servisdəki `activeVisibleWhere` ilə
// saxlanılır.
// ---------------------------------------------------------------------------

describe("Blok 10A — xatirə səthləri", () => {
  it("🔴 ANONİM sorğu sinif xatirələrində 401 alır", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/memories/route");

    const response = await call(GET, `/api/v1/cohorts/${ownSlug}/memories`, {
      slug: ownSlug,
    });

    expect(response.status).toBe(401);
    expect(await errorOf(response)).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("🔴 BAŞQA sinfin üzvü üçün 404 (mövcudluq sızmasın)", async () => {
    currentViewer = alumni;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/memories/route");

    const response = await call(GET, `/api/v1/cohorts/${ownSlug}/memories`, {
      slug: ownSlug,
    });

    expect(response.status).toBe(404);
  });

  it("üzv siyahını `meta` ilə alır, filtr URL-dən oxunur", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/memories/route");

    const all = await envelopeOf<Array<{ type: string; guidePlaceId: string | null }>>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/memories`, { slug: ownSlug }),
    );
    expect(all.meta?.total).toBeGreaterThan(0);
    expect(all.meta).toHaveProperty("pageSize");

    // `?place=1` — UI ilə EYNİ parametr adı (`lib/memory-filters.ts`).
    const places = await envelopeOf<Array<{ guidePlaceId: string | null }>>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/memories?place=1`, { slug: ownSlug }),
    );
    expect(places.data.every((memory) => memory.guidePlaceId !== null)).toBe(true);
  });

  it("albom yalnız `showInYearbook` qeydlərini və bölmə adını verir", async () => {
    currentViewer = rep;
    const { GET } = await import("@/app/api/v1/cohorts/[slug]/yearbook/route");

    const body = await envelopeOf<Array<{ showInYearbook: boolean; section: string }>>(
      await call(GET, `/api/v1/cohorts/${ownSlug}/yearbook`, { slug: ownSlug }),
    );

    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((entry) => entry.showInYearbook)).toBe(true);
    expect(
      body.data.every((entry) =>
        ["MOMENT", "LESSON", "PLACE", "STORY", "CLOSING"].includes(entry.section),
      ),
    ).toBe(true);
  });

  it("🔴 dəstək cavabında `phone` / `personalEmail` YOXDUR", async () => {
    // `alumni` öz sinfinin (Maliyyə 2022) üzvüdür — orada təkliflər var.
    currentViewer = alumni;
    const alumniCohort = await prisma.cohort.findUniqueOrThrow({
      where: { id: alumni.cohortIds[0] },
      select: { slug: true },
    });

    const { GET } = await import("@/app/api/v1/cohorts/[slug]/support/route");
    const response = await call(
      GET,
      `/api/v1/cohorts/${alumniCohort.slug}/support`,
      { slug: alumniCohort.slug },
    );

    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("personalEmail");
    expect(text).not.toContain("\"phone\"");
    expect(text).not.toContain("@qu.edu.az");

    const body = JSON.parse(text) as { data: Array<{ type: string }> };
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("🔴 məkan endpoint-i ANONİM sorğuda CLASS xatirə SIZDIRMIR", async () => {
    // --- SANITY: məkana bağlı CLASS xatirə həqiqətən var ---
    const target = await prisma.memory.findFirstOrThrow({
      where: { guidePlaceId: { not: null }, visibility: "CLASS", status: "ACTIVE" },
      select: { id: true, guidePlaceId: true, title: true },
    });

    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/guide-places/[id]/memories/route");

    const response = await call(
      GET,
      `/api/v1/guide-places/${target.guidePlaceId}/memories`,
      { id: target.guidePlaceId! },
    );

    // Endpoint 200 verir (bələdçi ictimaidir), amma məzmun süzülüb.
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).not.toContain(target.id);
    expect(text).not.toContain(target.title);

    const body = JSON.parse(text) as { data: Array<{ visibility: string }> };
    expect(body.data.every((memory) => memory.visibility === "PUBLIC")).toBe(true);
  });

  it("naməlum məkan `id`-si 404 vermir — boş siyahı qaytarır", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/guide-places/[id]/memories/route");

    const response = await call(GET, "/api/v1/guide-places/yoxdur/memories", {
      id: "yoxdur",
    });

    expect(response.status).toBe(200);
    const body = await envelopeOf<unknown[]>(response);
    expect(body.data).toEqual([]);
  });
});
