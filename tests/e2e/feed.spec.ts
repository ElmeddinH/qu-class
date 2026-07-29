// ============================================================================
// tests/e2e/feed.spec.ts
// Blok 4 DoD — Class Feed axınının uçdan-uca yoxlanışı.
//
// Yoxlanılır:
//   · giriş → paylaşım yarat (Timeline checkbox açıq) → BAZADA TimelineEntry
//     var, görünürlük post ilə eynidir, academicYear düzgündür
//   · paylaşımı sil → TimelineEntry bazadan yox olur, Achievement ARCHIVED olur
//   · anonim brauzer CLASS paylaşımını GÖRMÜR (sinif yoldaşı isə görür)
//
// ⚠️ Testlər seed edilmiş `prisma/dev.db`-yə qarşı işləyir. Yaradılan HƏR sətir
// `finally` blokunda təmizlənir (auth.spec.ts eyni nümunəni işlədir) — seed
// determinizmi pozulmamalıdır, əks halda növbəti icra fərqli nəticə verər.
// ============================================================================

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { AchievementStatus, PostStatus, Visibility } from "@/lib/enums";
import { academicYearOf } from "@/lib/stage";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
/** PLAN.md §7 — STUDENT cohort-unda adi üzv. */
const AUTHOR_EMAIL = "rep@qu.edu.az";

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Köməkçilər
//
// ⚠️ Playwright-də `getByRole(..., { name })` DEFAULT olaraq ALT SƏTİR axtarır.
// «Paylaş» filtri «Paylaşım əməliyyatları» düymələrinə də düşür (21 nəticə),
// ona görə bu faylda ad filtrləri `exact: true` ilə işlədilir.
// ---------------------------------------------------------------------------

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL("**/class/**");
}

async function primaryCohortOf(email: string) {
  const membership = await prisma.cohortMembership.findFirst({
    where: { user: { email } },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
    select: {
      userId: true,
      cohort: { select: { id: true, slug: true } },
    },
  });
  if (!membership) throw new Error(`${email} üçün cohort üzvlüyü tapılmadı`);
  return { userId: membership.userId, ...membership.cohort };
}

/**
 * Testin yaratdığı hər şeyi silir.
 *
 * ⚠️ Sıra vacibdir: `Achievement.postId` və `Memory.postId` `onDelete: SetNull`
 * daşıyır, yəni postu silsək onlar sətir kimi QALIR (postId = null) və seed
 * sayını dəyişər. Əvvəlcə onlar, sonra post silinir — `TimelineEntry`,
 * `MediaAsset`, `Comment`, `Reaction` isə `Cascade` ilə gedir.
 */
async function cleanupPosts(postIds: string[]) {
  if (postIds.length === 0) return;

  await prisma.achievement.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.memory.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.notification.deleteMany({ where: { entityId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
}

/** Kompozitoru açıb ortaq sahələri doldurur. */
async function openComposer(page: Page, body: string) {
  await page.getByRole("button", { name: "Sinifinlə nə paylaşmaq istəyirsən?" }).click();

  await page.getByRole("combobox", { name: "Kateqoriya", exact: true }).click();
  await page.getByRole("option", { name: "İlk gün", exact: true }).click();

  await page.getByLabel("Mətn", { exact: true }).fill(body);
}

// ---------------------------------------------------------------------------
// 1. Paylaşım yaradılması → TimelineEntry
// ---------------------------------------------------------------------------

test("paylaşım yaradılır və Timeline qeydi bazada görünür", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const body = `E2E lent testi ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/feed`);
    await expect(page.getByRole("heading", { name: "Sinif lenti" })).toBeVisible();

    await openComposer(page, body);

    // Görünürlük: CLASS (default) — sonra Timeline qeydi ilə müqayisə olunur.
    await page.getByRole("checkbox", { name: "Class Timeline-a əlavə et", exact: true }).click();
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();

    await expect(page.getByText("Paylaşımınız lentə əlavə olundu.")).toBeVisible();

    // --- Baza yoxlaması ---
    const post = await prisma.post.findFirstOrThrow({
      where: { body, authorId: cohort.userId },
      select: {
        id: true,
        cohortId: true,
        category: true,
        visibility: true,
        status: true,
        occurredAt: true,
        showOnTimeline: true,
      },
    });
    created.push(post.id);

    expect(post.status).toBe(PostStatus.ACTIVE);
    expect(post.cohortId).toBe(cohort.id);
    expect(post.showOnTimeline).toBe(true);

    const entry = await prisma.timelineEntry.findUniqueOrThrow({
      where: { postId: post.id },
      select: {
        cohortId: true,
        sourceType: true,
        category: true,
        visibility: true,
        occurredAt: true,
        academicYear: true,
        title: true,
      },
    });

    expect(entry.sourceType).toBe("POST");
    expect(entry.cohortId).toBe(post.cohortId);
    // Kateqoriya və görünürlük post-dan KOPYALANIR.
    expect(entry.category).toBe(post.category);
    expect(entry.visibility).toBe(post.visibility);
    // academicYear məhz `occurredAt`-dan hesablanır.
    expect(entry.academicYear).toBe(academicYearOf(post.occurredAt));
    expect(entry.title).toBe(body);

    // Paylaşım lentdə görünür.
    await expect(page.locator(`#post-${post.id}`)).toBeVisible();
  } finally {
    await cleanupPosts(created);
  }
});

