// ============================================================================
// tests/e2e/responsive.spec.ts
// Blok 12D — RESPONSİVLİK MATRİSİ: 51 səhifə × 5 breakpoint (KUDS §9).
//
// 🔴 FAYLIN SUALI: «bütün səhifələrdə responsive işləyir» iddiası MAŞINLA
// təsdiqlənə bilirmi?
//
// 🔴 NİYƏ TEST, EKRAN GÖRÜNTÜSÜ DEYİL. `scripts/responsive-shots.ts` 255 PNG
// çəkir və insan onlara baxıb «yaxşıdır» deyir. Bu, TƏKRARLANA BİLMƏYƏN
// sübutdur: növbəti dəyişiklik nəyisə sındırsa heç nə xəbərdarlıq etmir və
// heç kim 255 şəkli yenidən nəzərdən keçirmir. Görüntülər İKİNCİ dərəcəli
// sənəddir (`docs/responsive/report.md`), QAPI isə bu fayldır.
//
// Hər (səhifə × breakpoint) cütü üçün DÖRD ölçü:
//   1. ÜFÜQİ SÜRÜŞMƏ YOXDUR — `scrollWidth - clientWidth <= 1`.
//      Mexanizm `public.spec.ts`-dəki 360px testindən götürülüb (yenisi
//      uydurulmayıb); 1px tolerantlıq sub-piksel yuvarlaqlaşma üçündür.
//   2. HEADER 72px — KUDS §8 sabit karkası (`tailwind.config.ts` → `header`).
//   3. SIDEBAR DAVRANIŞI — <1024px gizli + çəkməcə düyməsi görünür,
//      ≥1024px 280px enində görünən. 1024 rəqəmi TƏSADÜFİ DEYİL:
//      `tailwind.config.ts` → `screens.md = 1024px` və karkas `md:flex`
//      işlədir (KUDS §9 breakpoint cədvəli).
//   4. MƏZMUN KƏSİLMİR — `#main` landmark-ının `clientWidth > 0` və sağ
//      kənarı viewport-dan kənara çıxmır.
//
// ⚠️ VAXT BÜDCƏSİ. 51 × 5 = 255 yoxlama, dəst `workers: 1` ilə işləyir. Ona
// görə səhifəyə BİR DƏFƏ naviqasiya edilir və viewport `setViewportSize` ilə
// beş dəfə dəyişdirilir. Hər kombinasiya üçün ayrıca `goto` ~4× baha olardı.
//
// ⚠️ TƏLƏ D: dinamik yolların slug/id-si SEED-DƏN oxunur. Hardcode edilsəydi
// seed dəyişəndə səhifə səssizcə 404-ə düşər və «sürüşmə yoxdur» şərti
// 404 ekranında ödənib test YAŞIL görünərdi. Ona görə status da yoxlanılır.
//
// ⚠️ TƏLƏ E: hər hesab üçün BİR dəfə giriş edilir (iki kontekst: üzv və
// admin), sonra bütün səhifələr həmin sessiyada gəzilir.
//
// ⚠️ Fayl YALNIZ OXUYUR — heç bir sətir yaratmır/dəyişmir.
// ============================================================================

import { readdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { settleHeadings } from "./settle";

const prisma = new PrismaClient();

/**
 * ⚠️ Playwright-in default 30 s həddi BURADA DAR GƏLİR, çünki bir test 12–20
 * səhifəni beş breakpoint-də gəzir. Yerli maşında ən uzun test ~23 s çəkir —
 * yəni default hədd SƏRHƏDDƏDİR və CI-da təsadüfi qırılardı.
 *
 * 🔴 Bu, zəiflədilmiş ŞƏRT deyil: heç bir `expect` yumşalmır, yalnız dəstin
 * bir testə ayırdığı ümumi vaxt genişlənir. Uzunluğun səbəbi ölçmələr yox,
 * SAYDIR (255 yoxlama, `workers: 1`).
 */
test.describe.configure({ timeout: 120_000 });

const SEED_PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@qu.edu.az";
const MEMBER_EMAIL = "rep@qu.edu.az";

/** KUDS §9 — beş breakpoint. Hündürlük yalnız ilk ekran üçündür. */
const BREAKPOINTS = [
  { width: 375, height: 812, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "laptop" },
  { width: 1280, height: 800, label: "desktop" },
  { width: 1536, height: 864, label: "large" },
] as const;

/** `tailwind.config.ts` → `spacing.sidebar` / `spacing.header` (KUDS §8). */
const SIDEBAR_WIDTH = 280;
const HEADER_HEIGHT = 72;

/** `tailwind.config.ts` → `screens.md` — sidebar məhz burada açılır. */
const SIDEBAR_BREAKPOINT = 1024;

/**
 * Karkas növü — yoxlanacaq naviqasiya davranışını təyin edir.
 *
 * `public`  → `layouts/PublicShell` (sidebar YOX, header + `PublicNav`)
 * `dashboard` → `layouts/DashboardShell` (`AppShell` / `AdminShell`)
 */
type Shell = "public" | "dashboard";

interface PageSpec {
  path: string;
  shell: Shell;
  /** Hansı sessiyada açılır. */
  session: "anonymous" | "member" | "admin";
  /**
   * Səhifə yönləndirir — ölçülən səth HƏDƏF səhifəsidir.
   * ⚠️ Bu, ölçünün zəif yeridir və hesabatda açıq yazılıb: seed-də üzvlüyü
   * olmayan istifadəçi yoxdur, ona görə `/home`-un «sinif təyin olunmayıb»
   * ekranı e2e-də açıla bilmir.
   */
  redirects?: boolean;
}

// ---------------------------------------------------------------------------
// Səhifə siyahısı — `src/app` altındakı 51 `page.tsx` faylının BİRE-BİR qarşılığı
// ---------------------------------------------------------------------------

let specs: PageSpec[] = [];

test.beforeAll(async () => {
  const [faculty, place, event, member] = await Promise.all([
    prisma.faculty.findFirstOrThrow({ select: { slug: true } }),
    prisma.guidePlace.findFirstOrThrow({ select: { id: true } }),
    prisma.event.findFirstOrThrow({ select: { id: true } }),
    prisma.user.findUniqueOrThrow({
      where: { email: MEMBER_EMAIL },
      select: {
        id: true,
        memberships: {
          where: { isPrimary: true },
          select: { cohort: { select: { slug: true } } },
        },
      },
    }),
  ]);

  const slug = member.memberships[0].cohort.slug;
  const cls = (suffix = "") => `/class/${slug}${suffix}`;

  specs = [
    // --- (public) · 19 səhifə ---
    { path: "/", shell: "public", session: "anonymous" },
    { path: "/about", shell: "public", session: "anonymous" },
    { path: "/accessibility", shell: "public", session: "anonymous" },
    { path: "/campus-life", shell: "public", session: "anonymous" },
    { path: "/clubs", shell: "public", session: "anonymous" },
    { path: "/docs", shell: "public", session: "anonymous" },
    { path: "/events", shell: "public", session: "anonymous" },
    { path: "/faculties", shell: "public", session: "anonymous" },
    { path: `/faculties/${faculty.slug}`, shell: "public", session: "anonymous" },
    { path: "/faq", shell: "public", session: "anonymous" },
    { path: "/history", shell: "public", session: "anonymous" },
    { path: "/khankendi", shell: "public", session: "anonymous" },
    { path: `/khankendi/${place.id}`, shell: "public", session: "anonymous" },
    // Dörd hüquqi sənəd EYNİ `page.tsx`-dən gəlir — matrisdə bir sətir kimi
    // sayılır. Dördünün DƏ 200 verdiyi `public.spec.ts`-də ölçülür.
    { path: "/legal/privacy", shell: "public", session: "anonymous" },
    { path: "/login", shell: "public", session: "anonymous" },
    { path: "/mission", shell: "public", session: "anonymous" },
    { path: "/newcomers", shell: "public", session: "anonymous" },
    { path: "/register", shell: "public", session: "anonymous" },
    { path: "/services", shell: "public", session: "anonymous" },

    // --- (app) · 23 səhifə ---
    { path: cls(), shell: "dashboard", session: "member" },
    { path: cls("/achievements"), shell: "dashboard", session: "member" },
    // Moderasiya növbəsi CLASS_MODERATOR tələb edir; admin universitet
    // miqyaslı istisnadır (`requireCohortRole`).
    { path: cls("/achievements/moderation"), shell: "dashboard", session: "admin" },
    { path: cls("/directory"), shell: "dashboard", session: "member" },
    { path: cls("/events"), shell: "dashboard", session: "member" },
    { path: cls("/feed"), shell: "dashboard", session: "member" },
    { path: cls("/map"), shell: "dashboard", session: "member" },
    { path: cls("/memories"), shell: "dashboard", session: "member" },
    { path: cls("/support"), shell: "dashboard", session: "member" },
    { path: cls("/timeline"), shell: "dashboard", session: "member" },
    { path: cls("/yearbook"), shell: "dashboard", session: "member" },
    { path: `/events/${event.id}`, shell: "dashboard", session: "member" },
    // Koordinator paneli və hesabat `viewerCanManage` tələb edir —
    // `UNIVERSITY_ADMIN` bütün tədbirlərdə keçir (`canManageEvent`).
    { path: `/events/${event.id}/manage`, shell: "dashboard", session: "admin" },
    { path: `/events/${event.id}/report`, shell: "dashboard", session: "admin" },
    { path: "/home", shell: "dashboard", session: "member", redirects: true },
    { path: "/kuds", shell: "dashboard", session: "member" },
    { path: "/me", shell: "dashboard", session: "member", redirects: true },
    { path: "/me/career", shell: "dashboard", session: "member" },
    { path: "/me/edit", shell: "dashboard", session: "member" },
    { path: "/me/privacy", shell: "dashboard", session: "member" },
    { path: "/notifications", shell: "dashboard", session: "member" },
    { path: "/search", shell: "dashboard", session: "member" },
    { path: `/u/${member.id}`, shell: "dashboard", session: "member" },

    // --- (admin) · 9 səhifə ---
    { path: "/admin", shell: "dashboard", session: "admin" },
    { path: "/admin/achievements", shell: "dashboard", session: "admin" },
    { path: "/admin/audit", shell: "dashboard", session: "admin" },
    { path: "/admin/cohorts", shell: "dashboard", session: "admin" },
    { path: "/admin/content", shell: "dashboard", session: "admin" },
    { path: "/admin/import", shell: "dashboard", session: "admin" },
    { path: "/admin/moderation", shell: "dashboard", session: "admin" },
    { path: "/admin/stats", shell: "dashboard", session: "admin" },
    { path: "/admin/users", shell: "dashboard", session: "admin" },
  ];
});

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
// Ölçmə
// ---------------------------------------------------------------------------

/**
 * Bir səhifəni beş breakpoint-də yoxlayır.
 *
 * 🔴 `settleHeadings` NAVİQASİYADAN SONRA BİR DƏFƏ. Blok 12D-də `<Suspense>`
 * sərhədləri artdı: `goto()` qayıdanda ekranda hələ SKELETON ola bilər və
 * skeleton həmişə sürüşmür — real məzmun sürüşür. Skeleton ölçmək testi
 * yaşıl, məhsulu isə sınıq saxlayardı. Axın bir dəfə bitir, ona görə şərt
 * viewport dəyişikliyində TƏKRARLANMIR (255 dəfə gözləmək vaxt büdcəsini
 * yeyərdi) — orada `clientWidth` şərti kifayətdir.
 */
async function measureAllBreakpoints(page: Page, spec: PageSpec) {
  const response = await page.goto(spec.path);

  // ⚠️ TƏLƏ D: slug seed-dən gəlir, amma yenə də təsdiqlənir — 404 ekranında
  // sürüşmə olmadığı üçün qalan şərtlər ödənib test yaşıl görünərdi.
  expect(response?.status(), `${spec.path}: gözlənilməyən status`).toBe(200);

  if (spec.redirects) {
    expect(
      page.url(),
      `${spec.path}: yönləndirmə işləmədi`,
    ).not.toContain(spec.path);
  }

  await settleHeadings(page);

  for (const bp of BREAKPOINTS) {
    await page.setViewportSize({ width: bp.width, height: bp.height });

    // Viewport dəyişikliyi tətbiq olunana qədər gözlə — `setViewportSize`
    // qaytarandan sonra layout hələ köhnə enliklə ölçülə bilər.
    await page.waitForFunction(
      (width) => document.documentElement.clientWidth === width,
      bp.width,
    );

    const where = `${spec.path} @ ${bp.width}px (${bp.label})`;

    // --- 1. Üfüqi sürüşmə ---
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${where}: yatay sürüşmə (${overflow}px)`).toBeLessThanOrEqual(1);

    // --- 2. Header hündürlüyü (KUDS §8) ---
    // `header.h-header` — karkasın ÖZ header-i. `<main>` daxilindəki səhifə
    // başlıqları da `<header>` teqidir, ona görə rol yox, token sinfi ilə
    // seçilir (vahid mənbə: `tailwind.config.ts` → `spacing.header`).
    const shellHeader = page.locator("header.h-header").first();
    const headerBox = await shellHeader.boundingBox();
    expect(headerBox, `${where}: karkas header-i tapılmadı`).not.toBeNull();
    expect(Math.round(headerBox!.height), `${where}: header hündürlüyü`).toBe(
      HEADER_HEIGHT,
    );

    // --- 3. Sidebar / çəkməcə davranışı ---
    const wide = bp.width >= SIDEBAR_BREAKPOINT;

    if (spec.shell === "dashboard") {
      const sidebar = page.locator("aside.w-sidebar").first();

      if (wide) {
        await expect(sidebar, `${where}: sidebar görünmür`).toBeVisible();
        const box = await sidebar.boundingBox();
        expect(Math.round(box!.width), `${where}: sidebar eni`).toBe(SIDEBAR_WIDTH);
      } else {
        await expect(sidebar, `${where}: sidebar gizlənməyib`).toBeHidden();
        await expect(
          page.getByRole("button", { name: "Naviqasiyanı aç" }),
          `${where}: çəkməcə düyməsi yoxdur`,
        ).toBeVisible();
      }
    } else {
      // İctimai karkasda sidebar YOXDUR — eyni sərhəd naviqasiyaya aiddir.
      const drawerTrigger = page.getByRole("button", { name: "Menyunu aç" });

      if (wide) {
        await expect(drawerTrigger, `${where}: çəkməcə düyməsi gizlənməyib`).toBeHidden();
        await expect(
          page.getByRole("navigation", { name: "Əsas naviqasiya" }),
          `${where}: masaüstü naviqasiya görünmür`,
        ).toBeVisible();
      } else {
        await expect(drawerTrigger, `${where}: çəkməcə düyməsi yoxdur`).toBeVisible();
      }
    }

    // --- 4. Məzmun kəsilmir ---
    const main = await page.locator("#main").evaluate((node) => ({
      clientWidth: node.clientWidth,
      right: Math.round(node.getBoundingClientRect().right),
    }));

    expect(main.clientWidth, `${where}: əsas landmark sıfır enlidir`).toBeGreaterThan(0);
    expect(main.right, `${where}: əsas landmark viewport-dan çıxır`).toBeLessThanOrEqual(
      bp.width + 1,
    );
  }
}

// ---------------------------------------------------------------------------
// 1. İctimai səth (anonim)
// ---------------------------------------------------------------------------

test("ictimai səhifələr beş breakpoint-də sürüşmür", async ({ browser }) => {
  // 🔴 TƏLƏ T16: anonim yoxlama üçün TƏMİZ kontekst.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const spec of specs.filter((entry) => entry.session === "anonymous")) {
      await measureAllBreakpoints(page, spec);
    }
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 2. Üzv səthi — bir dəfə giriş, 20 səhifə (TƏLƏ E)
// ---------------------------------------------------------------------------

test("üzv səhifələri beş breakpoint-də sürüşmür", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, MEMBER_EMAIL);

    for (const spec of specs.filter((entry) => entry.session === "member")) {
      await measureAllBreakpoints(page, spec);
    }
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 3. Admin səthi — bir dəfə giriş, 12 səhifə
// ---------------------------------------------------------------------------

test("admin səhifələri beş breakpoint-də sürüşmür", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, ADMIN_EMAIL);

    for (const spec of specs.filter((entry) => entry.session === "admin")) {
      await measureAllBreakpoints(page, spec);
    }
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 4. Matrisin TAMLIĞI — siyahı `src/app`-dan geri qalmasın
// ---------------------------------------------------------------------------

/** `src/app` altındakı bütün `page.tsx` fayllarını sayır (route qrupları daxil). */
function countPageFiles(dir: string): number {
  let total = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += countPageFiles(path.join(dir, entry.name));
    } else if (entry.name === "page.tsx") {
      total += 1;
    }
  }

  return total;
}

test("matris `src/app` altındakı BÜTÜN səhifələri əhatə edir", async () => {
  // 🔴 NİYƏ AYRICA TEST VƏ NİYƏ SABİT RƏQƏM YOX. Yeni `page.tsx` əlavə
  // olunanda yuxarıdakı üç test yenə YAŞIL qalır — sadəcə yeni səhifəni
  // ölçmür. Sprint meyarı «BÜTÜN səhifələr» deyir, «siyahıdakılar» yox, ona
  // görə say FAYL SİSTEMİNDƏN oxunur: siyahı geri qalanda test qırılır.
  const pageFiles = countPageFiles(path.resolve(__dirname, "../../src/app"));

  expect(
    specs,
    `src/app-da ${pageFiles} səhifə var, matrisdə ${specs.length}`,
  ).toHaveLength(pageFiles);

  const unique = new Set(specs.map((entry) => entry.path));
  expect(unique.size, "matrisdə təkrarlanan yol var").toBe(specs.length);
});
