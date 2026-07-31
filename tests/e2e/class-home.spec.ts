// ============================================================================
// tests/e2e/class-home.spec.ts
// Blok 5 DoD — Class Page ana səhifəsi + Incoming Class.
//
// Yoxlanılır:
//   · üç fərqli mərhələdəki cohort ÜÇ FƏRQLİ düzülüş göstərir (PLAN.md §4.6)
//   · spesifikasiya §16-nın bütün blokları hər üç səhifədə mövcuddur
//   · Incoming-ə xas bölmələr (sihirbaz, tanışlıq, kampus, Xankəndi) yalnız
//     INCOMING cohort-da, Alumni-yə xasları yalnız ALUMNI cohort-da görünür
//   · widget-lər BOŞ EKRAN vermir (seed məlumatı ilə real məzmun render olunur)
//
// ⚠️ Mərhələ bazadan, `Cohort.academicStartsAt` / `graduatesAt` ilə yoxlanılır —
// slug-a görə təxmin edilmir (`User.stage` keşinə də güvənilmir, PLAN.md §4.6).
// ============================================================================

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { resolveStage } from "@/lib/stage";

import { settleHeadings } from "./settle";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";

/** Hər mərhələ üçün bir cohort + həmin cohort-un ÜZVÜ olan hesab. */
const CASES = [
  {
    stage: "INCOMING",
    slug: "komputer-muhendisliyi-2030",
    // Test hesablarının heç biri INCOMING cohort-da deyil — adi seed üzvü.
    email: "orxan.rzayev@qu.edu.az",
  },
  {
    stage: "STUDENT",
    slug: "informasiya-tehlukesizliyi-2027",
    email: "rep@qu.edu.az",
  },
  {
    stage: "ALUMNI",
    slug: "maliyye-2022",
    email: "alumni@qu.edu.az",
  },
] as const;

/** spec §16 — hər mərhələdə mövcud olmalı olan bloklar. */
const SPEC_HEADINGS = [
  "Xoş gəlmisiniz", //          blok 4
  "Qarşıdan gələn tədbirlər", // blok 5
  "Sinif lenti", //              blok 6
  "Son nailiyyətlər", //         blok 7
  "Xronologiyadan son hadisələr", // blok 8
  "Yeni üzvlər", //              blok 9
  "Son xatirələr", //            blok 10
  "Sinif kataloqu", //           blok 11
  "İndi haradayıq?", //          blok 12
  "Tədbir yarat", //             blok 13
  "Paylaşım yarat", //           blok 14
] as const;

const INCOMING_ONLY = [
  "Özünü təqdim et",
  "Sənin kimi maraqları olanlar",
  "Kampusa hazırlıq",
  "Xankəndi bələdçisi",
] as const;

const ALUMNI_ONLY = ["Məzunlar görüşləri", "Dəstək təklifləri"] as const;

/**
 * ⚠️ HƏR HESAB ÜÇÜN AYRI BRAUZER KONTEKSTİ lazımdır — eyni səhifədə ikinci dəfə
 * `login()` çağırma. Giriş etmiş istifadəçini middleware `/login`-dən
 * uzaqlaşdırır (`isAuthRoute` → `/home` → `/class/...`), yəni forma ortada
 * olmur və test onu gözləyərək donur. `context.clearCookies()` da kifayət
 * etmir: `SessionProvider` fonda `/api/auth/session`-ə müraciət edir və
 * sessiya kukisi təmizləmə ilə naviqasiya arasında yenidən qurula bilir.
 * Təmiz həll — `browser.newContext()` (aşağıdakı `withFreshSession`).
 */
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