// ---------------------------------------------------------------------------
// 2. Silmə → TimelineEntry yox olur, Achievement ARCHIVED
// ---------------------------------------------------------------------------

test("paylaşım silinəndə Timeline qeydi gedir, nailiyyət arxivlənir", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const body = `E2E silmə testi ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/feed`);

    await openComposer(page, body);

    await page.getByRole("checkbox", { name: "Class Timeline-a əlavə et", exact: true }).click();
    await page.getByRole("checkbox", { name: "Class Achievements-ə əlavə et", exact: true }).click();

    // Nailiyyət bloku açıldı: kateqoriya, ad və tarix MƏCBURİDİR
    // (Achievement.awardedAt sxemdə nullable deyil).
    await page.getByRole("combobox", { name: "Nailiyyət kateqoriyası", exact: true }).click();
    await page.getByRole("option", { name: "Mükafat", exact: true }).click();
    await page.getByLabel("Nailiyyətin adı").fill(`Mükafat ${stamp}`);
    await page.getByLabel("Tarix", { exact: true }).fill("2026-05-20");

    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    await expect(page.getByText("Paylaşımınız lentə əlavə olundu.")).toBeVisible();

    const post = await prisma.post.findFirstOrThrow({
      where: { body, authorId: cohort.userId },
      select: { id: true },
    });
    created.push(post.id);

    // Silmədən ƏVVƏL hər iki törəmə sətir mövcuddur.
    expect(await prisma.timelineEntry.count({ where: { postId: post.id } })).toBe(1);
    const before = await prisma.achievement.findUniqueOrThrow({
      where: { postId: post.id },
      select: { status: true },
    });
    expect(before.status).toBe(AchievementStatus.SUBMITTED);

    // --- Silmə (sahib yolu ilə) ---
    const card = page.locator(`#post-${post.id}`);
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Paylaşım əməliyyatları", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sil", exact: true }).click();

    await expect(page.getByText("Paylaşım silindi.")).toBeVisible();

    // --- Baza yoxlaması: T4 (soft delete cascade-i işə salmır) ---
    const deleted = await prisma.post.findUniqueOrThrow({
      where: { id: post.id },
      select: { status: true },
    });
    expect(deleted.status).toBe(PostStatus.DELETED);

    // TimelineEntry AÇIQ ŞƏKİLDƏ silinməlidir — cascade işə düşmür.
    expect(await prisma.timelineEntry.count({ where: { postId: post.id } })).toBe(0);

    const after = await prisma.achievement.findUniqueOrThrow({
      where: { postId: post.id },
      select: { status: true },
    });
    expect(after.status).toBe(AchievementStatus.ARCHIVED);

    // Silinmiş post lentdə görünmür.
    await expect(page.locator(`#post-${post.id}`)).toHaveCount(0);
  } finally {
    await cleanupPosts(created);
  }
});

// ---------------------------------------------------------------------------
// 3. Anonim istifadəçi CLASS paylaşımını görmür
// ---------------------------------------------------------------------------

test("anonim brauzer CLASS paylaşımını görmür, sinif yoldaşı görür", async ({
  page,
  request,
}) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const body = `E2E məxfilik testi ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/feed`);

    await openComposer(page, body);
    // Görünürlük default CLASS-dır; açıq şəkildə seçilir ki, test niyyəti aydın olsun.
    await page.getByRole("radio", { name: "Sinif", exact: true }).check();
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    await expect(page.getByText("Paylaşımınız lentə əlavə olundu.")).toBeVisible();

    const post = await prisma.post.findFirstOrThrow({
      where: { body, authorId: cohort.userId },
      select: { id: true, visibility: true },
    });
    created.push(post.id);
    expect(post.visibility).toBe(Visibility.CLASS);

    // --- Anonim: `request` fixture-ı brauzer sessiyasından AYRIDIR (cookie yoxdur) ---
    const anonymous = await request.get(`/api/feed?cohortId=${cohort.id}&take=50`);
    expect(anonymous.status()).toBe(200);

    const anonymousPage = (await anonymous.json()) as { items: Array<{ id: string }> };
    const anonymousIds = anonymousPage.items.map((item) => item.id);
    expect(anonymousIds).not.toContain(post.id);

    // --- Sinif yoldaşı (giriş etmiş sessiya) HƏMİN postu görür ---
    const member = await page.request.get(`/api/feed?cohortId=${cohort.id}&take=50`);
    const memberPage = (await member.json()) as { items: Array<{ id: string }> };
    expect(memberPage.items.map((item) => item.id)).toContain(post.id);

    // Anonim ziyarətçi lent SƏHİFƏSİNƏ də düşmür — /login-ə yönləndirilir.
    const anonymousBrowser = await page.context().browser()?.newContext();
    if (anonymousBrowser) {
      const guest = await anonymousBrowser.newPage();
      await guest.goto(`/class/${cohort.slug}/feed`);
      await expect(guest).toHaveURL(/\/login\?callbackUrl=/);
      await anonymousBrowser.close();
    }
  } finally {
    await cleanupPosts(created);
  }
});

