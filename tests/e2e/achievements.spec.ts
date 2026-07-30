// ============================================================================
// tests/e2e/achievements.spec.ts
// Blok 8 DoD — Class Timeline [M8] + Class Achievements [M10] + moderasiya.
//
// Yoxlanılır:
//   · moderator təsdiq növbəsini açır, SUBMITTED nailiyyəti təsdiqləyir →
//     nailiyyət qridə düşür → BAZADA TimelineEntry yaranır → AuditLog var
//   · həmin nailiyyət arxivlənəndə TimelineEntry bazadan YOX olur (TƏLƏ C)
//   · adi üzv (CLASS_REPRESENTATIVE) moderasiya səhifəsinə BURAXILMIR (403)
//   · timeline filtri URL-də saxlanılır və səhifə yeniləndikdən sonra qalır
//   · sistem milestone-ları xronologiyada görünür
//
// 🔴 TƏLƏ T16: iki hesabla NÖVBƏ İLƏ giriş üçün `clearCookies()` KİFAYƏT
// ETMİR — hər hesab üçün `browser.newContext()` (aşağıdaki `withAccount`).
//
// 🔴 TƏLƏ T19: server action-dan sonra siyahı SERVERDƏ yenilənir
// (`revalidatePath` + `router.refresh()`), yəni klikdən dərhal sonra oxumaq
// KÖHNƏ vəziyyəti verir → `expect.poll`.
//
// ⚠️ Test YAZIR: seçilmiş nailiyyətin statusu və törəmə sətirlər `finally`-də
// geri qaytarılır (seed determinizmi — `npm run db:seed` təkrar tələb
// olunmamalıdır).
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";

/** PLAN.md §7: hər üçü `sec2023` sinfindədir. */
const MODERATOR = { email: "moderator@qu.edu.az", slug: "informasiya-tehlukesizliyi-2027" };
const MEMBER = { email: "rep@qu.edu.az", slug: "informasiya-tehlukesizliyi-2027" };

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

interface AchievementSnapshot {
  id: string;
  status: string;
  verifiedById: string | null;
  verifiedAt: Date | null;
  verifyNote: string | null;
  title: string;
}

