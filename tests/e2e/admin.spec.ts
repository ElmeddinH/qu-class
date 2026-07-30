// ============================================================================
// tests/e2e/admin.spec.ts
// Blok 11B DoD — admin paneli [M17].
//
// 🔴 FAYLIN ƏSAS SUALLARI:
//   1. `ADMIN_NAV`-dakı 8 bölmənin HAMISI real səhifədir (404 yoxdur)
//   2. 🔴 adi üzv HEÇ BİR admin route-una buraxılmır
//   3. 🔴 şikayət növbəsi MƏZMUN GÖSTƏRMİR; «moderasiya baxışı» audit yazır
//   4. qərar verilir → status dəyişir, audit sətri artır
//   5. rol dəyişikliyi → hədəfə bildiriş, audit sətri
//   6. CSV import: nümunə fayl → önizləmə → təsdiq → istifadəçi sayı artır
//   7. 🔴 `/admin/audit`-də SİLMƏ düyməsi YOXDUR (TƏLƏ D)
//
// ⚠️ Test YAZIR. Dəyişdirilən hər sətir `finally` / `afterAll`-da GERİ
// QAYTARILIR, yaradılan hər istifadəçi SİLİNİR — seed determinizmi
// pozulmamalıdır (mövcud intizam: `notifications.spec.ts`, `events.spec.ts`).
//
// ⚠️ T16 — icazə testləri TƏMİZ `newContext` ilə işləyir (kuka qarışmasın).
// ⚠️ T19 — server action-dan sonra nəticə SERVERDƏN gəlir → `expect.poll`.
// ⚠️ T29 — `<select>` üçün `getByRole("combobox")`.
// ============================================================================

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@qu.edu.az";
const MEMBER_EMAIL = "rep@qu.edu.az";

/** `layouts/nav.ts` → `ADMIN_NAV`-ın səkkiz admin bölməsi. */
const ADMIN_ROUTES = [
  { path: "/admin", heading: "İdarə paneli" },
  { path: "/admin/cohorts", heading: "Siniflər" },
  { path: "/admin/users", heading: "İstifadəçilər" },
  { path: "/admin/moderation", heading: "Şikayət növbəsi" },
  { path: "/admin/achievements", heading: "Nailiyyət təsdiqi" },
  { path: "/admin/audit", heading: "Audit jurnalı" },
  { path: "/admin/content", heading: "Məzmun idarəsi" },
  { path: "/admin/stats", heading: "Analitika" },
] as const;

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

// ---------------------------------------------------------------------------
// 1. Naviqasiya — 8 bölmənin hamısı real səhifədir
// ---------------------------------------------------------------------------

test("admin@ /admin-i açır və 8 bölmənin hamısına keçid işləyir", async ({ page }) => {
  await login(page, ADMIN_EMAIL);

  for (const route of ADMIN_ROUTES) {
    const response = await page.goto(route.path);

    expect(response?.status(), `${route.path} → ${response?.status()}`).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
      `${route.path} başlığı`,
    ).toBeVisible();
  }
});

