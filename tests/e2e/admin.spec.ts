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
