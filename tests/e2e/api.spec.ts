// ============================================================================
// tests/e2e/api.spec.ts
// Blok 9S — `/api/v1` qatının REAL HTTP serverinə qarşı yoxlanışı.
//
// 🔴 NİYƏ BURADA, İNTEQRASİYA TESTİNDƏ DEYİL:
// `tests/integration/api.db.test.ts` route handler-ləri BİRBAŞA çağırır və
// `getViewer()`-i mock edir — Auth.js-in `auth()`-u Next sorğu konteksti olmadan
// işləmir. Yəni orada YOXLANA BİLMƏYƏN üç şey var və hamısı sprint
// kriteriyasıdır:
//   1. `signIn` HƏQİQƏTƏN sessiya kukisi qoyurmu (`Set-Cookie`)?
//   2. Həmin kuka ilə qorunan endpoint 200 verirmi?
//   3. Kuka OLMADAN cavab JSON-dur, HTML redirect DEYİL? (middleware)
// Bunlar yalnız real serverdə ölçülə bilər.
//
// ⚠️ `request.newContext()` işlədilir (T16): hər ssenari ÖZ kuka qabında qalır,
// yoxsa bir testdəki giriş digərinin "anonim" ssenarisini sındırır.
//
// ⚠️ RATE LIMIT DİQQƏTİ: `POST /auth/login` 10 dəqiqədə 5 uğursuz cəhdə icazə
// verir və sayğac PROSES YADDAŞINDADIR (server testlər arasında yenidən
// başlamır). Uğursuz cəhdlər ona görə FƏRQLİ e-poçtlarla edilir — açar
// `e-poçt + IP`-dir, yəni xanalar toqquşmur.
// ============================================================================

import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const REP = "rep@qu.edu.az";

const JSON_HEADERS = { "content-type": "application/json" };

test.afterAll(async () => {
  await prisma.$disconnect();
});

interface Envelope<T> {
  data: T;
  meta?: { total?: number; nextCursor?: string | null };
}

async function login(
  context: APIRequestContext,
  email: string,
  password = SEED_PASSWORD,
) {
  return context.post("/api/v1/auth/login", {
    headers: JSON_HEADERS,
    data: { email, password },
  });
}

// ---------------------------------------------------------------------------
// 1. Sağlamlıq və sənəd
// ---------------------------------------------------------------------------

test("GET /api/v1/health → 200 və `{ data: { status: \"ok\" } }`", async ({ request }) => {
  const response = await request.get("/api/v1/health");

  expect(response.status()).toBe(200);
  const body = (await response.json()) as Envelope<{ status: string; version: string }>;
  expect(body.data.status).toBe("ok");
  expect(body.data.version).toBeTruthy();
});

// ---------------------------------------------------------------------------
// 2. 🔴 İSTİFADƏÇİ SAYĞACI — eyni cavab, eyni mətn
// ---------------------------------------------------------------------------