test("sidebar linkləri real səhifələrə aparır", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin");

  const sidebar = page.getByRole("navigation").first();
  await sidebar.getByRole("link", { name: "Şikayət növbəsi" }).click();
  await page.waitForURL("**/admin/moderation");

  await expect(
    page.getByRole("heading", { level: 1, name: "Şikayət növbəsi" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. 🔴 Adi üzv heç bir admin route-una buraxılmır
// ---------------------------------------------------------------------------

test("🔴 rep@ (adi üzv) hər admin route-una BURAXILMIR", async ({ browser }) => {
  // T16 — təmiz kontekst: admin kukisi qalıqda olmamalıdır.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, MEMBER_EMAIL);

    for (const route of ADMIN_ROUTES) {
      await page.goto(route.path);

      // Middleware admin olmayanı `/home`-a yönləndirir; qapı atlansa
      // `requireAdmin()` 403 verir. Hər iki halda BÖLMƏ AÇILMIR.
      const url = new URL(page.url());
      const blocked =
        url.pathname !== route.path ||
        (await page.getByText("Giriş qadağandır").count()) > 0;

      expect(blocked, `${route.path} adi üzvə açıldı`).toBe(true);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
});

test("🔴 adi üzv admin API endpoint-lərindən 403 alır", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, MEMBER_EMAIL);

    for (const path of [
      "/api/v1/admin/stats",
      "/api/v1/admin/reports",
      "/api/v1/admin/audit",
      "/api/v1/admin/users",
    ]) {
      const response = await page.request.get(path);
      expect(response.status(), `${path} statusu`).toBe(403);

      const body = await response.json();
      expect(body.error?.code).toBe("FORBIDDEN");
      // 🔴 Cavab JSON-dur — HTML yönləndirmə YOXDUR (Blok 9S qərarı).
      expect(response.headers()["content-type"]).toContain("application/json");
    }
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 3. 🔴 TƏLƏ A — növbə məzmunu göstərmir, baxış audit yazır
// ---------------------------------------------------------------------------

test("🔴 şikayət növbəsi ŞİKAYƏT OLUNAN MƏZMUNU göstərmir", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/moderation");

  await expect(
    page.getByRole("heading", { level: 1, name: "Şikayət növbəsi" }),
  ).toBeVisible();

  // Növbədəki İLK POST şikayətinin hədəfini tapıb onun gövdəsinin ekranda
  // OLMADIĞINI yoxlayırıq.
  const report = await prisma.report.findFirst({
    where: { entityType: "POST", status: "OPEN" },
    select: { entityId: true },
  });

  if (report) {
    const post = await prisma.post.findUnique({
      where: { id: report.entityId },
      select: { body: true },
    });

    if (post?.body) {
      // Gövdənin xarakterik parçası — səhifədə OLMAMALIDIR.
      const needle = post.body.slice(0, 40);
      await expect(page.locator("body")).not.toContainText(needle);
    }
  }

  // Əvəzinə: baxış düyməsi və izah mətni var.
  await expect(page.getByRole("button", { name: "Moderasiya baxışı" }).first()).toBeVisible();
});

test("🔴 «Moderasiya baxışı» AuditLog sətri yaradır və məzmunu açır", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/moderation?st=OPEN&et=POST");

  const idsBefore = new Set(
    (
      await prisma.auditLog.findMany({
        where: { action: "MODERATE", entityType: "Report" },
        select: { id: true },
      })
    ).map((row) => row.id),
  );
  const before = idsBefore.size;

  const button = page.getByRole("button", { name: "Moderasiya baxışı" }).first();
  await expect(button).toBeVisible();
  await button.click();

  // T19 — nəticə server action-dan gəlir.
  await expect
    .poll(
      async () =>
        prisma.auditLog.count({ where: { action: "MODERATE", entityType: "Report" } }),
      { message: "baxış audit sətri yaratmadı" },
    )
    .toBe(before + 1);

  // Baxışdan SONRA məzmun ekrandadır.
  await expect(page.getByText("Paylaşım", { exact: true }).first()).toBeVisible();

  // Təmizlik: YALNIZ testin yaratdığı sətir silinir (`id` çoxluğu ilə).
  const after = await prisma.auditLog.findMany({
    where: { action: "MODERATE", entityType: "Report" },
    select: { id: true },
  });
  const extra = after.filter((row) => !idsBefore.has(row.id)).map((row) => row.id);
  if (extra.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: extra } } });
  }
});

// ---------------------------------------------------------------------------
// 4. Qərar → status dəyişir, audit artır
// ---------------------------------------------------------------------------

test("şikayət növbəsində qərar verilir → status dəyişir, AuditLog artır", async ({
  page,
}) => {
  // ⚠️ SIRA TESTİN BİR HİSSƏSİDİR: səhifə `createdAt desc, id desc` ilə
  // sıralayır və test EKRANDAKI BİRİNCİ kartla işləyir. Sorğu eyni sıranı
  // təkrarlamasa test başqa şikayəti yoxlayardı və səbəbsiz qırılardı.
  const report = await prisma.report.findFirst({
    where: { status: "OPEN", entityType: "POST" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      resolvedById: true,
      resolvedAt: true,
      resolution: true,
    },
  });
  expect(report, "seed-də AÇIQ paylaşım şikayəti olmalıdır").toBeTruthy();

  // 🔴 TƏMİZLİK `id` ÇOXLUĞU İLƏ: seed audit sətirlərinin bir hissəsi GƏLƏCƏK
  // tarixlidir (`resolvedAt = createdAt + 1..10 gün`), yəni «ən yeni N sətri
  // sil» yolu SEED sətirlərini aparardı — say düz qalar, məzmun sürüşərdi.
  const auditIdsBefore = new Set(
    (await prisma.auditLog.findMany({ select: { id: true } })).map((row) => row.id),
  );
  const auditBefore = auditIdsBefore.size;

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/moderation?st=OPEN&et=POST");

    await page
      .getByLabel("Qərarın izahı (həll və rədd üçün məcburidir)")
      .first()
      .fill("E2E testi — yoxlanıldı.");
    await page.getByRole("button", { name: "Həll edildi" }).first().click();

    await expect
      .poll(
        async () => {
          const row = await prisma.report.findUnique({
            where: { id: report!.id },
            select: { status: true },
          });
          return row?.status;
        },
        { message: "şikayət statusu dəyişmədi" },
      )
      .not.toBe("OPEN");

    expect(await prisma.auditLog.count()).toBeGreaterThan(auditBefore);
  } finally {
    // Şikayət və testin yazdığı audit / bildiriş sətirləri geri qaytarılır.
    await prisma.report.update({
      where: { id: report!.id },
      data: {
        status: report!.status,
        resolvedById: report!.resolvedById,
        resolvedAt: report!.resolvedAt,
        resolution: report!.resolution,
      },
    });

    const audits = await prisma.auditLog.findMany({ select: { id: true } });
    const extra = audits.filter((row) => !auditIdsBefore.has(row.id));
    if (extra.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: extra.map((a) => a.id) } },
      });
    }
    await prisma.notification.deleteMany({
      where: { title: { in: ["Şikayətiniz həll edildi"] }, body: { contains: "E2E testi" } },
    });
  }
});

