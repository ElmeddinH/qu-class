// ============================================================================
// tests/e2e/auth.spec.ts
// Blok 2 DoD — auth axınının uçdan-uca yoxlanışı.
//
// Yoxlanılır:
//   · 5 seed hesabının hər biri ilə giriş və düzgün səhifəyə düşmə
//   · admin → /admin açılır; adi istifadəçi → /admin bağlıdır
//   · anonim istifadəçi qorunan səhifədən /login-ə yönləndirilir
//   · qeydiyyat: User + CohortMembership + FieldVisibility (phone/personalEmail
//     PRIVATE) — nəticə BAZADAN yoxlanılır
//   · `/` və `/kuds` ünvanları route qruplarından sonra da işləyir
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { loadEnvConfig } from "@next/env";
import { encode } from "next-auth/jwt";

import { SESSION_COOKIE_NAME } from "@/auth.config";
import { CohortScope, Visibility } from "@/lib/enums";
import { CONTROLLED_PROFILE_FIELDS, DEFAULT_PRIVATE_FIELDS } from "@/lib/visibility";

const prisma = new PrismaClient();

// `next start` `.env`-i özü oxuyur, test PROSESİ isə yox — `AUTH_SECRET`
// olmadan aşağıdaki sessiya kukisi serverin gözlədiyi açarla imzalanmazdı.
loadEnvConfig(process.cwd());

const SEED_PASSWORD = "Test1234!";

/** PLAN.md §7 — seed test hesabları. */
const SEED_ACCOUNTS = [
  { email: "admin@qu.edu.az", isAdmin: true },
  { email: "moderator@qu.edu.az", isAdmin: false },
  { email: "rep@qu.edu.az", isAdmin: false },
  { email: "coordinator@qu.edu.az", isAdmin: false },
  { email: "alumni@qu.edu.az", isAdmin: false },
] as const;

/** Həmin hesabın əsas cohort slug-ı — gözlənilən ünvan bazadan götürülür. */
async function primaryCohortSlugOf(email: string): Promise<string> {
  const membership = await prisma.cohortMembership.findFirst({
    where: { user: { email } },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
    select: { cohort: { select: { slug: true } } },
  });
  if (!membership) throw new Error(`${email} üçün cohort üzvlüyü tapılmadı`);
  return membership.cohort.slug;
}

async function login(page: Page, email: string, password = SEED_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Daxil ol" }).click();
}

/**
 * Yönləndirmə zəncirini ÖLÇÜR: `page.goto()` yalnız SON cavabı verir, dövrənin
 * uzunluğunu isə `redirectedFrom()` zənciri göstərir.
 */
function redirectChainOf(response: Awaited<ReturnType<Page["goto"]>>): string[] {
  const chain: string[] = [];
  let request = response?.request() ?? null;
  while (request) {
    chain.unshift(request.url());
    request = request.redirectedFrom();
  }
  return chain;
}

/**
 * Serverin qəbul etdiyi, amma DB-də KARŞILIĞI OLMAYAN sessiya kukisi.
 *
 * Məhz bu vəziyyət 2026-07-30-da "ağ ekran"a səbəb oldu: baza yenidən seed
 * ediləndə brauzerdəki kuka keçərli qaldı, içindəki `userId` isə itdi.
 * Kuka `AUTH_SECRET` ilə real şəkildə imzalanır — server onu öz kukisi kimi
 * qəbul edir, yəni test saxta yol yox, ƏSL vəziyyəti yaradır.
 */
async function staleSessionCookie(): Promise<string> {
  return encode({
    token: {
      userId: "usr-silinmis-hesab",
      sub: "usr-silinmis-hesab",
      systemRole: "USER",
    },
    secret: process.env.AUTH_SECRET!,
    // Auth.js duz kimi KUKA ADINI işlədir — ad ilə duz ayrılsa token açılmaz.
    salt: SESSION_COOKIE_NAME,
    maxAge: 60 * 60,
  });
}

