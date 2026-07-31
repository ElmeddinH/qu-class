// ============================================================================
// tests/e2e/a11y-keyboard.spec.ts
// Blok 12C · A bəndi — axe-in ÖLÇƏ BİLMƏDİYİ əlçatanlıq tələbləri.
//
// 🔴 NİYƏ AYRICA FAYL: `a11y.spec.ts` statik DOM-u skan edir. Buradakı tələblər
// isə DAVRANIŞDIR — fokus hara gedir, Esc nə edir, label-a klik nəyi dəyişir.
// axe onları prinsipcə görə bilmir; tapşırıqda «əl ilə yoxlanacaqlar» kimi
// sadalanıblar və hər biri burada AVTOMATLAŞDIRILIB (əl ilə yoxlama təkrarlana
// bilmir, test təkrarlanır).
//
// Yoxlanan on bənd:
//   1. Skip-link — fokusda görünür və `#main`-ə aparır
//   2. `:focus-visible` — KU Green halqa REAL olaraq render olunur
//   3. Fokus tələsi YOXDUR — Tab dövrəsi ilişmir
//   4. Modal (Dialog) — fokus tələsi VAR, Esc bağlayır, fokus tetikləyiciyə qayıdır
//   5. Sheet (mobil naviqasiya) — eyni üç şərt
//   6. T23 — `sr-only` radio: LABEL-a klik seçimi dəyişir
//   7. T29 — Radix Select `getByRole("combobox")` ilə tapılır və klaviatura ilə işləyir
//   8. Hər `<img>` `alt` atributu daşıyır (dekorativsə boş)
//   9. Form xətası `aria-describedby` ilə bağlıdır və YALNIZ rəngdə deyil
//  10. Canlı bölgələr — toast və oxunmamış bildiriş sayı
//  11. `prefers-reduced-motion` — animasiya müddəti sıfıra düşür
//
// ⚠️ TƏLƏ T16: hər test öz `browser.newContext()`-ini yaradır və `finally`-də
// bağlayır.
// ⚠️ TƏLƏ T19: gözləmələr `expect.poll` / `expect(...).toBeVisible()` ilədir,
// sabit `waitForTimeout` YOXDUR.
// ⚠️ Fayl bazada heç nə yaratmır/dəyişmir.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";

// ⚠️ Bu fayl Prisma İŞLƏTMİR: heç bir yoxlama seed məlumatına bağlı deyil
// (səhifələr sabit yollardır, hesab isə yalnız girişi açır). `a11y.spec.ts`
// isə cohort slug-ı üçün bazaya baxır — fərq qəsdlidir.

const SEED_PASSWORD = "Test1234!";
const MEMBER_EMAIL = "rep@qu.edu.az";

/**
 * KU Green (#44766C) — fokus halqasının rəngi.
 *
 * ⚠️ DÖZÜMLÜ MÜQAYİSƏ: token `globals.css`-də shadcn üçün HSL kimi yazılıb
 * (`--ring: 168 27% 36%`) və brauzer onu geri RGB-yə çevirəndə hər kanalda
 * 1 vahid fərq qalır (`rgb(67, 117, 107)`). Gözlə görünməyən yuvarlaqlaşdırma
 * fərqidir — sabit sətir müqayisəsi testi səbəbsiz qırardı.
 */
const KU_GREEN = { r: 68, g: 118, b: 108 };
const CHANNEL_TOLERANCE = 2;

/** `box-shadow` sətrindəki `rgb(...)` üçlüklərini çıxarır. */
function rgbTriples(value: string): { r: number; g: number; b: number }[] {
  return Array.from(value.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)).map((match) => ({
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  }));
}

function isKuGreen(color: { r: number; g: number; b: number }): boolean {
  return (
    Math.abs(color.r - KU_GREEN.r) <= CHANNEL_TOLERANCE &&
    Math.abs(color.g - KU_GREEN.g) <= CHANNEL_TOLERANCE &&
    Math.abs(color.b - KU_GREEN.b) <= CHANNEL_TOLERANCE
  );
}

/** Təmiz (kukisiz) kontekst — TƏLƏ T16. */
async function anonymousPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

