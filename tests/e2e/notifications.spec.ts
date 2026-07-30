// ============================================================================
// tests/e2e/notifications.spec.ts
// Blok 11A DoD — bildiriş mərkəzi [M15] və header rozeti.
//
// 🔴 FAYLIN ƏSAS SUALLARI:
//   1. rozet düzgün sayı göstərir və işarələmədən sonra AZALIR
//   2. «hamısını oxunmuş et» işləyir
//   3. 🔴 rozet ADMİN PANELİNDƏ DƏ səhv vermir (TƏLƏ C — `DashboardShell` hər
//      iki qrupda işlədilir, `QueryClientProvider` isə yalnız `(app)`-dədir)
//   4. bildiriş YALNIZ öz sahibinə görünür
//
// 🔴 TƏLƏ T19: server action-dan sonra siyahı SERVERDƏ yenilənir
// (`revalidatePath`), yəni klikdən dərhal sonra oxumaq KÖHNƏ vəziyyəti verir →
// `expect.poll` / `toPass`.
//
// ⚠️ Test YAZIR (`readAt` sütununu dəyişir): dəyişdirilən HƏR sətir
// `finally`-də GERİ QAYTARILIR — seed determinizmi pozulmamalıdır.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const MEMBER_EMAIL = "rep@qu.edu.az";
const ADMIN_EMAIL = "admin@qu.edu.az";

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

async function userIdOf(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  return user.id;
}

/** Sətirləri əvvəlki `readAt` dəyəri ilə geri qaytarır. */
async function restore(rows: Array<{ id: string; readAt: Date | null }>): Promise<void> {
  for (const row of rows) {
    await prisma.notification.update({ where: { id: row.id }, data: { readAt: row.readAt } });
  }
}

// ---------------------------------------------------------------------------
// 1. Siyahı və filtrlər
// ---------------------------------------------------------------------------

test("bildiriş mərkəzi açılır, siyahı və filtrlər görünür", async ({ page }) => {
  await login(page, MEMBER_EMAIL);
  await page.goto("/notifications");

  await expect(page.getByRole("heading", { level: 1, name: "Bildirişlər" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Oxunma vəziyyəti" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Bildiriş növü" })).toBeVisible();
});

test("filtrlər URL-dədir və nəticəni dəyişir", async ({ page }) => {
  await login(page, MEMBER_EMAIL);
  await page.goto("/notifications");

  await page.getByRole("link", { name: "Oxunmamış", exact: true }).click();
  await expect(page).toHaveURL(/status=unread/);

  // Filtrdən sonra göstərilən HƏR kart oxunmamışdır.
  const cards = page.locator("[data-unread]");
  const count = await cards.count();
  for (let i = 0; i < count; i += 1) {
    await expect(cards.nth(i)).toHaveAttribute("data-unread", "true");
  }

  // Tip filtri status filtrini SIFIRLAMIR (ikisi birlikdə işləyir).
  await page.getByRole("link", { name: "Sistem", exact: true }).click();
  await expect(page).toHaveURL(/status=unread/);
  await expect(page).toHaveURL(/type=SYSTEM/);
});

test("🔴 bildiriş YALNIZ öz sahibinə görünür", async ({ page }) => {
  const memberId = await userIdOf(MEMBER_EMAIL);

  const foreign = await prisma.notification.findFirstOrThrow({
    where: { recipientId: { not: memberId } },
    select: { title: true },
  });

  await login(page, MEMBER_EMAIL);
  await page.goto("/notifications");

  // Başqasının bildirişinin başlığı səhifədə OLMAMALIDIR.
  // (Başlıqlar şablondan gəlir, ona görə TAM uyğunluq yoxlanılır.)
  const own = await prisma.notification.count({
    where: { recipientId: memberId, title: foreign.title },
  });

  if (own === 0) {
    await expect(page.getByRole("heading", { name: foreign.title, exact: true })).toHaveCount(
      0,
    );
  }
});

// ---------------------------------------------------------------------------
// 2. Oxunmuş işarələmə + rozet
// ---------------------------------------------------------------------------

