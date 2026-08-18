// ============================================================================
// tests/e2e/landing-cls.spec.ts
// AÇILIŞ SƏHİFƏSİNİN YÜKLƏNMƏ SIÇRAYIŞI (CLS) — reqressiya qapısı.
//
// 🔴 FAYLIN SUALI: `/`-ın skeletonu göstəriləndə `<footer>` EKRANIN İÇİNDƏ
// dayanırmı? Dayanırsa, məzmun gələndə istifadəçi footer-in aşağı tullandığını
// GÖRÜR — bu, ölçülən layout sıçrayışıdır.
//
// NİYƏ BU TEST VAR. Blok 12D `(landing)/loading.tsx`-ə ümumi
// `PageSkeleton variant="cards"` qoymuşdu: skeleton ~730px, real səhifə
// ~6400px. `PublicShell`-in footer-i Suspense sərhədindən KƏNARDADIR, yəni
// skeleton anında 730px-də — 940px-lik ekranın içində — görünürdü, sonra
// 5794px-ə tullanırdı. Lighthouse (desktop preset) bunu belə ölçdü:
//
//   ƏVVƏL: `/` performance **88**, CLS **0.223**  (tək sıçrayış, node=`<footer>`)
//   SONRA: `/` performance **99**, CLS **0**
//
// Düzəliş `src/features/welcome/WelcomeSkeleton.tsx`-dir (real səhifənin
// forması: hero + bölmələr). Bu test həmin düzəlişin GERİ QAYITMAMASI üçündür
// — rəqəm sənəddə deyil, qapıdadır.
//
// ⚠️ NİYƏ `javaScriptEnabled: false`. Skeleton axının BİRİNCİ hissəsidir və
// real şəbəkədə bir neçə yüz millisaniyə yaşayır — onu `waitFor` ilə tutmaq
// yarış şəraiti (flake) olardı. JS söndürüləndə brauzer məhz axının ilk
// hissəsində — Suspense fallback-i yerində — dayanır: eyni DOM, DETERMİNİSTİK
// ölçmə. Hidratasiya olmadığı üçün fallback heç vaxt əvəzlənmir.
//
// ⚠️ Fayl YALNIZ OXUYUR — bazaya toxunmur, sessiya tələb etmir.
// ============================================================================

import { expect, test } from "@playwright/test";

/** Lighthouse desktop preset-inin ekranı — ölçmə onunla eyni şərtdə olsun. */
const DESKTOP = { width: 1350, height: 940 };

/** Lighthouse mobile preset-inin ekranı (Moto G Power). */
const MOBILE = { width: 412, height: 823 };

test.describe("açılış səhifəsi — yüklənmə sıçrayışı", () => {
  for (const [name, viewport] of [
    ["desktop", DESKTOP],
    ["mobile", MOBILE],
  ] as const) {
    test(`🔴 ${name}: skeleton anında footer EKRANDAN KƏNARDADIR`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport,
        javaScriptEnabled: false,
      });

      try {
        const page = await context.newPage();
        await page.goto("/", { waitUntil: "load" });

        // Skeleton həqiqətən göstərilir — testin nəyi ölçdüyü şübhəsiz olsun.
        // (Fallback yoxdursa aşağıdakı ölçmə mənasız şəkildə "keçərdi".)
        await expect(page.getByText("Açılış səhifəsi yüklənir")).toBeAttached();

        const footerTop = await page.evaluate(() => {
          const footer = document.querySelector("footer");
          if (!footer) throw new Error("`<footer>` tapılmadı");
          return footer.getBoundingClientRect().top + window.scrollY;
        });

        expect(
          footerTop,
          `Skeleton çox qısadır: footer ${Math.round(footerTop)}px-də, yəni ` +
            `${viewport.height}px-lik ekranın İÇİNDƏ başlayır. Məzmun gələndə ` +
            "aşağı tullanacaq və CLS ölçüləcək — bax `WelcomeSkeleton`.",
        ).toBeGreaterThan(viewport.height);
      } finally {
        await context.close();
      }
    });
  }

  test("skeleton ekran oxuyucuya elan olunur (`loading.tsx` rejimi)", async ({
    browser,
  }) => {
    // `PageSkeleton` başlığındakı iki rejim: seqment əvəzlənəndə `role="status"`
    // + `aria-live` MƏCBURİDİR. `WelcomeSkeleton` ayrıca fayl olduğu üçün bu
    // qayda onunla birlikdə köçməli idi — test məhz onu bərkidir.
    const context = await browser.newContext({
      viewport: DESKTOP,
      javaScriptEnabled: false,
    });

    try {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "load" });

      const status = page.locator('[role="status"][aria-live="polite"]');
      await expect(status).toBeAttached();
      await expect(status).toContainText("Açılış səhifəsi yüklənir");
    } finally {
      await context.close();
    }
  });
});