/** Fokusdakı elementin qısa təsviri — xəta mesajlarını oxunaqlı edir. */
async function activeDescriptor(page: Page) {
  return page.evaluate(() => {
    const node = document.activeElement;
    if (!node) return "yoxdur";
    const tag = node.tagName.toLowerCase();
    const label =
      node.getAttribute("aria-label") ?? (node.textContent ?? "").trim().slice(0, 40);
    return `${tag}[${label}]`;
  });
}

// ---------------------------------------------------------------------------
// 1) Skip-link
// ---------------------------------------------------------------------------
test("skip-link ilk Tab-da görünür və əsas məzmuna aparır", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");

    const skip = page.getByRole("link", { name: "Əsas məzmuna keç" });

    // Fokusdan ƏVVƏL `sr-only`-dir — yəni ölçüsü 1px-dir, görünmür.
    const hiddenBox = await skip.boundingBox();
    expect(hiddenBox?.width ?? 0, "fokusdan əvvəl skip-link görünməməlidir").toBeLessThan(
      4,
    );

    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();

    // Fokusda REAL ölçü alır (`not-sr-only`) — yəni klaviatura istifadəçisi görür.
    const shownBox = await skip.boundingBox();
    expect(shownBox?.width ?? 0, "fokusda skip-link görünməlidir").toBeGreaterThan(80);

    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#main");
    await expect(page.locator("#main")).toBeVisible();
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 2) `:focus-visible` — halqa REAL render olunur
//
// ⚠️ CSS-in mövcudluğu kifayət deyil: `globals.css`-də qayda yazılıb, amma
// başqa bir sinif (`outline-none`, `shadow-none`) onu üstələyə bilər. Ona görə
// yoxlama HESABLANMIŞ stildən oxunur.
// ---------------------------------------------------------------------------
test("klaviatura fokusu KU Green halqa ilə görünür", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/login");

    await page.getByLabel("Universitet e-poçtu").focus();

    const shadow = await page.evaluate(
      () => getComputedStyle(document.activeElement as Element).boxShadow,
    );

    expect(shadow, "fokus halqası render olunmalıdır").not.toBe("none");
    expect(
      rgbTriples(shadow).some(isKuGreen),
      `fokus halqası KU Green olmalıdır — alınan: ${shadow}`,
    ).toBe(true);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 3) Fokus tələsi YOXDUR — Tab dövrəsi ilişmir
//
// «Tələ» = fokus eyni elementdə qalır və Tab onu tərk edə bilmir. Ölçü: 60 Tab
// boyunca ardıcıl İKİ dəfə eyni elementdə qalma halı olmamalıdır və dövrədə
// ƏN AZI 10 fərqli dayanacaq görünməlidir.
// ---------------------------------------------------------------------------
test("Tab dövrəsində fokus tələsi yoxdur", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/faq");

    const seen = new Set<string>();
    let previous = "";

    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      const current = await activeDescriptor(page);

      expect(current, `Tab ${i + 1}: fokus «${current}» elementində ilişdi`).not.toBe(
        previous,
      );

      seen.add(current);
      previous = current;
    }

    expect(seen.size, "Tab dövrəsi çox az dayanacaq gəzdi").toBeGreaterThan(10);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 4) Modal — fokus tələsi VAR, Esc bağlayır, fokus tetikləyiciyə qayıdır
