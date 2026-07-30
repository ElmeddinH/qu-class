// ============================================================================
// tests/e2e/memories.spec.ts
// Blok 10A DoD — Share Memories [M9] + Digital Yearbook + dəstək təklifləri.
//
// Yoxlanılır:
//   · xatirə yaradılır (Yearbook checkbox açıq) → /yearbook-da görünür
//   · `showInFeed` söndürülür → lentdən İTİR, albomda QALIR (bazada Post
//     DELETED olur, TimelineEntry silinir — TƏLƏ A)
//   · `showInFeed` söndürülü ikən `showInTimeline` checkbox-u DISABLED-dir
//   · anonim brauzer CLASS xatirəsini GÖRMÜR (səhifə + v1 endpoint)
//   · /yearbook-da üç bölmə başlığı və «Çap et» düyməsi görünür
//   · /support 7 qrup üzrə işləyir və əlaqə məlumatı GÖSTƏRMİR
//
// 🔴 TƏLƏ T16: anonim yoxlama üçün `browser.newContext()` — `clearCookies()`
// kifayət etmir.
// 🔴 TƏLƏ T19: server action-dan sonra siyahı SERVERDƏ yenilənir
// (`revalidatePath` + `router.refresh()`), yəni klikdən dərhal sonra oxumaq
// KÖHNƏ vəziyyəti verir → `expect.poll`.
// ⚠️ TƏLƏ T29: Radix Select üçün `getByRole("combobox")` — `getByLabel` YOX.
// ⚠️ TƏLƏ T23: `VisibilitySelector` radio-su `sr-only`-dir → `<label>` klik
// edilir (bu faylda default `CLASS` saxlanılır, ona görə yalnız oxunur).
//
// ⚠️ Test YAZIR: yaradılan hər sətir `finally`-də silinir — seed determinizmi
// pozulmamalıdır (`npm run db:seed` təkrar tələb olunmamalıdır).
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";

/** PLAN.md §7: `sec2023` sinfinin üzvü. */
const AUTHOR_EMAIL = "rep@qu.edu.az";
/** BAŞQA sinif (Maliyyə 2022) — dəstək təklifləri orada var. */
const ALUMNI_EMAIL = "alumni@qu.edu.az";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

interface CohortInfo {
  userId: string;
  cohortId: string;
  slug: string;
}

async function primaryCohortOf(email: string): Promise<CohortInfo> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      memberships: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { cohortId: true, cohort: { select: { slug: true } } },
      },
    },
  });

  const membership = user.memberships[0];
  return { userId: user.id, cohortId: membership.cohortId, slug: membership.cohort.slug };
}

/**
 * Testin yaratdığı xatirəni və törəmə sətirləri silir.
 *
 * ⚠️ Sıra: TimelineEntry / MediaAsset → Post → Memory. `Memory.postId`
 * `onDelete: SetNull` daşıyır, yəni əvvəlcə postu silsək xatirə sətri
 * `postId = null` ilə QALARDI.
 */
async function cleanupMemories(memoryIds: string[]) {
  if (memoryIds.length === 0) return;

  const memories = await prisma.memory.findMany({
    where: { id: { in: memoryIds } },
    select: { id: true, postId: true },
  });

  const postIds = memories.map((m) => m.postId).filter((id): id is string => id !== null);

  if (postIds.length > 0) {
    await prisma.timelineEntry.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.mediaAsset.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.notification.deleteMany({ where: { entityId: { in: postIds } } });
  }

  await prisma.memory.deleteMany({ where: { id: { in: memoryIds } } });

  if (postIds.length > 0) {
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  }
}

/**
 * Lentdən çıxarılan xatirənin postu `Memory.postId`-dən qopur (soft delete),
 * ona görə həmin postlar ayrıca yığılır.
 */
