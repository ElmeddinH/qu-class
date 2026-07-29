// ============================================================================
// tests/e2e/profile.spec.ts
// Blok 7 DoD [M7] — "My Class Story", profil redaktəsi və üç razılıq.
//
// Yoxlanılır:
//   1. `/me/edit`-də bio dəyişib saxlayırsan → `/u/[id]`-də görünür
//   2. sahənin görünürlüyünü CLASS→PRIVATE edirsən → BAŞQA HESABDA (ayrı
//      brauzer konteksti, TƏLƏ T16) sahə görünmür
//   3. məzun profilində karyera xronologiyası + 7 dəstək rozeti görünür
//      (üç razılığın hamısı `/me/career`-dən idarə olunur)
//
// ⚠️ TƏLƏ T19: server action-dan sonra nəticə DƏRHAL gəlmir. `waitForURL`-dən
// sonra oxumaq köhnə dəyəri verir — ona görə `expect.poll` + səhifənin yenidən
// yüklənməsi işlədilir.
//
// ⚠️ Testlər seed edilmiş `prisma/dev.db`-yə qarşı işləyir və YAZIR. Dəyişdirilən
// hər sahə `finally`-də geri qaytarılır (feed.spec.ts eyni nümunəni işlədir) —
// seed determinizmi pozulmamalıdır.
// ============================================================================

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { SUPPORT_OFFER_TYPE_VALUES, Visibility } from "@/lib/enums";
import { SUPPORT_OFFER_LABELS } from "@/lib/labels";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
/** PLAN.md §7 — STUDENT cohort-unda sinif nümayəndəsi. */
const STUDENT_EMAIL = "rep@qu.edu.az";
/** Eyni sinifdə başqa hesab — "başqa hesabda görünmür" testi üçün. */
const CLASSMATE_EMAIL = "coordinator@qu.edu.az";
/** ALUMNI cohort-unda məzun. */
const ALUMNI_EMAIL = "alumni@qu.edu.az";

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL("**/class/**");
}

async function userIdOf(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  return user.id;
}

/**
 * Sahənin görünürlük səviyyəsini dəyişir.
 *
 * ⚠️ Klik RADIO-ya deyil, ETİKETƏ gedir. `VisibilitySelector` native
 * `<input type="radio">`-nu `sr-only` ilə gizlədir (1×1 px) və görünən element
 * `<label>`-dir — real istifadəçi də məhz onu klikləyir. Radio-nun özünü
 * kliklətməyə çalışsaq yapışqan header və ya wrapper `<div>` pointer
 * hadisələrini tutur (`force: true` isə əsl davranışı gizlədərdi).
 */
async function setFieldVisibility(page: Page, field: string, level: string): Promise<void> {
  await page.locator(`label[for="visibility-${field}-${level}"]`).click();
  await expect(page.locator(`#visibility-${field}-${level}`)).toBeChecked();
}

/**
 * TƏLƏ T19 — server action-dan sonra oxuma.
 *
 * `revalidatePath` keşi işarələyir, amma nəticə növbəti sorğuda gəlir. Səhifəni
 * dövr içində yenidən yükləyib gözləyirik; `waitForURL`-dən dərhal sonra oxumaq
 * KÖHNƏ dəyəri verərdi.
 */
async function pollPageFor(
  page: Page,
  url: string,
  locate: (page: Page) => Promise<number>,
): Promise<void> {
  await expect
    .poll(
      async () => {
        await page.goto(url);
        return locate(page);
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// 1. Redaktə → profildə görünür
// ---------------------------------------------------------------------------

test("/me/edit-də bio dəyişilir və /u/[id]-də görünür", async ({ page }) => {
  const userId = await userIdOf(STUDENT_EMAIL);
  const before = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { bio: true, updatedAt: true },
  });

  const marker = `E2E hekayə testi ${Date.now().toString(36)}`;

  try {
    await login(page, STUDENT_EMAIL);

    await page.goto("/me/edit");
    await expect(page.getByRole("heading", { name: "Profili redaktə et" })).toBeVisible();

    // Sahə etiketi `FIELD_LABELS.bio` ilə eynidir (ekran oxuyucu üçün sr-only).
    const bio = page.getByLabel("Mənim haqqımda", { exact: true });
    await bio.fill(marker);

    await page.getByRole("button", { name: "Yadda saxla", exact: true }).click();
    await expect(page.getByText("Profiliniz yeniləndi.")).toBeVisible();

    // --- Baza yoxlaması: dəyər həqiqətən yazıldı ---
    await expect
      .poll(async () => {
        const row = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { bio: true },
        });
        return row.bio;
      })
      .toBe(marker);

    // --- Profildə görünür (T19: poll ilə) ---
    await pollPageFor(page, `/u/${userId}`, (target) =>
      target.getByText(marker).count(),
    );
  } finally {
    await prisma.user.update({
      where: { id: userId },
      data: { bio: before.bio, updatedAt: before.updatedAt },
    });
  }
});

