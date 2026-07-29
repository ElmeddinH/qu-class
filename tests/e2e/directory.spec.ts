// ============================================================================
// tests/e2e/directory.spec.ts
// Blok 6 DoD — Class Directory [M6] + qlobal axtarış [M16].
//
// Yoxlanılır:
//   · filtr tətbiq olunur → URL dəyişir → səhifə yenilənir → filtr QALIR
//     (paylaşıla bilən link)
//   · filtr kombinasiyası (select + çoxlu seçim) URL-də birlikdə saxlanılır
//   · 13 filtrin hamısı paneldə görünür (məzun sinfində hər filtrin dəyəri var)
//   · ⌘K palitrası açılır, yazılır, nəticəyə klikləyib profilə düşülür
//   · kataloq üzv OLMAYAN hesaba boş görünür (məxfilik sərhədi)
//
// 🔴 TƏLƏ T16: bir testin içində NÖVBƏ İLƏ iki hesabla giriş etmək üçün
// `clearCookies()` KİFAYƏT ETMİR — `SessionProvider` fonda
// `/api/auth/session`-ə müraciət edir və sessiya kukisi təmizləmə ilə
// naviqasiya arasında yenidən qurula bilir; üstəlik giriş etmiş istifadəçini
// middleware `/login`-dən uzaqlaşdırır, yəni forma ortada olmur və test donur.
// Həll: hər hesab üçün `browser.newContext()` (aşağıdaki `withAccount`).
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";

/** PLAN.md §7: `rep` sec2023 sinif nümayəndəsi, `alumni` fin2018 məzunu. */
const STUDENT = { email: "rep@qu.edu.az", slug: "informasiya-tehlukesizliyi-2027" };
const ALUMNI = { email: "alumni@qu.edu.az", slug: "maliyye-2022" };

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

/** Hər hesab üçün TƏMİZ kontekst — bax fayl başındaki T16 qeydi. */
async function withAccount<T>(
  browser: Browser,
  email: string,
  body: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, email);
    return await body(page);
  } finally {
    await context.close();
  }
}

/**
 * Səhifədəki "N nəticə" sətrindən rəqəmi oxuyur.
 *
 * ⚠️ Bu sətir SERVERDƏ render olunur. `nuqs` URL-i dərhal dəyişir, nəticə isə
 * server cavabı ilə gəlir — yəni `waitForURL`-dən sonra dərhal oxumaq KÖHNƏ
 * rəqəmi verir. Dəyişikliyi gözləmək üçün `expect.poll` işlədilir.
 */