// ---------------------------------------------------------------------------
// 4b. 🔴 TOPLU MODERASİYA (Blok 12B)
//
// SUALLAR:
//   1. checkbox ilə çoxlu seçim işləyirmi?
//   2. 🔴 HƏR element üçün AYRICA audit sətri yaranırmı (bir yekun sətir YOX)?
//   3. 🔴 qismən uğur varmı? (artıq bağlanmış şikayət seçilsə HEÇ BİRİ
//      dəyişməməlidir — hamısı bir `$transaction`-dadır)
//
// ⚠️ Test YAZIR — dəyişən hər sətir `finally`-də GERİ QAYTARILIR.
// ---------------------------------------------------------------------------

test("🔴 toplu qərar: hər element üçün AYRICA audit sətri, yekun sətir YOX", async ({
  page,
}) => {
  // ⚠️ Növ FİLTRİ YOXDUR: seed-də hər növdən BİR açıq şikayət var (POST,
  // MEMORY, USER), yəni «iki açıq POST» tələb etsək test seed-dən asılı olaraq
  // qırılardı. Toplu əməliyyat onsuz da növdən asılı deyil.
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 2,
    select: {
      id: true,
      status: true,
      resolvedById: true,
      resolvedAt: true,
      resolution: true,
    },
  });
  expect(reports.length, "seed-də ən azı iki AÇIQ şikayət olmalıdır").toBe(2);

  const auditIdsBefore = new Set(
    (await prisma.auditLog.findMany({ select: { id: true } })).map((row) => row.id),
  );

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/moderation?st=OPEN");

    const bar = page.getByTestId("bulk-moderation-bar");
    await expect(bar).toBeVisible();

    // Sətir checkbox-ları — ilk ikisi işarələnir.
    const checkboxes = page.getByRole("checkbox", { name: /Toplu əməliyyat üçün seç/ });
    await expect.poll(async () => checkboxes.count()).toBeGreaterThanOrEqual(2);

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expect(bar.getByText("2 şikayət seçilib")).toBeVisible();

    await bar
      .getByLabel(/Qərarın izahı — seçilmiş HƏR şikayət üçün/)
      .fill("E2E toplu testi — yoxlanıldı.");
    await bar.getByRole("button", { name: "Seçilmişləri həll et" }).click();

    // 🔴 T19 — nəticə serverdən gəlir.
    await expect
      .poll(
        async () =>
          prisma.report.count({
            where: { id: { in: reports.map((r) => r.id) }, status: "RESOLVED" },
          }),
        { message: "toplu qərar tətbiq olunmadı" },
      )
      .toBe(2);

    // 🔴 ƏSAS ÖLÇÜ: HƏR şikayət üçün AYRICA sətir — ikisi də ayrı `entityId`.
    for (const report of reports) {
      const rows = await prisma.auditLog.findMany({
        where: { entityType: "Report", entityId: report.id },
        select: { id: true, action: true },
      });
      const fresh = rows.filter((row) => !auditIdsBefore.has(row.id));

      expect(fresh.length, `${report.id} üçün audit sətri`).toBe(1);
      expect(fresh[0].action).toBe("UPDATE");
    }

    // 🔴 YEKUN SƏTİR YOXDUR: yaranan bütün yeni sətirlərin `entityId`-si
    // seçilmiş şikayətlərdən biridir — «partiya» adlı ayrıca sətir yoxdur.
    const allNew = (
      await prisma.auditLog.findMany({
        where: { entityType: "Report" },
        select: { id: true, entityId: true },
      })
    ).filter((row) => !auditIdsBefore.has(row.id));

    expect(allNew.length).toBe(2);
    expect(allNew.every((row) => reports.some((r) => r.id === row.entityId))).toBe(true);
  } finally {
    for (const report of reports) {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: report.status,
          resolvedById: report.resolvedById,
          resolvedAt: report.resolvedAt,
          resolution: report.resolution,
        },
      });
    }

    const audits = await prisma.auditLog.findMany({ select: { id: true } });
    const extra = audits.filter((row) => !auditIdsBefore.has(row.id));
    if (extra.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: extra.map((row) => row.id) } },
      });
    }
    await prisma.notification.deleteMany({
      where: { body: { contains: "E2E toplu testi" } },
    });
  }
});