test("🔴 yanlış şifrə və MÖVCUD OLMAYAN e-poçt EYNİ 401 cavabını verir", async ({
  playwright,
}) => {
  const context = await playwright.request.newContext();

  try {
    // ⚠️ İki FƏRQLİ e-poçt → iki fərqli rate-limit xanası; 5 cəhd həddinə
    // yaxınlaşmırıq.
    const wrongPassword = await context.post("/api/v1/auth/login", {
      headers: JSON_HEADERS,
      data: { email: REP, password: "TamamileYanlis9" },
    });

    // ⚠️ E-poçt ASCII olmalıdır: Zod-un `.email()` yoxlaması azərbaycan
    // hərflərini (`ə`, `ş`…) qəbul etmir və cavab 422 olardı — test isə
    // AUTENTİFİKASİYA cavabını (401) müqayisə edir, doğrulamanı yox.
    const unknownEmail = await context.post("/api/v1/auth/login", {
      headers: JSON_HEADERS,
      data: { email: "hec-vaxt-yoxdur@qu.edu.az", password: "TamamileYanlis9" },
    });

    expect(wrongPassword.status()).toBe(401);
    expect(unknownEmail.status()).toBe(401);

    // 🔴 Gövdələr BAYT-BAYT eyni olmalıdır: fərqli mətn hansı e-poçtun sistemdə
    // olduğunu ifşa edərdi (user enumeration).
    expect(await unknownEmail.text()).toBe(await wrongPassword.text());

    const body = (await wrongPassword.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("E-poçt və ya şifrə yanlışdır.");

    // Cavabda sessiya kukisi QOYULMUR.
    expect(wrongPassword.headers()["set-cookie"] ?? "").not.toContain(
      "authjs.session-token=ey",
    );
  } finally {
    await context.dispose();
  }
});

test("🔴 uğursuz cavabların MÜDDƏTİ də oxşardır (vaxt kanalı bağlıdır)", async ({
  playwright,
}) => {
  const context = await playwright.request.newContext();

  async function measure(email: string): Promise<number> {
    const started = Date.now();
    await context.post("/api/v1/auth/login", {
      headers: JSON_HEADERS,
      data: { email, password: "TamamileYanlis9" },
    });
    return Date.now() - started;
  }

  try {
    // Mövcud e-poçt → real bcrypt müqayisəsi.
    const existing = await measure(REP);
    // Mövcud OLMAYAN e-poçt → `equalizeFailureTiming` saxta bcrypt müqayisəsi.
    const missing = await measure("yoxdur-2@qu.edu.az");

    // ⚠️ Hədd BOL saxlanılır: CI-də şəbəkə və GC səsi bcrypt-in ~60-100 ms-indən
    // böyük ola bilər. Test "eyni müddət" DEYİL, "böyüklük sırası eyni"
    // iddiasını bərkidir — düzəliş ümumiyyətlə işləyirmi?
    const ratio = Math.max(existing, missing) / Math.max(1, Math.min(existing, missing));
    expect(
      ratio,
      `müddətlər çox fərqlidir: mövcud ${existing}ms, mövcud olmayan ${missing}ms`,
    ).toBeLessThan(8);
  } finally {
    await context.dispose();
  }
});

// ---------------------------------------------------------------------------
// 3. 🔴 CSRF — JSON məcburiyyəti
// ---------------------------------------------------------------------------

test("🔴 form POST-u 415 ilə rədd olunur (CSRF müdafiəsi)", async ({ playwright }) => {
  const context = await playwright.request.newContext();

  try {
    const response = await context.post("/api/v1/auth/login", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: `email=${encodeURIComponent(REP)}&password=${encodeURIComponent(SEED_PASSWORD)}`,
    });

    expect(response.status()).toBe(415);

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    // 🔴 ƏSAS İDDİA: sessiya YARANMADI. Doğru şifrə göndərilməsinə baxmayaraq
    // cross-site form POST-u ilə giriş etmək mümkün deyil.
    const session = await context.get("/api/v1/auth/session");
    expect(((await session.json()) as Envelope<unknown>).data).toBeNull();
  } finally {
    await context.dispose();
  }
});

// ---------------------------------------------------------------------------
// 4. Sprint kriteriyası: login → qorunan endpoint → session → logout
// ---------------------------------------------------------------------------