// ---------------------------------------------------------------------------
// 4. Reaksiya — T12 (istifadəçi başına BİR reaksiya)
// ---------------------------------------------------------------------------

test("eyni reaksiya iki dəfə basılanda ləğv olunur (P2002 yoxdur)", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const body = `E2E reaksiya testi ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/feed`);

    await openComposer(page, body);
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    await expect(page.getByText("Paylaşımınız lentə əlavə olundu.")).toBeVisible();

    const post = await prisma.post.findFirstOrThrow({
      where: { body, authorId: cohort.userId },
      select: { id: true },
    });
    created.push(post.id);

    const card = page.locator(`#post-${post.id}`);
    // Say artdıqca əlçatan ad dəyişir ("Bəyənirəm" → "Bəyənirəm (1)").
    const like = card.getByRole("button", { name: /^Bəyənirəm/ });

    // Birinci basış → reaksiya yaranır.
    await like.click();
    await expect
      .poll(() => prisma.reaction.count({ where: { postId: post.id } }))
      .toBe(1);

    // İkinci basış → `create` DEYİL, `delete`. P2002 alınsaydı burada
    // xəta toast-ı çıxar və say 1 qalardı.
    await like.click();
    await expect
      .poll(() => prisma.reaction.count({ where: { postId: post.id } }))
      .toBe(0);

    await expect(page.getByText("Reaksiya saxlanmadı.")).toHaveCount(0);
  } finally {
    await cleanupPosts(created);
  }
});

// ---------------------------------------------------------------------------
// 5. Sonsuz sürüşmə
// ---------------------------------------------------------------------------

test("sonsuz sürüşmə ikinci səhifəni gətirir", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);

  // Test yalnız səhifə ölçüsündən (20) çox postu olan sinifdə mənalıdır.
  const total = await prisma.post.count({
    where: { cohortId: cohort.id, status: PostStatus.ACTIVE },
  });
  expect(total, "seed bu sinif üçün 20-dən çox post yaratmalıdır").toBeGreaterThan(20);

  await login(page, AUTHOR_EMAIL);
  await page.goto(`/class/${cohort.slug}/feed`);

  const cards = page.locator('[id^="post-"]');
  await expect(cards).toHaveCount(20);

  // Siyahının sonundakı sentinel görünəndə növbəti səhifə çəkilir.
  await page.getByRole("button", { name: "Daha çox göstər" }).scrollIntoViewIfNeeded();
  await expect.poll(() => cards.count()).toBeGreaterThan(20);
});

// ---------------------------------------------------------------------------
// 6. Şərhlər — lazy yüklənmə, yazma, soft delete
// ---------------------------------------------------------------------------

test("şərh yazılır və silinəndə soft-delete olur", async ({ page }) => {
  const cohort = await primaryCohortOf(AUTHOR_EMAIL);
  const stamp = Date.now().toString(36);
  const body = `E2E şərh testi ${stamp}`;
  const created: string[] = [];

  try {
    await login(page, AUTHOR_EMAIL);
    await page.goto(`/class/${cohort.slug}/feed`);

    await openComposer(page, body);
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    await expect(page.getByText("Paylaşımınız lentə əlavə olundu.")).toBeVisible();

    const post = await prisma.post.findFirstOrThrow({
      where: { body, authorId: cohort.userId },
      select: { id: true },
    });
    created.push(post.id);

    const card = page.locator(`#post-${post.id}`);

    // Şərhlər LAZY-dir: düyməyə basılana qədər yüklənmir.
    await card.getByRole("button", { name: "Şərh yaz", exact: true }).click();
    await expect(card.getByText("Hələ şərh yoxdur. İlk fikri sən yaz.")).toBeVisible();

    const text = `Təbriklər! ${stamp}`;
    await card.getByLabel("Şərh mətni").fill(text);
    await card.getByRole("button", { name: "Göndər", exact: true }).click();

    await expect(card.getByText(text)).toBeVisible();

    const comment = await prisma.comment.findFirstOrThrow({
      where: { postId: post.id, body: text },
      select: { id: true, status: true, parentId: true },
    });
    expect(comment.status).toBe("ACTIVE");
    expect(comment.parentId).toBeNull();

    // --- Silmə: soft delete (sətir qalır, status DELETED) ---
    await card.getByRole("button", { name: "Sil", exact: true }).click();
    await expect(page.getByText("Şərh silindi.")).toBeVisible();

    const afterDelete = await prisma.comment.findUniqueOrThrow({
      where: { id: comment.id },
      select: { status: true },
    });
    expect(afterDelete.status).toBe("DELETED");
  } finally {
    await cleanupPosts(created);
  }
});