test("🔴 toplu qərarda QİSMƏN UĞUR yoxdur — bağlanmış sətir seçilsə heç biri dəyişmir", async ({
  page,
}) => {
  const open = await prisma.report.findFirstOrThrow({
    where: { status: "OPEN" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, status: true },
  });

  const auditIdsBefore = new Set(
    (await prisma.auditLog.findMany({ select: { id: true } })).map((row) => row.id),
  );

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/moderation?st=OPEN");

    const checkboxes = page.getByRole("checkbox", { name: /Toplu əməliyyat üçün seç/ });
    await expect.poll(async () => checkboxes.count()).toBeGreaterThan(0);
    await checkboxes.nth(0).check();

    // Seçim edildikdən SONRA həmin şikayət başqa yoldan bağlanır — server
    // əməliyyatı tamamilə rədd etməlidir (yarısını tətbiq etməməlidir).
    await prisma.report.update({
      where: { id: open.id },
      data: { status: "RESOLVED", resolution: "E2E yarış testi" },
    });

    const bar = page.getByTestId("bulk-moderation-bar");
    await bar
      .getByLabel(/Qərarın izahı — seçilmiş HƏR şikayət üçün/)
      .fill("E2E yarış testi — rədd olunmalıdır.");
    await bar.getByRole("button", { name: "Seçilmişləri rədd et" }).click();

    // Azərbaycanca səbəb göstərilir.
    await expect(page.getByText(/artıq bağlanıb/)).toBeVisible();

    // Status DƏYİŞMƏYİB (REJECTED olmayıb) və audit sətri YAZILMAYIB.
    const after = await prisma.report.findUniqueOrThrow({
      where: { id: open.id },
      select: { status: true },
    });
    expect(after.status).toBe("RESOLVED");

    const newAudits = (
      await prisma.auditLog.findMany({
        where: { entityType: "Report", entityId: open.id },
        select: { id: true },
      })
    ).filter((row) => !auditIdsBefore.has(row.id));
    expect(newAudits.length, "rədd olunan əməliyyat audit sətri yazmamalıdır").toBe(0);
  } finally {
    await prisma.report.update({
      where: { id: open.id },
      data: { status: open.status, resolution: null, resolvedById: null, resolvedAt: null },
    });

    const audits = await prisma.auditLog.findMany({ select: { id: true } });
    const extra = audits.filter((row) => !auditIdsBefore.has(row.id));
    if (extra.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: extra.map((row) => row.id) } },
      });
    }
    await prisma.notification.deleteMany({
      where: { body: { contains: "E2E yarış testi" } },
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Rol dəyişikliyi → bildiriş + audit
// ---------------------------------------------------------------------------

test("rol dəyişikliyi → hədəfə bildiriş gedir, audit sətri yaranır", async ({ page }) => {
  const target = await prisma.user.findUniqueOrThrow({
    where: { email: "coordinator@qu.edu.az" },
    select: { id: true, systemRole: true },
  });

  const notificationsBefore = await prisma.notification.count({
    where: { recipientId: target.id },
  });
  const auditBefore = await prisma.auditLog.count({
    where: { action: "ROLE_CHANGE", entityId: target.id },
  });

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto(`/admin/users?q=${encodeURIComponent("coordinator@qu.edu.az")}`);

    await page.getByRole("button", { name: /üçün əməliyyatlar$/ }).first().click();
    await page.getByRole("button", { name: "Admin et" }).first().click();

    await expect
      .poll(
        async () =>
          prisma.auditLog.count({ where: { action: "ROLE_CHANGE", entityId: target.id } }),
        { message: "rol dəyişikliyi audit sətri yaratmadı" },
      )
      .toBe(auditBefore + 1);

    expect(
      await prisma.notification.count({ where: { recipientId: target.id } }),
      "hədəfə bildiriş getmədi",
    ).toBe(notificationsBefore + 1);
  } finally {
    await prisma.user.update({
      where: { id: target.id },
      data: { systemRole: target.systemRole },
    });
    await prisma.auditLog.deleteMany({
      where: { action: "ROLE_CHANGE", entityId: target.id, createdAt: { gte: new Date(Date.now() - 600_000) } },
    });
    await prisma.notification.deleteMany({
      where: {
        recipientId: target.id,
        title: "Sizə administrator səlahiyyəti verildi",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// 5b. 🔴 İKİNCİ DƏRƏCƏLİ KOHORTDA rol redaktəsi (Blok 12B)
//
// SUAL: istifadəçi İKİ sinifdədirsə, İKİNCİSİNDƏ rolunu dəyişmək olurmu?
// Əvvəl UI yalnız `cohorts[0]`-ı (əsas sinif) göstərirdi, yəni ikinci
// üzvlüyün rolu heç bir yerdən dəyişdirilə bilmirdi.
//
// ⚠️ Seed-də çox-sinifli istifadəçi YOXDUR, ona görə test müvəqqəti ikinci
// üzvlük yaradır və `finally`-də SİLİR (seed determinizmi pozulmur).
//
// ⚠️ İki rol qarışdırılmır: burada dəyişən COHORT rolu (`CLASS_MODERATOR`),
// sistem rolu (`UNIVERSITY_ADMIN`) DEYİL.
// ---------------------------------------------------------------------------

test("ikinci dərəcəli kohortda sinif rolu dəyişir və AYRICA audit sətri yaranır", async ({
  page,
}) => {
  const target = await prisma.user.findUniqueOrThrow({
    where: { email: MEMBER_EMAIL },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true } },
    },
  });

  const primaryCohortIds = target.memberships.map((membership) => membership.cohortId);

  // Hədəfin ÜZVÜ OLMADIĞI bir sinif — ikinci üzvlük məhz orada qurulur.
  const secondary = await prisma.cohort.findFirstOrThrow({
    where: { id: { notIn: primaryCohortIds } },
    select: { id: true, displayName: true },
  });

  const membership = await prisma.cohortMembership.create({
    data: {
      userId: target.id,
      cohortId: secondary.id,
      role: "MEMBER",
      isPrimary: false,
    },
    select: { id: true },
  });

  const auditBefore = await prisma.auditLog.count({
    where: { action: "ROLE_CHANGE", entityId: membership.id },
  });

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto(`/admin/users?q=${encodeURIComponent(MEMBER_EMAIL)}`);

    // Cədvəldə ikinci üzvlüyün varlığı görünür.
    await expect(page.getByText("+1 digər sinif").first()).toBeVisible();

    await page.getByRole("button", { name: /üçün əməliyyatlar$/ }).first().click();

    // 🔴 HƏR üzvlük üçün AYRICA seçici var — biri deyil, ikisi.
    // ⚠️ T29: `<select>` → `getByRole("combobox")`.
    // ⚠️ Səhifədə filtr seçiciləri də var, ona görə axtarış `<fieldset>` ilə
    // MƏHDUDLAŞIR (`<legend>` → `role="group"`).
    const roleGroup = page.getByRole("group", { name: /^Sinif rolları/ });
    await expect(roleGroup).toBeVisible();
    await expect(roleGroup.getByRole("combobox")).toHaveCount(2);

    // İkinci sinfin seçicisi öz adı ilə etiketlənib (əsas sinif «əsas sinif»
    // qeydi daşıyır, ikincisi daşımır).
    const secondarySelect = roleGroup.getByLabel(secondary.displayName, { exact: true });
    await expect(secondarySelect).toBeVisible();

    await secondarySelect.selectOption("CLASS_MODERATOR");

    // 🔴 T19: nəticə SERVERDƏN gəlir.
    await expect
      .poll(
        async () =>
          (
            await prisma.cohortMembership.findUniqueOrThrow({
              where: { id: membership.id },
              select: { role: true },
            })
          ).role,
        { message: "ikinci kohortun rolu dəyişmədi" },
      )
      .toBe("CLASS_MODERATOR");

    // 🔴 Audit sətri MƏHZ bu üzvlüyə yazılır.
    expect(
      await prisma.auditLog.count({
        where: { action: "ROLE_CHANGE", entityId: membership.id },
      }),
      "ikinci kohort rol dəyişikliyi audit sətri yaratmadı",
    ).toBe(auditBefore + 1);

    // Əsas sinifdəki rol TOXUNULMAZ qalıb — səhv üzvlük dəyişməyib.
    const primaryRoles = await prisma.cohortMembership.findMany({
      where: { userId: target.id, cohortId: { in: primaryCohortIds } },
      select: { role: true },
    });
    expect(primaryRoles.every((row) => row.role === "CLASS_REPRESENTATIVE")).toBe(true);

    // Sistem rolu da dəyişməyib (iki rol qarışdırılmır).
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { systemRole: true },
    });
    expect(after.systemRole).toBe(target.systemRole);
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: membership.id } });
    await prisma.notification.deleteMany({
      where: { recipientId: target.id, title: "Sinif rolunuz dəyişdi" },
    });
    await prisma.cohortMembership.delete({ where: { id: membership.id } });
  }
});