test("🔴 login sessiya kukisi qoyur, qorunan endpoint 200 verir, logout bağlayır", async ({
  playwright,
}) => {
  const context = await playwright.request.newContext();

  try {
    // (1) Anonim: qorunan endpoint 401 JSON qaytarır — HTML redirect YOX.
    const anonymous = await context.get("/api/v1/cohorts");
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["content-type"]).toContain("application/json");
    // 🔴 `/login` səhifəsinin HTML-i GƏLMƏMƏLİDİR (middleware `/api/v1`-i qorumur).
    expect(await anonymous.text()).not.toContain("<!DOCTYPE html>");

    // (2) Giriş.
    const loggedIn = await login(context, REP);
    expect(loggedIn.status()).toBe(200);

    const setCookie = loggedIn.headers()["set-cookie"] ?? "";
    expect(setCookie, "sessiya kukisi qoyulmadı").toContain("authjs.session-token=");

    const summary = (await loggedIn.json()) as Envelope<{
      userId: string;
      email: string;
      cohortIds: string[];
    }>;
    expect(summary.data.email).toBe(REP);
    expect(summary.data.cohortIds.length).toBeGreaterThan(0);

    // ⚠️ Cavabda həssas sahə YOXDUR.
    const raw = await loggedIn.text();
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("$2b$");

    // (3) Sessiya oxunur.
    const session = await context.get("/api/v1/auth/session");
    expect(session.status()).toBe(200);
    expect(((await session.json()) as Envelope<{ userId: string }>).data.userId).toBe(
      summary.data.userId,
    );

    // (4) Qorunan endpoint artıq 200 verir — kuka İŞLƏYİR.
    const cohorts = await context.get("/api/v1/cohorts");
    expect(cohorts.status()).toBe(200);

    const list = (await cohorts.json()) as Envelope<Array<{ slug: string }>>;
    expect(list.data.length).toBeGreaterThan(0);
    const slug = list.data[0].slug;

    // (5) Sinif məzmunu açılır.
    for (const suffix of ["", "/members", "/posts", "/timeline", "/achievements", "/events"]) {
      const response = await context.get(`/api/v1/cohorts/${slug}${suffix}`);
      expect(response.status(), `/api/v1/cohorts/{slug}${suffix}`).toBe(200);
    }

    // (6) Çıxış — 204, gövdə yoxdur.
    const loggedOut = await context.post("/api/v1/auth/logout", {
      headers: JSON_HEADERS,
      data: {},
    });
    expect(loggedOut.status()).toBe(204);
    expect(await loggedOut.text()).toBe("");

    // (7) Çıxışdan sonra sessiya `null`, qorunan endpoint yenə 401.
    const afterLogout = await context.get("/api/v1/auth/session");
    expect(((await afterLogout.json()) as Envelope<unknown>).data).toBeNull();
    expect((await context.get("/api/v1/cohorts")).status()).toBe(401);
  } finally {
    await context.dispose();
  }
});

// ---------------------------------------------------------------------------
// 5. 🔴 Sızma — başqa sinif
// ---------------------------------------------------------------------------

test("🔴 başqa sinfin lenti 404 verir və CLASS paylaşım SIZMIR", async ({
  playwright,
}) => {
  const context = await playwright.request.newContext();

  try {
    await login(context, REP);

    const own = await prisma.cohortMembership.findFirstOrThrow({
      where: { user: { email: REP } },
      select: { cohortId: true },
    });

    const foreign = await prisma.cohort.findFirstOrThrow({
      where: { id: { not: own.cohortId } },
      select: { slug: true, id: true },
    });

    const foreignPost = await prisma.post.findFirst({
      // `body: { not: null }` — sahə sxemdə nullable-dir (media-only paylaşım).
      where: {
        cohortId: foreign.id,
        visibility: "CLASS",
        status: "ACTIVE",
        body: { not: null },
      },
      select: { id: true, body: true },
    });

    const response = await context.get(`/api/v1/cohorts/${foreign.slug}/posts`);

    // 🔴 403 DEYİL: mövcudluq faktı da məlumatdır.
    expect(response.status()).not.toBe(403);
    expect(response.status()).toBe(404);

    const text = await response.text();
    if (foreignPost) {
      expect(text).not.toContain(foreignPost.id);
      expect(text).not.toContain((foreignPost.body as string).slice(0, 30));
    }
  } finally {
    await context.dispose();
  }
});

// ---------------------------------------------------------------------------
// 6. İctimai endpoint-lər anonim işləyir
// ---------------------------------------------------------------------------