/**
 * Səhifədəki widget başlıqlarını GÖRÜNMƏ SIRASI ilə qaytarır.
 *
 * 🔴 SUSPENSE AXINI GÖZLƏNİLİR — yoxsa test FLAKE olur (Blok 13B-də tutuldu).
 * Class Page widget-ləri Suspense sərhədləri arxasında STREAM olunur: naviqasiya
 * bitəndə `main` artıq mövcuddur, amma `h2`-lərin bir hissəsi hələ gəlməyib.
 * `allInnerTexts()` həmin anda oxunsa siyahı NATAMAM gəlir və test «blok
 * yoxdur» deyib qırılır. Ən ağır cohort (`maliyye-2022`) ən çox sınır.
 *
 * Gözləmə qaydası ortaq moduldadır: `./settle.ts`.
 */
async function widgetHeadings(page: Page): Promise<string[]> {
  await settleHeadings(page);

  return page.locator("main h2").allInnerTexts();
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

for (const testCase of CASES) {
  test(`${testCase.stage}: /class/${testCase.slug} düzülüşü və məzmunu`, async ({ page }) => {
    // --- Mərhələ cohort TARİXLƏRİNDƏN hesablanır ---
    const cohort = await prisma.cohort.findUniqueOrThrow({
      where: { slug: testCase.slug },
      select: { displayName: true, academicStartsAt: true, graduatesAt: true },
    });
    expect(resolveStage(cohort), `${testCase.slug} mərhələsi`).toBe(testCase.stage);

    await login(page, testCase.email);
    await page.goto(`/class/${testCase.slug}`);

    // --- Başlıq (spec §16 blok 1-3) ---
    await expect(page.getByRole("heading", { level: 1, name: cohort.displayName })).toBeVisible();
    await expect(page.getByText(/\d+ üzv/).first()).toBeVisible();

    const headings = await widgetHeadings(page);

    // --- spec §16: bütün bloklar hər mərhələdə var ---
    for (const heading of SPEC_HEADINGS) {
      expect(headings, `${testCase.stage} → "${heading}"`).toContain(heading);
    }

    // --- PLAN.md §4.6: mərhələyə xas bölmələr ---
    for (const heading of INCOMING_ONLY) {
      const shouldExist = testCase.stage === "INCOMING";
      expect(headings.includes(heading), `${testCase.stage} → "${heading}"`).toBe(shouldExist);
    }
    for (const heading of ALUMNI_ONLY) {
      const shouldExist = testCase.stage === "ALUMNI";
      expect(headings.includes(heading), `${testCase.stage} → "${heading}"`).toBe(shouldExist);
    }

    // --- Widget-lər real məzmun göstərir, boş ekran yox ---
    // Lentdə ən azı bir paylaşım, kataloqda ən azı bir avatar keçidi.
    const feedSection = page.locator("section", { has: page.getByRole("heading", { name: "Sinif lenti" }) });
    await expect(feedSection.locator("li").first()).toBeVisible();

    const directorySection = page.locator("section", {
      has: page.getByRole("heading", { name: "Sinif kataloqu" }),
    });
    await expect(directorySection.getByRole("link", { name: /Kataloqu aç/ })).toBeVisible();
  });
}

// ---------------------------------------------------------------------------
// Mərhələ SIRAsı — üç səhifə eyni deyil
// ---------------------------------------------------------------------------

test("üç mərhələ üç fərqli widget sırası verir", async ({ browser }) => {
  const orders: string[] = [];

  for (const testCase of CASES) {
    // Təmiz sessiya — bax `login()` başındakı qeyd.
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page, testCase.email);
      await page.goto(`/class/${testCase.slug}`);
      orders.push((await widgetHeadings(page)).join(" → "));
    } finally {
      await context.close();
    }
  }

  expect(new Set(orders).size, "üç sıra da fərqli olmalıdır").toBe(3);

  const [incoming, student, alumni] = orders;
  // PLAN.md §4.6 cədvəlinin ilk sətri hər mərhələdə fərqlidir.
  expect(incoming.startsWith("Özünü təqdim et")).toBe(true);
  expect(student.startsWith("Sinif lenti")).toBe(true);
  expect(alumni.startsWith("İndi haradayıq?")).toBe(true);
});