// ---------------------------------------------------------------------------
// 6. CSV import — önizləmə → təsdiq
// ---------------------------------------------------------------------------

test("CSV import: fayl → önizləmə → təsdiq → istifadəçi sayı artır", async ({ page }) => {
  const cohort = await prisma.cohort.findFirstOrThrow({
    where: { programId: { not: null } },
    select: {
      admissionYear: true,
      program: { select: { slug: true, faculty: { select: { slug: true } } } },
    },
  });

  const email = "e2e.import@qu.edu.az";
  const csv = [
    "email,firstName,lastName,facultyCode,programCode,admissionYear",
    `${email},E2E,İmport,${cohort.program!.faculty.slug},${cohort.program!.slug},${cohort.admissionYear}`,
  ].join("\r\n");

  const before = await prisma.user.count();

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/import");

    await page.getByLabel("CSV faylı").setInputFiles({
      name: "sis.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });

    await page.getByRole("button", { name: "Önizləmə" }).click();

    // 🔴 ÖNİZLƏMƏ BAZAYA YAZMIR.
    await expect(page.getByText("Yaradılacaq").first()).toBeVisible();
    expect(await prisma.user.count(), "önizləmə bazaya yazdı").toBe(before);

    await page.getByRole("button", { name: "Təsdiqlə və yaz" }).click();

    await expect
      .poll(async () => prisma.user.count({ where: { email } }), {
        message: "import istifadəçi yaratmadı",
      })
      .toBe(1);
  } finally {
    // ⚠️ Yaradılan istifadəçi SİLİNİR — seed determinizmi.
    await prisma.user.deleteMany({ where: { email } });
    await prisma.auditLog.deleteMany({ where: { entityType: "SisImport" } });
  }
});

test("nümunə CSV şablonu endirilə bilir", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/import");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Nümunə fayl" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain(".csv");
});