/** Verilmiş sessiya kukisi ilə TƏMİZ kontekst (T16: hər hesab öz konteksti). */
async function contextWithSession(browser: Browser, token: string) {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Seed hesabları ilə giriş
// ---------------------------------------------------------------------------

for (const account of SEED_ACCOUNTS) {
  test(`giriş: ${account.email} əsas sinif səhifəsinə düşür`, async ({ page }) => {
    const slug = await primaryCohortSlugOf(account.email);

    await login(page, account.email);

    // /home → əsas cohort-a yönləndirir
    await page.waitForURL(`**/class/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Header-də real ad görünür (DEMO deyil)
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: account.email },
      select: { firstName: true, lastName: true },
    });
    await expect(
      page.getByRole("button", { name: new RegExp(`${user.firstName} ${user.lastName}`) }),
    ).toBeVisible();
  });
}

// ---------------------------------------------------------------------------
// 2. Admin marşrutu
// ---------------------------------------------------------------------------

test("admin@qu.edu.az /admin panelini aça bilir", async ({ page }) => {
  await login(page, "admin@qu.edu.az");
  await page.waitForURL("**/class/**");

  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "İdarə paneli" })).toBeVisible();
});

test("alumni@qu.edu.az /admin panelinə buraxılmır", async ({ page }) => {
  await login(page, "alumni@qu.edu.az");
  await page.waitForURL("**/class/**");

  await page.goto("/admin");
  // Middleware admin olmayanı /home-a atır, o da əsas sinfə yönləndirir.
  await expect(page).not.toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "İdarə paneli" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 3. Anonim istifadəçi
// ---------------------------------------------------------------------------

test("anonim istifadəçi /home-dan /login-ə yönləndirilir", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhome/);
});

test("anonim istifadəçi /admin-ə buraxılmır", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
});

test("/ açıqdır, /kuds isə auth arxasındadır", async ({ page }) => {
  const home = await page.goto("/");
  expect(home?.status()).toBe(200);

  // ⚠️ Blok 9S: açılış səhifəsinin PLACEHOLDER-i əsl Welcome Page ilə əvəz
  // olundu, başlıq da dəyişdi ("Sinif heç vaxt bağlanmır" → dəyər təklifi).
  // Bu test yalnız `/`-ın AÇIQ olduğunu yoxlayır; bölmələrin məzmunu
  // `tests/e2e/landing.spec.ts`-dədir.
  await expect(
    page.getByRole("heading", { level: 1, name: /Sinfin bir yerdə/ }),
  ).toBeVisible();

  // Route qrupu URL-i dəyişmir: /kuds yenə də /kuds-dur, amma indi qorunur.
  await page.goto("/kuds");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fkuds/);

  await login(page, "rep@qu.edu.az");
  await page.waitForURL("**/class/**");

  const kuds = await page.goto("/kuds");
  expect(kuds?.status()).toBe(200);
  await expect(page).toHaveURL(/\/kuds$/);
});

// ---------------------------------------------------------------------------
// 4. Qeydiyyat
// ---------------------------------------------------------------------------

test("qeydiyyat: istifadəçi + üzvlük + FieldVisibility yaranır", async ({ page }) => {
  // Hər icrada unikal e-poçt — testin təkrar işlədilməsi üçün.
  const stamp = Date.now().toString(36);
  const email = `test.qeydiyyat.${stamp}@qu.edu.az`;
  const password = "Test1234!";

  // Cohort-u mövcud olan real bir ixtisas/il cütü seçilir.
  const cohort = await prisma.cohort.findFirstOrThrow({
    where: { scope: CohortScope.PROGRAM, programId: { not: null } },
    orderBy: { admissionYear: "desc" },
    select: {
      slug: true,
      admissionYear: true,
      program: {
        select: { id: true, name: true, faculty: { select: { name: true } } },
      },
    },
  });
  const program = cohort.program!;

  try {
    await page.goto("/register");

    await page.getByLabel("Ad", { exact: true }).fill("Test");
    await page.getByLabel("Soyad").fill("Namizəd");
    await page.getByLabel("Universitet e-poçtu").fill(email);
    await page.getByLabel("Şifrə", { exact: true }).fill(password);
    await page.getByLabel("Şifrənin təkrarı").fill(password);

    // Asılı select-lər: fakültə → ixtisas → qəbul ili.
    // ⚠️ Trigger-lər placeholder mətninə görə DEYİL, FormLabel-dən gələn
    // əlçatan ada görə seçilir — "Əvvəlcə fakültə seçin" placeholder-i
    // "Fakültə seçin" alt sətrini də ehtiva edir və filtr iki elementə düşür.
    await page.getByRole("combobox", { name: "Fakültə" }).click();
    await page.getByRole("option", { name: program.faculty.name }).click();

    await page.getByRole("combobox", { name: "İxtisas" }).click();
    await page.getByRole("option", { name: program.name, exact: true }).click();

    await page.getByRole("combobox", { name: "Qəbul ili" }).click();
    await page.getByRole("option", { name: String(cohort.admissionYear) }).click();

    await page.getByRole("button", { name: "Qeydiyyatdan keç" }).click();

    // Qeydiyyat → avtomatik giriş → /home → əsas sinif səhifəsi
    await page.waitForURL(`**/class/${cohort.slug}`);

    // --- Baza yoxlaması ---
    const created = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        systemRole: true,
        memberships: { select: { cohortId: true, role: true, isPrimary: true } },
        fieldVisibility: { select: { field: true, level: true } },
      },
    });

    expect(created.firstName).toBe("Test");
    expect(created.systemRole).toBe("USER");

    // Şifrə açıq saxlanılmır və seed-in SABİT duzu işlədilmir.
    expect(created.passwordHash).not.toContain(password);
    expect(created.passwordHash.startsWith("$2")).toBe(true);
    expect(created.passwordHash).not.toContain("QUCLASSseedSalt");

    expect(created.memberships).toHaveLength(1);
    expect(created.memberships[0]).toMatchObject({ role: "MEMBER", isPrimary: true });

    // Bütün idarə olunan sahələr üçün sətir var...
    const levels = new Map(created.fieldVisibility.map((f) => [f.field, f.level]));
    for (const field of CONTROLLED_PROFILE_FIELDS) {
      expect(levels.has(field), `"${field}" üçün FieldVisibility sətri yoxdur`).toBe(true);
    }

    // ...və məhrəm sahələr PRIVATE-dir (spesifikasiya §5).
    for (const field of DEFAULT_PRIVATE_FIELDS) {
      expect(levels.get(field), `"${field}" PRIVATE olmalıdır`).toBe(Visibility.PRIVATE);
    }
    expect(levels.get("bio")).toBe(Visibility.CLASS);
  } finally {
    // Test bazanı özündən sonra təmizləyir (üzvlük və məxfilik sətirləri
    // `onDelete: Cascade` ilə birlikdə silinir).
    await prisma.user.deleteMany({ where: { email } });
  }
});

test("qeydiyyat: universitet domeni olmayan e-poçt qəbul edilmir", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Universitet e-poçtu").fill("kenar.istifadeci@gmail.com");
  await page.getByRole("button", { name: "Qeydiyyatdan keç" }).click();

  await expect(page.getByText("@qu.edu.az ilə bitməlidir")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. 🔴 YÖNLƏNDİRMƏ DÖVRƏSİ (2026-07-30 nasazlığının qoruyucusu)
//
// Nasazlıq: `/login` və `/register` ağ ekran verirdi. Səbəb sonsuz DÖVRƏ idi —
//   /login --(middleware: kuka var)--------------> /home
//   /home  --(layout: userId DB-də yoxdur)-------> /login
// Aşağıdaki testlər dövrənin hər iki ucunu ayrıca bağlayır.
// ---------------------------------------------------------------------------

test("🔴 TƏMİZ kontekstdə /login və /register açılır", async ({ browser }) => {
  // ⚠️ T16: kukisiz, tamamilə təmiz kontekst — mövcud sessiya nəticəni gizlədə bilər.
  const context = await browser.newContext();
  try {
    const page = await context.newPage();

    const login = await page.goto("/login");
    expect(login?.status(), "/login açılmalıdır").toBe(200);
    expect(redirectChainOf(login), "kukisiz /login yönləndirilməməlidir").toHaveLength(1);
    await expect(page.getByRole("heading", { level: 1, name: "Daxil ol" })).toBeVisible();

    const register = await page.goto("/register");
    expect(register?.status(), "/register açılmalıdır").toBe(200);
    expect(redirectChainOf(register)).toHaveLength(1);
    await expect(page.getByRole("heading", { level: 1, name: "Qeydiyyat" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("🔴 giriş etmiş istifadəçi /login-ə girəndə sinif səhifəsinə düşür (dövrə yox)", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const slug = await primaryCohortSlugOf("rep@qu.edu.az");

    await login(page, "rep@qu.edu.az");
    await page.waitForURL(`**/class/${slug}`);

    // Giriş etmiş halda birbaşa /login-ə cəhd: /login → /home → /class/<slug>.
    const response = await page.goto("/login");
    const chain = redirectChainOf(response);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/class/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Dövrə olsaydı zəncir eyni ünvanları təkrarlayardı və uzanardı.
    expect(chain.length, `zəncir: ${chain.join(" → ")}`).toBeLessThanOrEqual(3);
    expect(new Set(chain).size, `təkrarlanan ünvan: ${chain.join(" → ")}`).toBe(
      chain.length,
    );
  } finally {
    await context.close();
  }
});

test("🔴 köhnəlmiş sessiya kukisi dövrə yox, təmiz /login verir", async ({ browser }) => {
  const context = await contextWithSession(browser, await staleSessionCookie());
  try {
    const page = await context.newPage();

    // Düzəlişdən əvvəl bu sətir `ERR_TOO_MANY_REDIRECTS` ilə bitirdi.
    const response = await page.goto("/login");
    const chain = redirectChainOf(response);

    expect(response?.status(), `zəncir: ${chain.join(" → ")}`).toBe(200);
    await expect(page).toHaveURL(/\/login\?expired=1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Daxil ol" })).toBeVisible();
    // ⚠️ `getByRole("alert")` təkbaşına iki elementə düşür — Next.js öz
    // `__next-route-announcer__` elementini də `role="alert"` ilə qoyur.
    await expect(
      page.getByRole("alert").filter({ hasText: "Sessiyanız etibarsız oldu" }),
    ).toBeVisible();

    // /login → /home → /api/session/expired → /login?expired=1
    expect(chain.length, `zəncir: ${chain.join(" → ")}`).toBeLessThanOrEqual(4);

    // 🔴 Dövrəni məhz bu kəsir: kuka silinib, ikinci cəhd yönləndirilmir.
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === SESSION_COOKIE_NAME)?.value ?? "").toBe("");

    const second = await page.goto("/login");
    expect(redirectChainOf(second)).toHaveLength(1);
  } finally {
    await context.close();
  }
});

test("🔴 köhnəlmiş kuka ilə qorunan səhifə də /login-də dayanır", async ({ browser }) => {
  const context = await contextWithSession(browser, await staleSessionCookie());
  try {
    const page = await context.newPage();

    const response = await page.goto("/home");
    const chain = redirectChainOf(response);

    expect(response?.status(), `zəncir: ${chain.join(" → ")}`).toBe(200);
    await expect(page).toHaveURL(/\/login\?expired=1$/);
    expect(chain.length, `zəncir: ${chain.join(" → ")}`).toBeLessThanOrEqual(4);
  } finally {
    await context.close();
  }
});

test("🔴 cohort-suz istifadəçi /home-da qalır, dövrəyə düşmür", async ({ browser }) => {
  // Seed-dəki hər istifadəçinin cohort-u var → bu hal üçün istifadəçi burada
  // yaradılır və test özündən sonra təmizləyir (qeydiyyat testi ilə eyni üslub).
  const stamp = Date.now().toString(36);
  const email = `test.cohortsuz.${stamp}@qu.edu.az`;

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashSync(SEED_PASSWORD, 10),
      firstName: "Cohortsuz",
      lastName: "İstifadəçi",
    },
  });

  const context = await browser.newContext();
  try {
    const page = await context.newPage();

    await login(page, email);

    // /home yönləndirmir — izahlı ekran göstərir (PLAN.md §7).
    await page.waitForURL("**/home");
    await expect(page.getByText("Sinif səhifəniz hələ təyin olunmayıb")).toBeVisible();

    // Səhifənin yenidən açılışı da dövrəyə düşmür.
    const response = await page.goto("/home");
    expect(response?.status()).toBe(200);
    expect(redirectChainOf(response)).toHaveLength(1);
  } finally {
    await context.close();
    await prisma.user.deleteMany({ where: { email } });
  }
});