async function resultCount(page: Page): Promise<number> {
  const text = await page.getByText(/^\d+ nəticə/).first().innerText();
  return Number.parseInt(text, 10);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Filtr → URL → yenilənmə (paylaşıla bilən link)
// ---------------------------------------------------------------------------

test("filtr URL-də saxlanılır və səhifə yeniləndikdən sonra qalır", async ({ page }) => {
  await login(page, STUDENT.email);
  await page.goto(`/class/${STUDENT.slug}/directory`);

  await expect(page.getByRole("heading", { level: 1, name: "Sinif kataloqu" })).toBeVisible();

  const before = await resultCount(page);
  expect(before).toBeGreaterThan(1);

  // --- Şəhər filtri: Radix Select → ilk real seçim ("Bütün şəhərlər"dən sonrakı)
  await page.getByLabel("Şəhər").click();
  const firstOption = page.getByRole("option").nth(1);
  const optionText = await firstOption.innerText();
  await firstOption.click();

  // Filtr URL-ə düşür — server komponenti yenidən süzgəci DB-də tətbiq edir.
  await page.waitForURL(/[?&]city=/);

  // Server cavabını gözlə: rəqəm dəyişənə qədər köhnə nəticə görünür.
  await expect.poll(() => resultCount(page), { timeout: 15_000 }).toBeLessThan(before);

  const filtered = await resultCount(page);
  expect(filtered).toBeGreaterThan(0);

  // Aktiv filtr çipi göstərilir
  const cityName = optionText.replace(/\s*\(\d+\)\s*$/, "").trim();
  await expect(page.getByText(cityName, { exact: false }).first()).toBeVisible();

  // --- Paylaşıla bilən link: eyni URL yenidən açılanda EYNİ nəticə ---
  const sharedUrl = page.url();
  await page.reload();

  await expect(page).toHaveURL(sharedUrl);
  await expect.poll(() => resultCount(page), { timeout: 15_000 }).toBe(filtered);
  await expect(page.getByRole("button", { name: /filtrini götür/ }).first()).toBeVisible();
});

test("filtr kombinasiyası (şəhər + maraq) URL-də birlikdə saxlanılır", async ({ page }) => {
  await login(page, STUDENT.email);
  await page.goto(`/class/${STUDENT.slug}/directory`);

  await page.getByLabel("Şəhər").click();
  await page.getByRole("option").nth(1).click();
  await page.waitForURL(/[?&]city=/);

  // Maraq — çoxlu seçim (checkbox)
  const interests = page.getByRole("group", { name: "Maraqlar" }).getByRole("checkbox");
  await interests.first().click();
  await page.waitForURL(/[?&]interest=/);

  const url = new URL(page.url());
  expect(url.searchParams.get("city")).toBeTruthy();
  expect(url.searchParams.get("interest")).toBeTruthy();
  // Filtr dəyişəndə səhifə 1-ə qayıdır → `page` parametri URL-ə yazılmır.
  expect(url.searchParams.get("page")).toBeNull();

  // "Hamısını təmizlə" bütün filtrləri atır
  await page.getByRole("button", { name: "Hamısını təmizlə" }).click();
  await page.waitForURL((next) => !next.search.includes("city="));
  expect(new URL(page.url()).searchParams.toString()).toBe("");
});

// ---------------------------------------------------------------------------
// 2. 13 filtrin hamısı paneldə
// ---------------------------------------------------------------------------

test("13 filtrin hamısı paneldə görünür (məzun sinfi)", async ({ page }) => {
  // Məzun sinfində hər filtrin DB-də dəyəri var (tələbə sinfində `sənaye` və
  // `şirkət` boşdur — o filtrlər ölü seçim kimi göstərilmir).
  await login(page, ALUMNI.email);
  await page.goto(`/class/${ALUMNI.slug}/directory`);

  const labels = [
    "Ad və ya soyad",
    "Fakültə",
    "İxtisas",
    "Qəbul ili",
    "Məzuniyyət ili",
    "Status",
    "Şəhər",
    "Ölkə",
    "Fəaliyyət sahəsi",
    "Şirkət",
  ];

  for (const label of labels) {
    await expect(page.getByLabel(label), `«${label}» filtri`).toBeVisible();
  }

  // Çoxlu seçim filtrləri `fieldset`/`legend` ilə qurulur.
  for (const group of ["Maraqlar", "Dil bacarıqları", "Tələbə klubu"]) {
    await expect(page.getByRole("group", { name: group }), `«${group}» filtri`).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 3. ⌘K palitrası [M16]
// ---------------------------------------------------------------------------

test("⌘K palitrası açılır, nəticəyə klikləyəndə profilə aparır", async ({ page }) => {
  const classmate = await prisma.user.findFirstOrThrow({
    where: { memberships: { some: { cohort: { slug: STUDENT.slug } } } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { id: "asc" },
  });

  await login(page, STUDENT.email);
  await page.goto(`/class/${STUDENT.slug}`);

  await page.keyboard.press("ControlOrMeta+k");

  const input = page.getByPlaceholder(/Sinif yoldaşı, paylaşım/);
  await expect(input).toBeVisible();

  await input.fill(`${classmate.firstName} ${classmate.lastName}`);

  const hit = page.getByRole("option", {
    name: new RegExp(`${classmate.firstName} ${classmate.lastName}`),
  });
  await expect(hit.first()).toBeVisible({ timeout: 15_000 });
  await hit.first().click();

  await expect(page).toHaveURL(new RegExp(`/u/${classmate.id}$`));
});

test("palitra «Hamısına bax» tam nəticə səhifəsinə aparır", async ({ page }) => {
  const classmate = await prisma.user.findFirstOrThrow({
    where: { memberships: { some: { cohort: { slug: STUDENT.slug } } } },
    select: { firstName: true },
    orderBy: { id: "asc" },
  });

  await login(page, STUDENT.email);
  await page.goto(`/class/${STUDENT.slug}`);

  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder(/Sinif yoldaşı, paylaşım/).fill(classmate.firstName);

  const all = page.getByRole("option", { name: /Hamısına bax/ });
  await expect(all).toBeVisible({ timeout: 15_000 });
  await all.click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { level: 1, name: "Axtarış" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Sinif yoldaşları/ })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Məxfilik sərhədi — iki hesab, İKİ AYRI KONTEKST (TƏLƏ T16)
// ---------------------------------------------------------------------------

test("kataloq yalnız sinif üzvünə açılır", async ({ browser }) => {
  // Üzv: nəticə var.
  const memberCount = await withAccount(browser, STUDENT.email, async (page) => {
    await page.goto(`/class/${STUDENT.slug}/directory`);
    await expect(page.getByText(/^\d+ nəticə/).first()).toBeVisible();
    return resultCount(page);
  });
  expect(memberCount).toBeGreaterThan(0);

  // Kənar hesab: EYNİ URL, boş kataloq. `clearCookies()` ilə deyil, AYRI
  // kontekstlə giriş edilir — bax fayl başındaki T16 qeydi.
  await withAccount(browser, ALUMNI.email, async (page) => {
    await page.goto(`/class/${STUDENT.slug}/directory`);

    await expect(page.getByText("Kataloq boşdur")).toBeVisible();
    expect(await resultCount(page)).toBe(0);
  });
});
