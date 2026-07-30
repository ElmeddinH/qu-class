// ============================================================================
// tests/e2e/public-nav.spec.ts
// İctimai naviqasiya — HEÇ BİR LİNK 404 VERMİR.
//
// 🔴 NİYƏ BU TEST: `PUBLIC_NAV` və `FOOTER_NAV` Blok 2-dən bəri hələ mövcud
// olmayan səhifələrə (`/about`, `/faculties`, `/events`…) baxırdı — hər klik
// 404 idi. Ziyarətçi üçün bu, "sayt sınıb" deməkdir. Linklər açılış
// səhifəsinin anchor-larına yönəldilib; bu test həmin uzlaşmanı BƏRKİDİR:
//   1. hər link ya real 200 səhifədir, ya da açılışdakı MÖVCUD bölmədir
//   2. anchor-un hədəf `id`-si səhifədə HƏQİQƏTƏN var (yoxsa link heç yerə
//      aparır — 404-dən daha pis, çünki səssizdir)
//
// ⚠️ `/events` xüsusi haldır: `routes.ts` → `PUBLIC_EXACT_PATHS` ona auth
// istisnası açıb (Blok 9), amma səhifənin ÖZÜ Blok 11-dədir. Test onun da
// anchor olduğunu yoxlayır — Blok 11-də real səhifə gələndə burada `/events`
// gözlənilən dəyər kimi yenilənəcək.
// ============================================================================

import { expect, test, type Page } from "@playwright/test";

import { FOOTER_NAV, LANDING_SECTIONS, PUBLIC_NAV } from "../../src/layouts/nav";

/** Naviqasiyadakı BÜTÜN linklər — header + footer, dublikatsız. */
const ALL_LINKS = [
  ...PUBLIC_NAV.map((item) => item.href),
  ...FOOTER_NAV.flatMap((section) => section.items.map((item) => item.href)),
];

const UNIQUE_LINKS = [...new Set(ALL_LINKS)];

/** Açılışdakı mövcud bölmə `id`-ləri. */
const SECTION_IDS = new Set(LANDING_SECTIONS.map((section) => section.id));

async function anchorTargetExists(page: Page, id: string): Promise<boolean> {
  return page.locator(`#${id}`).count().then((count) => count > 0);
}

test("naviqasiya linklərinin hamısı ya səhifədir, ya da mövcud anchor", async ({
  page,
}) => {
  const landing = await page.goto("/");
  expect(landing?.status(), "GET / statusu").toBe(200);

  for (const href of UNIQUE_LINKS) {
    if (href.startsWith("/#")) {
      const id = href.slice(2);

      // (a) `nav.ts`-dəki anchor `LANDING_SECTIONS`-də təyin olunmalıdır.
      expect(SECTION_IDS.has(id), `«${href}» üçün LANDING_SECTIONS qeydi yoxdur`).toBe(
        true,
      );

      // (b) həmin `id` səhifədə HƏQİQƏTƏN render olunmalıdır.
      expect(await anchorTargetExists(page, id), `«#${id}» səhifədə yoxdur`).toBe(true);
      continue;
    }

    // Anchor deyilsə real səhifə olmalıdır və 404 verməməlidir.
    const response = await page.goto(href);
    expect(response?.status(), `${href} statusu`).toBeLessThan(400);
    await page.goBack();
  }
});

test("🔴 «Tədbirlər» linki 404 vermir (Blok 9 → PUBLIC_EXACT_PATHS)", async ({ page }) => {
  await page.goto("/");

  const eventsLink = page
    .getByRole("navigation", { name: "Əsas naviqasiya" })
    .getByRole("link", { name: "Tədbirlər" });

  await expect(eventsLink).toBeVisible();

  // Blok 11-ə qədər hədəf açılışdakı 5-ci bölmədir.
  await expect(eventsLink).toHaveAttribute("href", "/#events");

  await eventsLink.click();
  await expect(page).toHaveURL(/#events$/);

  // Bölmə həqiqətən var və başlığı görünür.
  await expect(
    page.getByRole("heading", { name: "Qarşıdan gələn tədbirlər" }),
  ).toBeVisible();
});

test("hər açılış bölməsi başlıqla render olunur", async ({ page }) => {
  await page.goto("/");

  for (const section of LANDING_SECTIONS) {
    await expect(
      page.getByRole("heading", { name: section.title }),
      `«${section.title}» bölməsi`,
    ).toBeVisible();
  }
});

test("mövcud olmayan ünvan azərbaycanca 404 ekranı göstərir", async ({ page }) => {
  // ⚠️ Blok 9-a qədər `not-found.tsx` YOX İDİ — Next-in ingiliscə defolt
  // ekranı çıxırdı. `notFound()` bütün tədbir səhifələrində işlədilir.
  const response = await page.goto("/belə-səhifə-yoxdur");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Açılış səhifəsi" })).toBeVisible();
});