async function cleanupOrphanPosts(bodyFragment: string) {
  const posts = await prisma.post.findMany({
    where: { body: { contains: bodyFragment } },
    select: { id: true },
  });
  if (posts.length === 0) return;

  const ids = posts.map((p) => p.id);
  await prisma.timelineEntry.deleteMany({ where: { postId: { in: ids } } });
  await prisma.mediaAsset.deleteMany({ where: { postId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.post.deleteMany({ where: { id: { in: ids } } });
}

/** Kompozitoru açıb məcburi sahələri doldurur. */
async function openComposer(page: Page, title: string, body: string) {
  await page.getByRole("button", { name: "Xatirə yaz", exact: true }).click();

  const form = page.getByRole("form", { name: "Xatirə formu" });

  // T29: Radix Select — role ilə tapılır, `getByLabel` ilə yox.
  await form.getByRole("combobox", { name: "Növ", exact: true }).click();
  await page.getByRole("option", { name: "Qısa xatirə", exact: true }).click();

  await form.getByLabel("Başlıq", { exact: true }).fill(title);
  await form.getByLabel("Hekayə", { exact: true }).fill(body);

  return form;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Yaratma → albom → lentdən çıxarma (TƏLƏ A-nın tam dövrəsi)
// ---------------------------------------------------------------------------

test("xatirə yaradılır, albomda görünür; `showInFeed` söndürüləndə lentdən itir, albomda QALIR", async ({
  page,
}) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const title = `E2E albom xatirəsi ${stamp}`;
  const body = `Bu xatirə e2e testində yaradıldı və kifayət qədər uzundur. ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/memories`);

    const form = await openComposer(page, title, body);

    // Feed + Yearbook açıq (feed default açıqdır — niyyət aydın olsun deyə
    // vəziyyət yoxlanılır).
    await expect(
      form.getByRole("checkbox", { name: "Sinif lentində paylaş", exact: true }),
    ).toBeChecked();
    await form
      .getByRole("checkbox", { name: "Albomda (Yearbook) göstər", exact: true })
      .click();

    await form.getByRole("button", { name: "Xatirəni paylaş", exact: true }).click();
    await expect(page.getByText("Xatirə paylaşıldı.")).toBeVisible();

    // --- Bazada: xatirə + bağlı Post yarandı ---
    const memory = await prisma.memory.findFirstOrThrow({
      where: { title, authorId: cohort.userId },
      select: { id: true, postId: true, showInYearbook: true, visibility: true },
    });
    created.push(memory.id);

    expect(memory.showInYearbook).toBe(true);
    expect(memory.postId, "showInFeed açıq idi — Post yaranmalıdır").not.toBeNull();
    expect(memory.visibility).toBe("CLASS");

    // --- Albomda görünür ---
    await page.goto(`/class/${cohort.slug}/yearbook`);
    await expect(page.getByText(title)).toBeVisible();

    // --- Lentdə görünür ---
    await page.goto(`/class/${cohort.slug}/feed`);
    await expect(page.locator(`#post-${memory.postId}`)).toBeVisible();

    // --- `showInFeed` söndürülür ---
    await page.goto(`/class/${cohort.slug}/memories`);
    const card = page.locator(`#memory-${memory.id}`);
    await card.getByRole("button", { name: "Xatirə əməliyyatları", exact: true }).click();
    await page.getByRole("menuitem", { name: "Redaktə et", exact: true }).click();

    const editForm = page.getByRole("form", { name: "Xatirə formu" });
    await editForm
      .getByRole("checkbox", { name: "Sinif lentində paylaş", exact: true })
      .click();
    await editForm
      .getByRole("button", { name: "Dəyişikliyi saxla", exact: true })
      .click();
    await expect(page.getByText("Xatirə yeniləndi.")).toBeVisible();

    // T19: server action-dan sonra vəziyyət SERVERDƏ dəyişir → poll.
    await expect
      .poll(async () => {
        const row = await prisma.memory.findUniqueOrThrow({
          where: { id: memory.id },
          select: { showInFeed: true, postId: true },
        });
        return row.showInFeed;
      })
      .toBe(false);

    const post = await prisma.post.findUniqueOrThrow({
      where: { id: memory.postId! },
      select: { status: true },
    });
    // TƏLƏ A: soft delete — sətir qalır, status dəyişir.
    expect(post.status).toBe("DELETED");
    expect(
      await prisma.timelineEntry.count({ where: { postId: memory.postId } }),
    ).toBe(0);

    // --- Lentdən İTDİ ---
    await page.goto(`/class/${cohort.slug}/feed`);
    await expect(page.locator(`#post-${memory.postId}`)).toHaveCount(0);

    // --- Albomda QALDI ---
    await page.goto(`/class/${cohort.slug}/yearbook`);
    await expect(page.getByText(title)).toBeVisible();
  } finally {
    await cleanupMemories(created);
    await cleanupOrphanPosts(stamp);
  }
});

// ---------------------------------------------------------------------------
// 2. 🔴 TƏLƏ A — asılı checkbox
// ---------------------------------------------------------------------------

test("`showInFeed` söndürülü ikən `showInTimeline` checkbox-u DISABLED-dir", async ({
  page,
}) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);

  await login(page, AUTHOR_EMAIL);
  await page.goto(`/class/${cohort.slug}/memories`);

  const form = await openComposer(page, "Asılılıq yoxlaması", "Bu forma göndərilmir.");

  const feed = form.getByRole("checkbox", { name: "Sinif lentində paylaş", exact: true });
  const timeline = form.getByRole("checkbox", {
    name: "Xronologiyada göstər",
    exact: true,
  });

  // Feed açıq ikən seçilə bilir.
  await expect(feed).toBeChecked();
  await expect(timeline).toBeEnabled();

  // Feed söndürülür → timeline DISABLED və izah görünür.
  await feed.click();
  await expect(timeline).toBeDisabled();
  await expect(
    form.getByText("Xronologiyaya əlavə etmək üçün xatirə Feed-də də paylaşılmalıdır."),
  ).toBeVisible();

  // Yenidən açılır → seçilə bilir (vəziyyət ilişib qalmır).
  await feed.click();
  await expect(timeline).toBeEnabled();
});