// ---------------------------------------------------------------------------
// 2. 🔴 Görünürlük CLASS → PRIVATE, başqa hesabda görünmür (T16)
// ---------------------------------------------------------------------------

test("bio CLASS→PRIVATE edilir → sinif yoldaşı onu görmür", async ({ page, browser }) => {
  const userId = await userIdOf(STUDENT_EMAIL);

  const beforeUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { bio: true, updatedAt: true },
  });
  const beforeLevel = await prisma.fieldVisibility.findUnique({
    where: { userId_field: { userId, field: "bio" } },
    select: { level: true },
  });

  const marker = `E2E məxfilik testi ${Date.now().toString(36)}`;

  // ⚠️ TƏLƏ T16: sinif yoldaşı AYRI brauzer kontekstindədir. Eyni kontekstdə
  // ikinci hesabla giriş etsək birinci sessiya cookie-si əvəz olunar və test
  // əslində "öz profilinə baxış"ı yoxlayardı.
  const classmateContext = await browser.newContext();
  const classmatePage = await classmateContext.newPage();

  try {
    // --- Sahib: dəyəri yaz və səviyyəni CLASS et ---
    await login(page, STUDENT_EMAIL);
    await page.goto("/me/edit");

    await page.getByLabel("Mənim haqqımda", { exact: true }).fill(marker);

    await setFieldVisibility(page, "bio", "CLASS");

    await page.getByRole("button", { name: "Yadda saxla", exact: true }).click();
    await expect(page.getByText("Profiliniz yeniləndi.")).toBeVisible();

    // --- Sinif yoldaşı GÖRÜR ---
    await login(classmatePage, CLASSMATE_EMAIL);
    await pollPageFor(classmatePage, `/u/${userId}`, (target) =>
      target.getByText(marker).count(),
    );

    // --- Sahib səviyyəni PRIVATE edir ---
    await page.goto("/me/edit");
    await setFieldVisibility(page, "bio", "PRIVATE");

    await page.getByRole("button", { name: "Yadda saxla", exact: true }).click();
    await expect(page.getByText("Profiliniz yeniləndi.")).toBeVisible();

    await expect
      .poll(async () => {
        const row = await prisma.fieldVisibility.findUnique({
          where: { userId_field: { userId, field: "bio" } },
          select: { level: true },
        });
        return row?.level;
      })
      .toBe(Visibility.PRIVATE);

    // --- 🔴 Sinif yoldaşı ARTIQ GÖRMÜR ---
    await expect
      .poll(
        async () => {
          await classmatePage.goto(`/u/${userId}`);
          // Səhifə açılır (ad-soyad görünür), yalnız SAHƏ yoxdur.
          await expect(classmatePage.getByRole("heading", { level: 1 })).toBeVisible();
          return classmatePage.getByText(marker).count();
        },
        { timeout: 20_000, intervals: [500, 1000, 2000] },
      )
      .toBe(0);

    // --- Sahib öz sahəsini HƏMİŞƏ görür ---
    await page.goto(`/u/${userId}`);
    await expect(page.getByText(marker)).toBeVisible();
  } finally {
    await classmateContext.close();

    await prisma.user.update({
      where: { id: userId },
      data: { bio: beforeUser.bio, updatedAt: beforeUser.updatedAt },
    });

    if (beforeLevel) {
      await prisma.fieldVisibility.update({
        where: { userId_field: { userId, field: "bio" } },
        data: { level: beforeLevel.level },
      });
    } else {
      await prisma.fieldVisibility.deleteMany({ where: { userId, field: "bio" } });
    }
  }
});

// ---------------------------------------------------------------------------
// 3. Məzun profili — karyera xronologiyası + 7 dəstək rozeti
// ---------------------------------------------------------------------------

