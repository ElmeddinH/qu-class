// ============================================================================
// tests/e2e/settle.ts
// Suspense axını bitənə qədər gözləmə — başlıq sayan testlər üçün.
//
// 🔴 PROBLEM (Blok 13B). Class Page və admin səthləri widget-lərini Suspense
// sərhədləri arxasında STREAM edir. `page.goto()` `load` hadisəsində qayıdır,
// yəni karkas hazırdır, amma widget başlıqlarının bir hissəsi hələ gəlməyib.
// Həmin anda `locator("main h2").allInnerTexts()` NATAMAM siyahı qaytarır və
// test «blok yoxdur» deyib qırılır — kodda heç bir qüsur olmadan. Uğursuzluq
// təsadüfidir: ən çox widget daşıyan səhifələr (ALUMNI class page, `/admin`)
// ən çox sınır.
//
// 🔴 NİYƏ «SKELETON SAYI = 0» ŞƏRTİ İŞLƏMİR — bir dəfə sınandı və sındı.
// `.animate-pulse` yalnız yüklənmə skeletonlarında deyil: `/kuds` stil
// bələdçisi skeleton komponentini NÜMUNƏ kimi göstərir, xəritə səhifəsində isə
// aktiv olmayan tabların lazy qrafik yer tutucuları qalır. Yəni say heç vaxt
// sıfırlanmır və şərt 15 saniyə gözləyib timeout verir.
//
// HƏLL: mütləq bir vəziyyət yox, SABİTLƏŞMƏ gözlənilir — başlıq sayı ardıcıl
// iki ölçmədə eyni qalanda axın bitmiş sayılır. `networkidle` İŞLƏDİLMİR:
// Next.js prefetch-ləri fasiləsizdir və o şərt heç vaxt ödənmir.
// ============================================================================

import { expect, type Page } from "@playwright/test";

/** İki ölçmə arasındakı fasilə — bir Suspense çərçivəsi üçün kifayətdir. */
const SAMPLE_INTERVAL_MS = 150;

/**
 * `<main>` görünənə və içindəki başlıq sayı sabitləşənə qədər gözləyir.
 *
 * Sabitləşmə şərti: ardıcıl iki ölçmədə say EYNİ və SIFIRDAN BÖYÜK.
 * «Sıfırdan böyük» vacibdir — boş `main` da texniki olaraq «sabitdir».
 */
export async function settleHeadings(page: Page, timeout = 15_000): Promise<void> {
  await page.locator("main").waitFor({ state: "visible" });

  let previous = -1;

  await expect
    .poll(
      async () => {
        const current = await page.locator("main :is(h1, h2, h3, h4, h5, h6)").count();
        const stable = current > 0 && current === previous;
        previous = current;
        return stable;
      },
      { timeout, intervals: [SAMPLE_INTERVAL_MS] },
    )
    .toBe(true);
}