test("🔴 rozet oxunmamış sayı göstərir və işarələmədən sonra AZALIR", async ({ page }) => {
  const memberId = await userIdOf(MEMBER_EMAIL);

  const unread = await prisma.notification.findMany({
    where: { recipientId: memberId, readAt: null },
    select: { id: true, readAt: true },
  });

  test.skip(unread.length === 0, "seed-də bu istifadəçinin oxunmamış bildirişi yoxdur");

  await login(page, MEMBER_EMAIL);
  await page.goto("/notifications");

  const badge = page.getByTestId("notification-badge");

  /**
   * ⚠️ ROZET SIFIRDA RENDER OLUNMUR (`unread > 0 ? … : null`), yəni «0» MƏTNİNİ
   * gözləmək OLMAZ — element ümumiyyətlə yoxdur. Köməkçi hər iki halı vahid
   * ədədə çevirir: element varsa mətni, yoxdursa `0`.
   */
  const badgeCount = async (): Promise<number> =>
    (await badge.count()) === 0 ? 0 : Number((await badge.textContent())?.trim());

  await expect(badge).toBeVisible();
  expect(await badgeCount()).toBe(Math.min(unread.length, 99));

  try {
    // İlk oxunmamış kartın «Oxunmuş» düyməsi.
    await page.getByRole("button", { name: /bildirişini oxunmuş işarələ/ }).first().click();

    // 🔴 TƏLƏ T19 — `revalidatePath` serverdədir və səhifə `router.refresh()`
    // ilə yenidən çəkilir; klikdən DƏRHAL sonra oxumaq köhnə dəyəri verir.
    await expect.poll(badgeCount, { timeout: 10_000 }).toBe(unread.length - 1);

    // Bazada da dəyişib.
    await expect
      .poll(
        async () =>
          prisma.notification.count({ where: { recipientId: memberId, readAt: null } }),
        { timeout: 10_000 },
      )
      .toBe(unread.length - 1);
  } finally {
    await restore(unread);
  }
});

test("«hamısını oxunmuş et» işləyir və rozet itir", async ({ page }) => {
  const memberId = await userIdOf(MEMBER_EMAIL);

  const unread = await prisma.notification.findMany({
    where: { recipientId: memberId, readAt: null },
    select: { id: true, readAt: true },
  });

  test.skip(unread.length === 0, "oxunmamış bildiriş yoxdur");

  await login(page, MEMBER_EMAIL);
  await page.goto("/notifications");

  try {
    await page.getByRole("button", { name: "Hamısını oxunmuş et" }).click();

    await expect
      .poll(
        async () =>
          prisma.notification.count({ where: { recipientId: memberId, readAt: null } }),
        { timeout: 10_000 },
      )
      .toBe(0);

    // Rozet TAMAMİLƏ yox olur (0 olanda render edilmir).
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);
    await expect(page.getByTestId("unread-summary")).toHaveText(
      "Oxunmamış bildiriş yoxdur.",
    );
  } finally {
    await restore(unread);
  }
});

// ---------------------------------------------------------------------------
// 3. 🔴 TƏLƏ C — rozet admin panelində DƏ işləyir
// ---------------------------------------------------------------------------

test("🔴 header rozeti ADMİN PANELİNDƏ səhv vermir (TƏLƏ C)", async ({ page }) => {
  // `DashboardShell` həm `(app)`, həm `(admin)` qrupundadır, amma
  // `QueryClientProvider` yalnız `(app)`-dədir. Rozet TanStack Query işlətsəydi
  // admin paneli «No QueryClient set» ilə 500 verərdi (Blok 6, T18).
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await login(page, ADMIN_EMAIL);

  const response = await page.goto("/admin");
  expect(response?.status(), "/admin statusu").toBe(200);

  // Rozet admin header-ində render olunur (sidebar-da bildiriş linki YOXDUR —
  // `ADMIN_NAV` fərqlidir, ona görə burada `banner` daralması lazım deyil,
  // amma açıq yazılır ki, test naviqasiya dəyişikliyindən asılı olmasın).
  await expect(
    page.getByRole("banner").getByRole("link", { name: /Bildirişlər/ }),
  ).toBeVisible();

  expect(
    errors.filter((message) => /QueryClient/i.test(message)),
    "admin panelində QueryClient xətası",
  ).toHaveLength(0);
});

test("rozetdən bildiriş mərkəzinə keçid işləyir", async ({ page }) => {
  await login(page, MEMBER_EMAIL);
  await page.goto("/home");

  // ⚠️ «Bildirişlər» adı İKİ yerdədir — sidebar naviqasiyasında (`ME_SECTION`)
  // və header rozetində. Test HEADER-ə daralır (`<header>` → role `banner`),
  // yoxsa "strict mode violation" verir.
  await page.getByRole("banner").getByRole("link", { name: /Bildirişlər/ }).click();
  await expect(page).toHaveURL(/\/notifications$/);
});

// ---------------------------------------------------------------------------
// 4. Anonim giriş qapısı
// ---------------------------------------------------------------------------

test("anonim ziyarətçi /notifications-də /login-ə yönləndirilir", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // 🔴 TƏLƏ T16: təmiz kontekst — `clearCookies()` kifayət etmir.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fnotifications/);
  } finally {
    await context.close();
  }
});