// ---------------------------------------------------------------------------
// 3. Albom səhifəsi — bölmələr və çap
// ---------------------------------------------------------------------------

test("/yearbook üç bölmə başlığını və «Çap et» düyməsini göstərir", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);

  await login(page, AUTHOR_EMAIL);
  await page.goto(`/class/${cohort.slug}/yearbook`);

  await expect(page.getByRole("heading", { name: "Yaddaqalan an" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unudulmaz dərs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sevimli yer" })).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Çap et / PDF kimi saxla" }),
  ).toBeVisible();

  // Sinfin kimliyi başlıqdadır: ad + akademik illər + üzv sayı.
  const cohortRow = await prisma.cohort.findUniqueOrThrow({
    where: { id: cohort.cohortId },
    select: { displayName: true, admissionYear: true, graduationYear: true },
  });
  await expect(page.getByRole("heading", { name: cohortRow.displayName })).toBeVisible();
  await expect(
    page.getByText(`${cohortRow.admissionYear}—${cohortRow.graduationYear}`),
  ).toBeVisible();
});

test("çap görünüşündə sidebar/header yoxdur və kartlar səhifə arasında bölünmür", async ({
  page,
}) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);

  await login(page, AUTHOR_EMAIL);
  await page.goto(`/class/${cohort.slug}/yearbook`);

  // Ctrl+P önizləməsinin proqram qarşılığı.
  await page.emulateMedia({ media: "print" });

  // Naviqasiya karkası kağıza düşmür (`print:hidden` — DashboardShell).
  await expect(page.locator("aside")).toBeHidden();
  await expect(page.locator("header").first()).toBeHidden();
  await expect(page.getByRole("button", { name: "Çap et / PDF kimi saxla" })).toBeHidden();

  // Bölmə YENİ SƏHİFƏDƏN başlayır, kart isə bölünmür.
  const section = page.locator("section", { has: page.getByRole("heading", { level: 2 }) });
  await expect(section.first()).toHaveCSS("break-before", "page");

  const cardCount = await page.locator("article").count();
  if (cardCount > 0) {
    await expect(page.locator("article").first()).toHaveCSS("break-inside", "avoid");
  }

  await page.emulateMedia({ media: "screen" });
});