test("məzun profilində karyera xronologiyası və 7 dəstək rozeti görünür", async ({ page }) => {
  const userId = await userIdOf(ALUMNI_EMAIL);

  const beforeUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { openToSupport: true, updatedAt: true },
  });
  const beforeOffers = await prisma.supportOffer.findMany({ where: { userId } });

  // Sanity: seed məzuna karyera qeydi verib, yoxsa test mənasızdır.
  const careerCount = await prisma.careerEntry.count({ where: { userId } });
  expect(careerCount, "seed məzuna karyera qeydi verməlidir").toBeGreaterThan(0);

  try {
    await login(page, ALUMNI_EMAIL);

    // --- ÜÇ RAZILIQ: dəstək bölməsində bayraq + 7 seçim ---
    await page.goto("/me/career");
    await expect(
      page.getByRole("heading", { level: 1, name: "Karyera və təhsil" }),
    ).toBeVisible();

    const openToSupport = page.getByRole("switch", { name: "Dəstəyə açığam" });
    if ((await openToSupport.getAttribute("data-state")) !== "checked") {
      await openToSupport.click();
    }

    for (const type of SUPPORT_OFFER_TYPE_VALUES) {
      const checkbox = page.getByRole("checkbox", {
        name: SUPPORT_OFFER_LABELS[type],
        exact: true,
      });
      if ((await checkbox.getAttribute("data-state")) !== "checked") {
        await checkbox.click();
      }
    }

    await page.getByRole("button", { name: "Dəstək seçimlərini saxla" }).click();
    await expect(page.getByText("Dəstək seçimləriniz yeniləndi.")).toBeVisible();

    // --- Baza: 7 sətir + bayraq açıq ---
    await expect
      .poll(() => prisma.supportOffer.count({ where: { userId } }))
      .toBe(SUPPORT_OFFER_TYPE_VALUES.length);

    const flag = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { openToSupport: true },
    });
    expect(flag.openToSupport).toBe(true);

    // --- Profil: 7 rozet + karyera vaxt oxu (T19: poll) ---
    // ⚠️ `CardTitle` shadcn-də `<div>` kimi render olunur (heading DEYİL) —
    // `components/ui/` toxunulmaz olduğu üçün mətn üzrə axtarılır.
    await pollPageFor(page, `/u/${userId}`, (target) =>
      target.getByText("Sinfimə necə dəstək ola bilərəm?").count(),
    );

    for (const type of SUPPORT_OFFER_TYPE_VALUES) {
      await expect(
        page.getByText(SUPPORT_OFFER_LABELS[type], { exact: true }).first(),
        SUPPORT_OFFER_LABELS[type],
      ).toBeVisible();
    }

    // Karyera xronologiyası — CV cədvəli deyil, vaxt oxu bölməsi.
    await expect(page.getByText("Karyera yolum", { exact: true })).toBeVisible();
    // Mərhələ rozeti: profil ALUMNI kimi göstərilir (resolveStage-dən).
    await expect(page.getByText("Məzun", { exact: true }).first()).toBeVisible();
  } finally {
    await prisma.supportOffer.deleteMany({ where: { userId } });
    if (beforeOffers.length > 0) {
      await prisma.supportOffer.createMany({ data: beforeOffers });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { openToSupport: beforeUser.openToSupport, updatedAt: beforeUser.updatedAt },
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Sihirbaz keçidi — addım düyməsi REDAKTƏ formasına aparır
// ---------------------------------------------------------------------------

test("incoming sihirbazının addım linki /me/edit-dəki sahəyə aparır", async ({ page }) => {
  // Blok 5-də bütün addımlar `/me`-yə göstərirdi və `/me` profilə BAXIŞA
  // yönləndirir — istifadəçi formaya çatmırdı, sihirbaz 100%-ə qalxa bilmirdi.
  await login(page, STUDENT_EMAIL);

  // Lövbərin özü səhifədə mövcuddur və forma sahəsini əhatə edir.
  await page.goto("/me/edit#field-avatarUrl");

  const anchor = page.locator("#field-avatarUrl");
  await expect(anchor).toBeVisible();
  await expect(anchor.getByLabel("Profil şəkli", { exact: true })).toBeVisible();

  // Hər addımın hədəfi ayrı sahədir.
  for (const field of ["bio", "interests", "learningGoals"]) {
    await expect(page.locator(`#field-${field}`)).toBeAttached();
  }
});