test("ictimai endpoint-lər kuka OLMADAN 200 verir", async ({ request }) => {
  const paths = [
    "/api/v1/health",
    "/api/v1/faculties",
    "/api/v1/content/pages?section=UNIVERSITY",
    "/api/v1/faq",
    "/api/v1/guide-places",
    "/api/v1/auth/session",
    "/api/v1/openapi.json",
  ];

  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test("register: universitet domeni olmayan e-poçt 422 verir və hesab YARANMIR", async ({
  request,
}) => {
  const email = "xarici.domen@gmail.com";

  const response = await request.post("/api/v1/auth/register", {
    headers: JSON_HEADERS,
    data: {
      firstName: "Test",
      lastName: "İstifadəçi",
      email,
      password: SEED_PASSWORD,
      programId: "prg-istenilen",
      admissionYear: 2026,
    },
  });

  expect(response.status()).toBe(422);

  const body = (await response.json()) as {
    error: { code: string; details: Array<{ path: string }> };
  };
  expect(body.error.code).toBe("VALIDATION_FAILED");
  expect(body.error.details.some((d) => d.path === "email")).toBe(true);

  // ⚠️ Baza dəyişməmiş qalır — sonda seed sayları eynidir.
  expect(await prisma.user.findUnique({ where: { email }, select: { id: true } })).toBeNull();
});

// ---------------------------------------------------------------------------
// 7. Sprint kriteriyası: Register → Login → Session ardıcıllığı
// ---------------------------------------------------------------------------

test("🔴 Register → Login → Session ardıcıllığı işləyir", async ({ playwright }) => {
  const context = await playwright.request.newContext();
  const email = "blok9s.api.test@qu.edu.az";
  const password = "SprintTest9";

  /** Yaradılan hesabın id-si — `finally`-də silinir. */
  let createdUserId: string | null = null;

  try {
    // Kataloqdan REAL `programId` + qəbul ili götürülür (uydurma dəyər 422 verir).
    const catalog = (await (await context.get("/api/v1/faculties")).json()) as Envelope<
      Array<{ programs: Array<{ id: string; admissionYears: number[] }> }>
    >;
    const program = catalog.data
      .flatMap((faculty) => faculty.programs)
      .find((candidate) => candidate.admissionYears.length > 0);

    expect(program, "kataloqda qəbul ili olan ixtisas yoxdur").toBeTruthy();

    // (1) Qeydiyyat → 201.
    const registered = await context.post("/api/v1/auth/register", {
      headers: JSON_HEADERS,
      data: {
        firstName: "Sprint",
        lastName: "Yoxlaması",
        email,
        password,
        programId: program!.id,
        admissionYear: program!.admissionYears[0],
      },
    });

    expect(registered.status()).toBe(201);

    const created = (await registered.json()) as Envelope<{
      userId: string;
      cohortSlug: string;
    }>;
    createdUserId = created.data.userId;
    expect(created.data.cohortSlug).toBeTruthy();

    // ⚠️ Qeydiyyat AVTOMATİK GİRİŞ ETMİR (REST müqaviləsi) — sessiya hələ boş.
    expect(
      ((await (await context.get("/api/v1/auth/session")).json()) as Envelope<unknown>)
        .data,
    ).toBeNull();

    // (2) Giriş → 200.
    const loggedIn = await login(context, email, password);
    expect(loggedIn.status()).toBe(200);

    // (3) Sessiya yeni hesabı göstərir.
    const session = (await (await context.get("/api/v1/auth/session")).json()) as Envelope<{
      userId: string;
      email: string;
      cohortIds: string[];
    }>;
    expect(session.data.userId).toBe(createdUserId);
    expect(session.data.email).toBe(email);
    // Qeydiyyat sinfə bağladı.
    expect(session.data.cohortIds.length).toBe(1);
  } finally {
    await context.dispose();

    // 🔴 TƏMİZLƏMƏ: baza sayları seed ilə EYNİ qalmalıdır.
    // `onDelete: Cascade` üzvlük və `FieldVisibility` sətirlərini də aparır.
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
  }
});

// ---------------------------------------------------------------------------
// 8. Rate limit
// ---------------------------------------------------------------------------

test("🔴 beşinci uğursuz cəhddən sonra 429 və `Retry-After` gəlir", async ({
  playwright,
}) => {
  const context = await playwright.request.newContext();
  // ⚠️ Bu testə MƏXSUS e-poçt: sayğac açarı `e-poçt + IP`-dir, yəni digər
  // testlərin cəhdləri bu xanaya düşmür (və əksinə).
  const email = "rate.limit.blok9s@qu.edu.az";

  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await context.post("/api/v1/auth/login", {
        headers: JSON_HEADERS,
        data: { email, password: "YanlisSifre9" },
      });
      expect(response.status(), `${attempt}-ci cəhd`).toBe(401);
    }

    const blocked = await context.post("/api/v1/auth/login", {
      headers: JSON_HEADERS,
      data: { email, password: "YanlisSifre9" },
    });

    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["retry-after"]).toBeTruthy();

    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe("TOO_MANY_REQUESTS");
  } finally {
    await context.dispose();
  }
});
