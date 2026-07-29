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

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { CohortScope, Visibility } from "@/lib/enums";
import { CONTROLLED_PROFILE_FIELDS, DEFAULT_PRIVATE_FIELDS } from "@/lib/visibility";

const prisma = new PrismaClient();

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
  await expect(page.getByRole("heading", { name: "Sinif heç vaxt bağlanmır" })).toBeVisible();

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