// ---------------------------------------------------------------------------
// 4. 🔴 Anonim brauzer CLASS xatirəsini görmür
// ---------------------------------------------------------------------------

test("anonim brauzer CLASS xatirəsini görmür", async ({ browser }: { browser: Browser }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);

  // Sinfin CLASS səviyyəli, aktiv xatirəsi — sızma testinin hədəfi.
  const target = await prisma.memory.findFirstOrThrow({
    where: { cohortId: cohort.cohortId, visibility: "CLASS", status: "ACTIVE" },
    select: { id: true, title: true, guidePlaceId: true },
  });

  // T16: TƏMİZ kontekst — `clearCookies()` kifayət etmir.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Səhifə auth arxasındadır → `/login`-ə yönlənir, məzmun görünmür.
    await page.goto(`/class/${cohort.slug}/memories`);
    await page.waitForURL(/\/login/);
    await expect(page.getByText(target.title)).toHaveCount(0);

    // 2. v1 endpoint-i JSON 401 verir (HTML redirect YOX).
    const response = await page.request.get(
      `/api/v1/cohorts/${cohort.slug}/memories`,
    );
    expect(response.status()).toBe(401);

    const text = await response.text();
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(text).not.toContain("<!DOCTYPE html>");
    expect(text).not.toContain(target.title);
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 5. Dəstək təklifləri səthi
// ---------------------------------------------------------------------------

test("/support təklifləri növ üzrə qruplaşdırır və əlaqə məlumatı göstərmir", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const cohort = await primaryCohortOf(ALUMNI_EMAIL);

  // T16: məzun hesabı üçün ayrı kontekst.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, ALUMNI_EMAIL);
    await page.goto(`/class/${cohort.slug}/support`);

    await expect(
      page.getByRole("heading", { name: "Dəstək təklifləri", level: 1 }),
    ).toBeVisible();

    // Ən azı bir növ qrupu görünür (seed-də məzun sinfində təkliflər var).
    const groups = page.getByRole("heading", { level: 2 });
    expect(await groups.count()).toBeGreaterThan(0);

    // «Əlaqə» düyməsi profil linkidir.
    const contact = page.getByRole("link", { name: "Əlaqə" }).first();
    await expect(contact).toHaveAttribute("href", /^\/u\//);

    // 🔴 E-poçt / telefon SİYAHIDA YOXDUR.
    //
    // ⚠️ Yoxlama `#main`-ə DARALDILIR, bütün səhifəyə yox: header-dəki
    // istifadəçi menyusu VIEWER-İN ÖZ e-poçtunu göstərir (öz məlumatıdır,
    // sızma deyil). Bütün HTML-ə baxsaydıq test səhvən qırılardı.
    const main = (await page.locator("#main").innerHTML()).toLowerCase();
    expect(main).not.toContain("mailto:");
    expect(main).not.toContain("tel:");

    // Siyahıdakı məzunların e-poçt və telefonları AÇIQ ŞƏKİLDƏ yoxlanılır.
    const listed = await prisma.user.findMany({
      where: {
        openToSupport: true,
        memberships: { some: { cohortId: cohort.cohortId } },
        supportOffers: { some: {} },
      },
      select: { email: true, personalEmail: true, phone: true },
    });
    expect(listed.length).toBeGreaterThan(0);

    for (const user of listed) {
      expect(main).not.toContain(user.email.toLowerCase());
      if (user.personalEmail) expect(main).not.toContain(user.personalEmail.toLowerCase());
      if (user.phone) expect(main).not.toContain(user.phone.toLowerCase());
    }
  } finally {
    await context.close();
  }
});