// ---------------------------------------------------------------------------
// 6b. CMS «YARAT» (Blok 12B) — əvvəl yalnız redaktə var idi
//
// 🔴 SUALLAR:
//   · yeni səhifə / sual / məkan yaradılırmı?
//   · slug BAŞLIQDAN deterministik qurulurmu?
//   · eyni başlıq İKİNCİ dəfə yaradılanda unikallıq tutulub azərbaycanca
//     mesaj verilirmi (P2002)?
//   · hər yaratma AuditLog (`CREATE`) sətri yazırmı?
//
// ⚠️ Test YAZIR — yaradılan hər sətir `finally`-də SİLİNİR.
// ---------------------------------------------------------------------------

test("CMS: yeni səhifə yaradılır, slug başlıqdan qurulur, təkrar başlıq rədd olunur", async ({
  page,
}) => {
  const title = "E2E müvəqqəti səhifə";
  const expectedSlug = "e2e-muveqqeti-sehife";

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/content");

    await page.getByRole("button", { name: "Yeni səhifə" }).click();

    const form = page.getByRole("form", { name: "Yeni məzmun səhifəsi formu" });
    await form.getByLabel("Başlıq").fill(title);
    await form.getByLabel("Gövdə (Markdown)").fill("E2E gövdəsi.");

    // 🔴 Slug ÖNİZLƏMƏSİ serverin qurduğu ilə eyni funksiyadandır.
    await expect(form.getByText(`/${expectedSlug}`)).toBeVisible();

    await form.getByRole("button", { name: "Yarat" }).click();

    // T19 — nəticə SERVERDƏN gəlir.
    await expect
      .poll(
        async () =>
          prisma.contentPage.count({ where: { slug: expectedSlug } }),
        { message: "səhifə yaradılmadı" },
      )
      .toBe(1);

    const created = await prisma.contentPage.findUniqueOrThrow({
      where: { slug: expectedSlug },
      select: { id: true, isPublished: true },
    });

    // Qaralama defoltdur — «dərhal nəşr» işarələnməyib.
    expect(created.isPublished).toBe(false);

    // 🔴 Hər yaratma AuditLog sətri yazır.
    expect(
      await prisma.auditLog.count({
        where: { action: "CREATE", entityType: "ContentPage", entityId: created.id },
      }),
      "yaratma audit sətri yazmadı",
    ).toBe(1);

    // 🔴 EYNİ başlıq ikinci dəfə → unikallıq tutulur, azərbaycanca mesaj.
    await page.reload();
    await page.getByRole("button", { name: "Yeni səhifə" }).click();
    const second = page.getByRole("form", { name: "Yeni məzmun səhifəsi formu" });
    await second.getByLabel("Başlıq").fill(title);
    await second.getByLabel("Gövdə (Markdown)").fill("Təkrar cəhd.");
    await second.getByRole("button", { name: "Yarat" }).click();

    await expect(page.getByText(/artıq işlədilir/)).toBeVisible();

    // Dublikat YARANMADI.
    expect(await prisma.contentPage.count({ where: { slug: expectedSlug } })).toBe(1);
  } finally {
    const rows = await prisma.contentPage.findMany({
      where: { slug: expectedSlug },
      select: { id: true },
    });
    for (const row of rows) {
      await prisma.auditLog.deleteMany({ where: { entityId: row.id } });
    }
    await prisma.contentPage.deleteMany({ where: { slug: expectedSlug } });
  }
});