/** Növbədəki ilk SUBMITTED nailiyyət + onu geri qaytarmaq üçün snapshot. */
async function takeQueueTarget(slug: string): Promise<AchievementSnapshot> {
  return prisma.achievement.findFirstOrThrow({
    where: { cohort: { slug }, status: "SUBMITTED" },
    select: {
      id: true,
      status: true,
      verifiedById: true,
      verifiedAt: true,
      verifyNote: true,
      title: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Testin yaratdığı bütün sətirləri silib nailiyyəti seed vəziyyətinə qaytarır. */
async function restore(target: AchievementSnapshot) {
  await prisma.timelineEntry.deleteMany({ where: { achievementId: target.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: target.id } });
  await prisma.notification.deleteMany({
    where: { entityId: target.id, type: { in: ["ACHIEVEMENT_VERIFIED", "MODERATION_RESULT"] } },
  });
  await prisma.achievement.update({
    where: { id: target.id },
    data: {
      status: target.status,
      verifiedById: target.verifiedById,
      verifiedAt: target.verifiedAt,
      verifyNote: target.verifyNote,
    },
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Moderasiya axını — təsdiq → qrid → TimelineEntry → AuditLog
// ---------------------------------------------------------------------------

test("moderator nailiyyəti təsdiqləyir: qridə düşür, TimelineEntry və AuditLog yaranır", async ({
  page,
}) => {
  const target = await takeQueueTarget(MODERATOR.slug);

  // Seed-də bu nailiyyətin xronologiya qeydi OLMAMALIDIR (SUBMITTED-dir).
  expect(
    await prisma.timelineEntry.count({ where: { achievementId: target.id } }),
  ).toBe(0);

  try {
    await login(page, MODERATOR.email);
    await page.goto(`/class/${MODERATOR.slug}/achievements/moderation`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Nailiyyət təsdiqi" }),
    ).toBeVisible();

    const card = page.locator("li").filter({ hasText: target.title }).first();
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Təsdiqlə" }).click();

    // TƏLƏ T19: qərar server action-dadır, nəticə növbəti render-lə gəlir.
    await expect
      .poll(
        async () =>
          prisma.achievement
            .findUniqueOrThrow({ where: { id: target.id }, select: { status: true } })
            .then((row) => row.status),
        { timeout: 15_000 },
      )
      .toBe("VERIFIED");

    // --- BAZADA TimelineEntry yarandı ---
    const entry = await prisma.timelineEntry.findUnique({
      where: { achievementId: target.id },
      select: { sourceType: true, isSystemMilestone: true },
    });
    expect(entry, "təsdiqdən sonra TimelineEntry").not.toBeNull();
    expect(entry!.sourceType).toBe("ACHIEVEMENT");
    expect(entry!.isSystemMilestone).toBe(false);

    // --- AuditLog sətri var ---
    const audit = await prisma.auditLog.findMany({
      where: { entityId: target.id },
      select: { action: true, metadata: true },
    });
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.some((row) => row.action === "VERIFY")).toBe(true);

    // --- Nailiyyət artıq QRİDdə görünür ---
    await page.goto(`/class/${MODERATOR.slug}/achievements`);
    await expect(page.getByText(target.title).first()).toBeVisible({ timeout: 15_000 });

    // --- TƏLƏ C: arxivləyəndə TimelineEntry bazadan YOX olur ---
    await page.goto(`/class/${MODERATOR.slug}/achievements/moderation`);

    // Təsdiqlənmiş nailiyyət artıq növbədə deyil → onu birbaşa arxivləmək üçün
    // növbədəki NÖVBƏTİ nailiyyəti işlətmirik: eyni sətri UI-dan arxivləmək
    // üçün əvvəlcə statusu geri SUBMITTED edirik (moderator UI-sı yalnız
    // növbədəki qeydlərlə işləyir).
    await prisma.achievement.update({
      where: { id: target.id },
      data: { status: "SUBMITTED" },
    });

    await page.reload();
    const again = page.locator("li").filter({ hasText: target.title }).first();
    await expect(again).toBeVisible({ timeout: 15_000 });

    await again.getByRole("textbox").fill("Sənəd təsdiqlənmədi.");
    await again.getByRole("button", { name: /rədd et/i }).click();

    await expect
      .poll(
        async () => prisma.timelineEntry.count({ where: { achievementId: target.id } }),
        { timeout: 15_000 },
      )
      .toBe(0);

    const archived = await prisma.achievement.findUniqueOrThrow({
      where: { id: target.id },
      select: { status: true, verifyNote: true },
    });
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.verifyNote).toBe("Sənəd təsdiqlənmədi.");
  } finally {
    await restore(target);
  }
});

// ---------------------------------------------------------------------------
// 2. İcazə sərhədi — adi üzv moderasiya səhifəsinə buraxılmır (TƏLƏ T16)
// ---------------------------------------------------------------------------

test("adi üzv moderasiya səhifəsinə buraxılmır, moderator buraxılır", async ({
  browser,
}) => {
  // Moderator: səhifə açılır.
  await withAccount(browser, MODERATOR.email, async (page) => {
    await page.goto(`/class/${MODERATOR.slug}/achievements/moderation`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Nailiyyət təsdiqi" }),
    ).toBeVisible();
  });

  // Sinif nümayəndəsi (CLASS_REPRESENTATIVE) — EYNİ URL, 403.
  await withAccount(browser, MEMBER.email, async (page) => {
    await page.goto(`/class/${MEMBER.slug}/achievements/moderation`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Nailiyyət təsdiqi" }),
    ).toHaveCount(0);
    // `forbidden()` → `app/forbidden.tsx`
    await expect(
      page.getByRole("heading", { level: 1, name: "Giriş qadağandır" }),
    ).toBeVisible();
  });
});

test("moderasiya keçidi yalnız moderatora göstərilir", async ({ browser }) => {
  await withAccount(browser, MODERATOR.email, async (page) => {
    await page.goto(`/class/${MODERATOR.slug}/achievements`);
    await expect(page.getByRole("link", { name: "Təsdiq növbəsi" })).toBeVisible();
  });

  await withAccount(browser, MEMBER.email, async (page) => {
    await page.goto(`/class/${MEMBER.slug}/achievements`);
    await expect(page.getByRole("link", { name: "Təsdiq növbəsi" })).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Nailiyyət səhifəsi — kateqoriya filtri URL-də
// ---------------------------------------------------------------------------

test("kateqoriya filtri URL-də saxlanılır", async ({ page }) => {
  await login(page, MEMBER.email);
  await page.goto(`/class/${MEMBER.slug}/achievements`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Sinif nailiyyətləri" }),
  ).toBeVisible();

  const before = await resultCount(page, /(\d+) nailiyyət/);
  expect(before).toBeGreaterThan(0);

  await page
    .getByRole("group", { name: "Nailiyyət kateqoriyaları" })
    .getByRole("button", { name: "Mükafat" })
    .click();

  await page.waitForURL(/[?&]category=AWARD/);
  await expect
    .poll(() => resultCount(page, /(\d+) nailiyyət/), { timeout: 15_000 })
    .toBeLessThan(before);

  // Paylaşıla bilən link: yenilədikdən sonra filtr qalır.
  const shared = page.url();
  await page.reload();
  await expect(page).toHaveURL(shared);
  await expect(
    page.getByRole("button", { name: "Mükafat" }).first(),
  ).toHaveAttribute("aria-pressed", "true");
});

// ---------------------------------------------------------------------------
// 4. Xronologiya — filtr URL-də, milestone-lar görünür
// ---------------------------------------------------------------------------

test("timeline səhifəsində tədris ili filtri URL-də saxlanılır", async ({ page }) => {
  await login(page, MEMBER.email);
  await page.goto(`/class/${MEMBER.slug}/timeline`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Sinif xronologiyası" }),
  ).toBeVisible();

  const before = await resultCount(page, /(\d+) qeyd/);
  expect(before).toBeGreaterThan(1);

  // Tədris ili — Radix Select, ilk real seçim ("Bütün illər"dən sonrakı).
  await page.getByRole("combobox", { name: "Tədris ili" }).click();
  const option = page.getByRole("option").nth(1);
  const year = (await option.innerText()).trim();
  await option.click();

  await page.waitForURL(/[?&]year=/);
  await expect
    .poll(() => resultCount(page, /(\d+) qeyd/), { timeout: 15_000 })
    .toBeLessThan(before);

  expect(new URL(page.url()).searchParams.get("year")).toBe(year);

  // Səhifə yeniləndikdən sonra filtr QALIR (paylaşıla bilən link).
  const shared = page.url();
  const filtered = await resultCount(page, /(\d+) qeyd/);
  await page.reload();

  await expect(page).toHaveURL(shared);
  await expect
    .poll(() => resultCount(page, /(\d+) qeyd/), { timeout: 15_000 })
    .toBe(filtered);
  await expect(page.getByRole("button", { name: /filtrini götür/ }).first()).toBeVisible();
});

test("sistem milestone-ları xronologiyada görünür", async ({ page }) => {
  const milestones = await prisma.timelineEntry.findMany({
    where: { cohort: { slug: MEMBER.slug }, isSystemMilestone: true },
    select: { title: true, visibility: true },
  });

  expect(milestones.length, "seed/servis milestone-ları").toBeGreaterThan(0);
  // TƏLƏ B — heç biri PRIVATE deyil, yoxsa səhifədə görünə bilməzdi.
  for (const milestone of milestones) expect(milestone.visibility).not.toBe("PRIVATE");

  await login(page, MEMBER.email);
  await page.goto(`/class/${MEMBER.slug}/timeline`);

  await expect(page.getByText("Dərslər başladı").first()).toBeVisible();
  await expect(page.getByText("Sinif tarixçəsi").first()).toBeVisible();

  // Mənbə filtri: yalnız sistem hadisələri.
  await page.getByRole("combobox", { name: "Mənbə" }).click();
  await page.getByRole("option", { name: "Sistem hadisəsi" }).click();
  await page.waitForURL(/[?&]source=SYSTEM/);

  await expect
    .poll(() => resultCount(page, /(\d+) qeyd/), { timeout: 15_000 })
    .toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Köməkçi
// ---------------------------------------------------------------------------

/**
 * Səhifədəki "N qeyd" / "N nailiyyət" sətrindən rəqəmi oxuyur.
 *
 * ⚠️ Bu sətir SERVERDƏ render olunur; `nuqs` URL-i dərhal dəyişir, nəticə isə
 * server cavabı ilə gəlir → `expect.poll` (TƏLƏ T19).
 */
async function resultCount(page: Page, pattern: RegExp): Promise<number> {
  const text = await page.getByText(pattern).first().innerText();
  return Number.parseInt(text, 10);
}
