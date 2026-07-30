// ============================================================================
// tests/e2e/public-nav.spec.ts
// İctimai naviqasiya — HEÇ BİR LİNK 404 VERMİR.
//
// 🔴 TESTİN TARİXÇƏSİ: `PUBLIC_NAV` və `FOOTER_NAV` Blok 2-dən bəri hələ
// mövcud olmayan səhifələrə (`/about`, `/faculties`, `/events`…) baxırdı — hər
// klik 404 idi. Blok 9-da linklər MÜVƏQQƏTİ olaraq açılış səhifəsinin
// anchor-larına yönəldildi; Blok 11A-da isə səhifələr yarandı və linklər REAL
// ünvanlara qaytarıldı.
//
// İndi test iki şeyi bərkidir:
//   1. hər naviqasiya linki 200 verən SƏHİFƏDİR (anchor QALMAYIB)
//   2. `LANDING_SECTIONS` anchor-ları hələ də işləyir — paylaşılmış `/#events`
//      ünvanı sınmamalıdır (siyahının rolu dəyişdi: naviqasiya hədəfi deyil,
//      açılış bölmələrinin vahid mənbəyi)
// ============================================================================

import { expect, test, type Page } from "@playwright/test";

import { FOOTER_NAV, LANDING_SECTIONS, PUBLIC_NAV } from "../../src/layouts/nav";

/** Naviqasiyadakı BÜTÜN linklər — header + footer, dublikatsız. */
const ALL_LINKS = [
  ...PUBLIC_NAV.map((item) => item.href),
  ...FOOTER_NAV.flatMap((section) => section.items.map((item) => item.href)),
];

const UNIQUE_LINKS = [...new Set(ALL_LINKS)];

async function anchorTargetExists(page: Page, id: string): Promise<boolean> {
  return page.locator(`#${id}`).count().then((count) => count > 0);
}

test("🔴 naviqasiyada ANCHOR QALMAYIB — hamısı real səhifədir", async ({ page }) => {
  const landing = await page.goto("/");
  expect(landing?.status(), "GET / statusu").toBe(200);

  for (const href of UNIQUE_LINKS) {
    expect(href.startsWith("/#"), `«${href}» hələ anchor-dur`).toBe(false);

    const response = await page.goto(href);
    expect(response?.status(), `${href} statusu`).toBe(200);
  }
});

test("«Tədbirlər» linki artıq REAL /events səhifəsinə aparır", async ({ page }) => {
  await page.goto("/");

  const eventsLink = page
    .getByRole("navigation", { name: "Əsas naviqasiya" })
    .getByRole("link", { name: "Tədbirlər" });

  await expect(eventsLink).toBeVisible();
  // Blok 9-da bu, `/#events` idi (səhifə yox idi); Blok 11A-da real ünvandır.
  await expect(eventsLink).toHaveAttribute("href", "/events");

  await eventsLink.click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading", { level: 1, name: "Açıq tədbirlər" })).toBeVisible();
});

test("hər açılış bölməsi başlıqla render olunur (anchor-lar sağdır)", async ({ page }) => {
  await page.goto("/");

  for (const section of LANDING_SECTIONS) {
    await expect(
      page.getByRole("heading", { name: section.title }),
      `«${section.title}» bölməsi`,
    ).toBeVisible();

    // Paylaşılmış `/#<id>` ünvanı hələ də hədəf tapmalıdır.
    expect(await anchorTargetExists(page, section.id), `«#${section.id}» yoxdur`).toBe(
      true,
    );
  }
});

test("mövcud olmayan ünvan azərbaycanca 404 ekranı göstərir", async ({ page }) => {
  // ⚠️ Blok 9-a qədər `not-found.tsx` YOX İDİ — Next-in ingiliscə defolt
  // ekranı çıxırdı. `notFound()` bütün tədbir və məzmun səhifələrində işlədilir.
  const response = await page.goto("/belə-səhifə-yoxdur");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Açılış səhifəsi" })).toBeVisible();
});