test("CMS: yeni FAQ və bələdçi məkanı yaradılır (11 kateqoriya + təcili + koordinat)", async ({
  page,
}) => {
  const question = "E2E müvəqqəti sual?";
  const placeTitle = "E2E müvəqqəti məkan";

  try {
    await login(page, ADMIN_EMAIL);
    await page.goto("/admin/content");

    // --- FAQ ---
    await page.getByRole("button", { name: "Yeni sual" }).click();
    const faqForm = page.getByRole("form", { name: "Yeni FAQ formu" });
    await faqForm.getByLabel("Sual").fill(question);
    await faqForm.getByLabel("Cavab").fill("E2E cavabı.");
    await faqForm.getByLabel("Kateqoriya").selectOption("PLATFORM");
    await faqForm.getByRole("button", { name: "Yarat" }).click();

    await expect
      .poll(async () => prisma.faq.count({ where: { question } }), {
        message: "FAQ yaradılmadı",
      })
      .toBe(1);

    const faq = await prisma.faq.findFirstOrThrow({
      where: { question },
      select: { id: true, category: true },
    });
    expect(faq.category).toBe("PLATFORM");
    expect(
      await prisma.auditLog.count({
        where: { action: "CREATE", entityType: "Faq", entityId: faq.id },
      }),
    ).toBe(1);

    // --- GuidePlace ---
    await page.reload();
    await page.getByRole("button", { name: "Yeni məkan" }).click();
    const placeForm = page.getByRole("form", { name: "Yeni bələdçi məkanı formu" });

    // 11 kateqoriyanın hamısı seçicidədir.
    const categorySelect = placeForm.getByLabel("Kateqoriya");
    expect(await categorySelect.locator("option").count()).toBe(11);

    await categorySelect.selectOption("HEALTH");
    await placeForm.getByLabel("Başlıq").fill(placeTitle);
    await placeForm.getByLabel("Təsvir").fill("E2E təsviri.");
    await placeForm.getByLabel("Enlik (latitude)").fill("39.8154");
    await placeForm.getByLabel("Uzunluq (longitude)").fill("46.7519");
    await placeForm.getByLabel(/Təcili əlaqə məkanıdır/).check();
    await placeForm.getByRole("button", { name: "Yarat" }).click();

    await expect
      .poll(async () => prisma.guidePlace.count({ where: { title: placeTitle } }), {
        message: "məkan yaradılmadı",
      })
      .toBe(1);

    const place = await prisma.guidePlace.findFirstOrThrow({
      where: { title: placeTitle },
      select: {
        id: true,
        category: true,
        isEmergency: true,
        latitude: true,
        longitude: true,
      },
    });

    expect(place.category).toBe("HEALTH");
    expect(place.isEmergency).toBe(true);
    expect(place.latitude).toBeCloseTo(39.8154, 4);
    expect(place.longitude).toBeCloseTo(46.7519, 4);
    expect(
      await prisma.auditLog.count({
        where: { action: "CREATE", entityType: "GuidePlace", entityId: place.id },
      }),
    ).toBe(1);
  } finally {
    const faqs = await prisma.faq.findMany({ where: { question }, select: { id: true } });
    const places = await prisma.guidePlace.findMany({
      where: { title: placeTitle },
      select: { id: true },
    });

    for (const row of [...faqs, ...places]) {
      await prisma.auditLog.deleteMany({ where: { entityId: row.id } });
    }
    await prisma.faq.deleteMany({ where: { question } });
    await prisma.guidePlace.deleteMany({ where: { title: placeTitle } });
  }
});

// ---------------------------------------------------------------------------
// 6c. `/admin/stats` SİNİF FİLTRİ (Blok 12B)
//
// 🔴 SUAL: seçim URL-ə düşür və SERVER yenidən işləyirmi? `shallow: true`
// olsaydı URL dəyişər, rəqəmlər isə köhnə qalardı — səssiz nasazlıq.
// ---------------------------------------------------------------------------

