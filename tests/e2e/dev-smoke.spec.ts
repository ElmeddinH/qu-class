// ============================================================================
// tests/e2e/dev-smoke.spec.ts
// "F5 basanda proqram işləyir" yoxlaması — DEV serverə qarşı.
//
// ⚠️ `npm run test:e2e` bunu İŞLƏTMİR. Səbəb: `playwright.config.ts` istehsal
// build-inə (`next start`) bağlıdır, bu fayl isə `next dev`-ə. İkisi eyni
// konfiqdə olsa Playwright hər ikisini eyni serverə qarşı işlədərdi.
// Ayrıca konfiq: `npm run test:e2e:dev` (playwright.dev.config.ts).
//
// Yoxlanılır: F5-in nəticəsi kimi açılan səhifə həqiqətən işləyirmi —
// status, məzmun, giriş axını və BRAUZER KONSOLUNDA XƏTA OLMAMASI.
// ============================================================================

import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Səhifə xətalarını toplayır: `pageerror` (tutulmamış istisna) + `console.error`.
 *
 * ⚠️ Dev rejimində React/Next özü bəzi məlumat mesajlarını `console.error`-la
 * yazır (məs. Fast Refresh, DevTools tövsiyəsi) — onlar süzülür, yoxsa test
 * həqiqi xəta olmadan qırmızı olar.
 */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /React DevTools/i,
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    errors.push(`console.error: ${text}`);
  });

  return errors;
}

test("F5 axını: / açılır, giriş işləyir, konsolda xəta yoxdur", async ({ page }) => {
  const errors = collectErrors(page);

  // --- 1. Başlanğıc səhifə (F5-in açdığı ünvan) ---
  const home = await page.goto("/");
  expect(home?.status(), "GET / statusu").toBe(200);
  await expect(page.getByRole("heading", { name: "Sinif heç vaxt bağlanmır" })).toBeVisible();

  // --- 2. Giriş səhifəsi və forması ---
  const login = await page.goto("/login");
  expect(login?.status(), "GET /login statusu").toBe(200);
  await expect(page.getByLabel("Universitet e-poçtu")).toBeVisible();
  await expect(page.getByLabel("Şifrə", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Daxil ol" })).toBeVisible();

  // --- 3. Seed hesabı ilə giriş → sinif səhifəsi ---
  await page.getByLabel("Universitet e-poçtu").fill("alumni@qu.edu.az");
  await page.getByLabel("Şifrə", { exact: true }).fill("Test1234!");
  await page.getByRole("button", { name: "Daxil ol" }).click();

  await page.waitForURL("**/class/**");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // --- 4. /kuds — giriş etmiş halda açılmalıdır ---
  const kuds = await page.goto("/kuds");
  expect(kuds?.status(), "GET /kuds statusu (giriş edilmiş)").toBe(200);
  await expect(page).toHaveURL(/\/kuds$/);

  // --- 5. Konsol təmiz ---
  expect(errors, `Brauzer konsolunda xəta:\n${errors.join("\n")}`).toEqual([]);
});