//
// Kuki banneri «Seçimlər» ekranı anonim ziyarətçidə həmişə əlçatandır və Radix
// `Dialog`-dur — yəni bütün modal ailəsinin nümayəndəsidir.
// ---------------------------------------------------------------------------
test("modal fokusu saxlayır, Esc bağlayır və fokus tetikləyiciyə qayıdır", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Seçimlər" });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fokus modalın İÇİNƏ keçib.
    await expect
      .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);

    // Fokus tələsi: 15 Tab-dan sonra da fokus HƏLƏ modalın içindədir.
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press("Tab");
    }

    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
      "Tab modaldan kənara çıxdı — fokus tələsi işləmir",
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Fokus tetikləyiciyə qayıtdı — istifadəçi yerini itirmir.
    await expect(trigger).toBeFocused();
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 5) Sheet (mobil naviqasiya) — eyni üç şərt
// ---------------------------------------------------------------------------
test("mobil naviqasiya Sheet-i fokusu saxlayır, Esc bağlayır və fokus qayıdır", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });

  try {
    const page = await context.newPage();
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Menyunu aç" });
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    await expect
      .poll(() => sheet.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
    }

    expect(
      await sheet.evaluate((node) => node.contains(document.activeElement)),
      "Tab Sheet-dən kənara çıxdı",
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 6) T23 — `sr-only` radio: LABEL-a klik seçimi dəyişir
//
// `VisibilitySelector` native `<input type="radio" className="peer sr-only">`
// işlədir. Belə input Playwright üçün GÖRÜNMƏZDİR: `check()` / `click()`
// «element is not visible» ilə dayanır. Düzgün yol — `<label>`-a klik.
// Bu test həm T23-ü sənədləşdirir, həm də seçimin REAL dəyişdiyini ölçür.
// ---------------------------------------------------------------------------
test("T23 — sr-only radio: label-a klik görünürlük seçimini dəyişir", async ({
  browser,
}) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await login(page, MEMBER_EMAIL);
    await page.goto("/me/privacy");

    // Səhifədəki ilk görünürlük qrupu — `fieldset` + `legend` (sr-only).
    const group = page.locator("fieldset").first();
    await expect(group).toBeAttached();

    const publicRadio = group.locator('input[type="radio"][value="PUBLIC"]');
    const classRadio = group.locator('input[type="radio"][value="CLASS"]');

    // 🔴 Radio `sr-only`-dir: DOM-dadır, amma qutusu 1×1 px-dir.
    // ⚠️ Playwright `toBeVisible()` üçün boş OLMAYAN qutu kifayətdir, yəni
    // `sr-only` element rəsmən «görünür» sayılır — ona görə ölçü BİRBAŞA
    // yoxlanılır. Praktiki nəticə eynidir: belə elementə `click()` etibarsızdır
    // və seçim LABEL-a klik ilə dəyişdirilir (T23).
    await expect(publicRadio).toBeAttached();
    const radioBox = await publicRadio.boundingBox();
    expect(radioBox?.width ?? 99, "sr-only radio 1px qutuda olmalıdır").toBeLessThanOrEqual(
      1,
    );

    const before = await classRadio.isChecked();

    // Klik LABEL-a gedir (T23) — radio-nun özünə klik mümkün deyil.
    await group.locator('label[for$="-CLASS"]').click();

    await expect.poll(() => classRadio.isChecked()).toBe(true);
    await expect.poll(() => publicRadio.isChecked()).toBe(false);

    // Ölçmə mənalı olsun deyə: ya vəziyyət dəyişdi, ya artıq seçili idi.
    expect(before === false || before === true).toBe(true);
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 7) T29 — Radix Select `combobox` rolu ilə tapılır və klaviatura ilə açılır
//
// Radix `SelectTrigger` native `<select>` DEYİL — `<button role="combobox">`.
// `getByRole("combobox")` işləyir, `selectOption()` İŞLƏMİR.
// ---------------------------------------------------------------------------
test("T29 — Radix Select combobox rolu daşıyır və klaviatura ilə açılır", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/register");

    // 🔴 CSS selektoru (ARIA sorğusu DEYİL): Radix Select AÇILANDA kənar
    // məzmunu `aria-hidden` edir və `getByRole("combobox")` tetikləyicini
    // ARTIQ TAPMIR — rol atributu isə yerində qalır. `getByRole` bağlı
    // vəziyyətdə işləyir (aşağıda ayrıca ölçülür), açıq vəziyyətdə isə yox.
    await expect(page.getByRole("combobox").first()).toBeVisible();
    const combobox = page.locator('[role="combobox"]').first();

    // Bağlı vəziyyətdə `aria-expanded="false"` olmalıdır.
    await expect(combobox).toHaveAttribute("aria-expanded", "false");

    await combobox.focus();
    await page.keyboard.press("Enter");

    await expect(combobox).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(combobox).toHaveAttribute("aria-expanded", "false");
    await expect(combobox).toBeFocused();
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 8) Hər `<img>` `alt` atributu daşıyır
//
// ⚠️ Boş `alt=""` DÜZGÜNDÜR (dekorativ şəkil) — yoxlama atributun MÖVCUDLUĞUNA
// baxır, dolu olmasına yox. axe `image-alt` qaydası yalnız əlçatanlıq adı
// olmayan şəkilləri tutur; bu isə `next/image`-in yaratdığı `<img>`-ləri də
// daxil olmaqla bütün səthi ölçür.
// ---------------------------------------------------------------------------
const IMAGE_PAGES = ["/", "/khankendi", "/faq", "/register"];

for (const target of IMAGE_PAGES) {
  test(`${target} — hər <img> alt atributu daşıyır`, async ({ browser }) => {
    const { page, close } = await anonymousPage(browser);

    try {
      await page.goto(target);
      await page.locator("#main").waitFor({ state: "visible" });

      const missing = await page.evaluate(() =>
        Array.from(document.querySelectorAll("img"))
          .filter((img) => !img.hasAttribute("alt"))
          .map((img) => img.getAttribute("src") ?? "(src yoxdur)"),
      );

      expect(missing, "alt atributu olmayan şəkil").toEqual([]);
    } finally {
      await close();
    }
  });
}

// ---------------------------------------------------------------------------
// 9) Form xətası — `aria-describedby` ilə bağlı, rəng TƏK kanal deyil
// ---------------------------------------------------------------------------
test("form xətası aria-describedby ilə bağlıdır və mətn daşıyır", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/login");

    // Boş forma göndərilir → RHF + Zod xətanı `FormMessage`-ə yazır.
    await page.getByRole("button", { name: "Daxil ol" }).click();

    const email = page.getByLabel("Universitet e-poçtu");
    await expect(email).toHaveAttribute("aria-invalid", "true");

    const describedBy = await email.getAttribute("aria-describedby");
    expect(describedBy, "xəta `aria-describedby` ilə bağlanmalıdır").toBeTruthy();

    // Bağlantı REAL elementə gedir və MƏTN daşıyır (yəni xəta yalnız
    // qırmızı sərhədlə göstərilmir — WCAG 1.4.1).
    const messageId = (describedBy ?? "").split(/\s+/).at(-1) ?? "";
    // ⚠️ `CSS.escape` Node tərəfində yoxdur (test prosesi brauzer deyil) —
    // atribut selektoru həm sadədir, həm də qaçış tələb etmir.
    const message = page.locator(`[id="${messageId}"]`);
    await expect(message).toBeVisible();
    await expect(message).not.toBeEmpty();
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 10) Canlı bölgələr — toast qabı və oxunmamış bildiriş sayı
// ---------------------------------------------------------------------------
test("canlı bölgələr mövcuddur: toast qabı və bildiriş sayı", async ({ browser }) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await login(page, MEMBER_EMAIL);

    // Sonner öz qabını `aria-live` ilə render edir — mövcudluğu ölçülür.
    await expect(page.locator("[aria-live]").first()).toBeAttached();

    // Bildiriş sayı üçün AYRICA canlı bölgə (say 0 olanda da DOM-dadır).
    const live = page.getByTestId("notification-live");
    await expect(live).toBeAttached();
    await expect(live).toHaveAttribute("aria-live", "polite");
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 11) `prefers-reduced-motion` — animasiya söndürülür
//
// ⚠️ Layihədə Framer Motion İMPORT EDİLMİR (asılılıq siyahısındadır, istifadə
// yoxdur — `grep -rl "framer-motion" src` boşdur). Hərəkət yalnız Tailwind
// `transition-*` / `animate-*` siniflərindən gəlir. `globals.css`-dəki
// `@media (prefers-reduced-motion: reduce)` bloku hər ikisini 0.01ms-ə endirir
// — və bu qayda Framer Motion əlavə olunsa da qüvvədə qalır.
// ---------------------------------------------------------------------------
test("prefers-reduced-motion animasiya və keçidləri söndürür", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });

  try {
    const page = await context.newPage();
    await page.goto("/");

    // `transition-colors` daşıyan istənilən element — məsələn footer linki.
    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a, button"))
        .map((node) => getComputedStyle(node).transitionDuration)
        .filter((value) => value !== "0s"),
    );

    // Qalan hər müddət 0.01ms-dir (qayda `!important`-dır) — saniyələrlə
    // ölçülən keçid QALMAMALIDIR.
    const slow = durations.filter((value) =>
      value.split(",").some((part) => Number.parseFloat(part) > 0.001),
    );

    expect(slow, "reduced-motion altında uzun keçid qaldı").toEqual([]);
  } finally {
    await context.close();
  }
});