test("analitikada sinif filtri URL-ə yazılır və panel yenidən yüklənir", async ({
  page,
}) => {
  const cohort = await prisma.cohort.findFirstOrThrow({
    orderBy: [{ admissionYear: "desc" }, { displayName: "asc" }],
    select: { id: true, displayName: true },
  });

  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/stats");

  // Defolt: universitet miqyası, URL-də `?cohort=` YOXDUR.
  const select = page.getByLabel("Sinif", { exact: true });
  await expect(select).toHaveValue("");
  expect(new URL(page.url()).searchParams.get("cohort")).toBeNull();

  await select.selectOption(cohort.id);

  // 🔴 URL yazılır (nuqs).
  await expect
    .poll(() => new URL(page.url()).searchParams.get("cohort"))
    .toBe(cohort.id);

  // 🔴 Server yenidən işlədi: xülasə kartının izahı SEÇİLMİŞ sinfin adını
  // daşıyır (universitet miqyasında orada «Bütün universitet» yazılır).
  // ⚠️ Sadəcə `getByText(displayName)` YARAMIR — ad `<option>` içində də var
  // və seçici bağlı olduğu üçün gizli sayılır.
  await expect(
    page.getByText(`${cohort.displayName} · razılıq verən və görünən qeydlər`),
  ).toBeVisible();

  // Paylaşılan link birbaşa açılır və seçim qorunur.
  await page.goto(`/admin/stats?cohort=${cohort.id}`);
  await expect(page.getByLabel("Sinif", { exact: true })).toHaveValue(cohort.id);

  // 🔴 Naməlum id 404 VERMİR — universitet miqyasına düşür.
  const response = await page.goto("/admin/stats?cohort=yoxdur-belə-sinif");
  expect(response?.status()).toBe(200);
  await expect(page.getByLabel("Sinif", { exact: true })).toHaveValue("");
});

// ---------------------------------------------------------------------------
// 7. 🔴 TƏLƏ D — audit jurnalında silmə yolu yoxdur
// ---------------------------------------------------------------------------

test("🔴 /admin/audit-də SİLMƏ / REDAKTƏ düyməsi YOXDUR", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/audit");

  await expect(page.getByRole("heading", { level: 1, name: "Audit jurnalı" })).toBeVisible();

  for (const label of [/sil/i, /təmizlə/i, /redaktə/i, /pozma/i]) {
    await expect(
      page.getByRole("button", { name: label }),
      `«${label}» düyməsi tapıldı`,
    ).toHaveCount(0);
  }

  // Səhifədə heç bir `<form method="post">` yoxdur — yalnız GET filtri.
  const postForms = await page.locator('form[method="post"]').count();
  expect(postForms).toBe(0);
});

test("🔴 audit jurnalının API səthində YAZMA metodu yoxdur", async ({ page }) => {
  await login(page, ADMIN_EMAIL);

  for (const method of ["post", "put", "patch", "delete"] as const) {
    const response = await page.request.fetch("/api/v1/admin/audit", { method });
    // Route handler-də metod ixrac edilmədiyi üçün Next 405 qaytarır.
    expect(response.status(), `${method.toUpperCase()} icazəlidir`).toBe(405);
  }
});

// ---------------------------------------------------------------------------
// 8. Filtrlər və səhifələmə
// ---------------------------------------------------------------------------

test("moderasiya filtrləri URL-dədir və nəticəni dəyişir", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/moderation");

  await page.getByRole("link", { name: /^Rədd edildi/ }).first().click();
  await page.waitForURL(/st=REJECTED/);

  await expect(page.getByRole("heading", { level: 1, name: "Şikayət növbəsi" })).toBeVisible();
});

test("istifadəçi cədvəlində axtarış işləyir və CSV ixrac düyməsi var", async ({ page }) => {
  await login(page, ADMIN_EMAIL);
  await page.goto("/admin/users");

  await page.getByLabel("Ad və ya e-poçt").fill("admin@qu.edu.az");
  await page.getByRole("button", { name: "Filtrlə" }).click();
  await page.waitForURL(/q=/);

  await expect(page.getByText("admin@qu.edu.az").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "CSV ixrac" })).toBeVisible();
});

test("admin panelində QueryClient xətası YOXDUR (T18)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await login(page, ADMIN_EMAIL);

  for (const route of ADMIN_ROUTES) {
    await page.goto(route.path);
  }

  expect(
    errors.filter((text) => text.includes("QueryClient")),
    "admin panelində QueryClient xətası var",
  ).toHaveLength(0);
});
