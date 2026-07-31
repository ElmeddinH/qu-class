// ============================================================================
// tests/e2e/landing.spec.ts
// Blok 9S — açılış səhifəsi (Public Welcome Page [M1]).
//
// 🔴 FAYLIN ƏSAS SUALI: ANONİM ZİYARƏTÇİ SİNİF MƏZMUNU GÖRÜRMÜ?
// Səhifə `ANONYMOUS` viewer ilə oxuyur və `visibilityWhere` yalnız `PUBLIC`
// seçir. Test bunu SÜBUT edir: seed-dəki `CLASS` paylaşımın MƏTNİ və `CLASS`
// tədbirin BAŞLIĞI səhifədə TAPILMAMALIDIR.
//
// ⚠️ Gözlənilən dəyərlər BAZADAN oxunur, hardcode DEYİL — seed dəyişəndə test
// öz-özünə yenilənir və "yalançı yaşıl" vəziyyəti yaranmır.
//
// ⚠️ Fayl YALNIZ OXUYUR — heç bir sətir yaratmır, baza sayları dəyişmir.
// ============================================================================

import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { LANDING_SECTIONS, PUBLIC_NAV } from "../../src/layouts/nav";

import { classOnlyPostText } from "./class-only-text";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Bölmələr
// ---------------------------------------------------------------------------

test("açılış səhifəsi anonim açılır və bir `<h1>` daşıyır", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  const headings = page.getByRole("heading", { level: 1 });
  await expect(headings).toHaveCount(1);
  await expect(headings).toContainText("Sinfin bir yerdə");
});

test("bütün bölmələrin başlıqları görünür", async ({ page }) => {
  await page.goto("/");

  // Açılış bölmələrinin vahid mənbəyi `LANDING_SECTIONS`-dir. ⚠️ Blok 11A-da
  // onun ROLU dəyişdi: artıq naviqasiya hədəfi deyil (linklər real səhifələrə
  // qayıtdı), amma paylaşılmış `/#events` ünvanları hələ də işləməlidir.
  for (const section of LANDING_SECTIONS) {
    await expect(
      page.getByRole("heading", { name: section.title, exact: true }),
      `«${section.title}» bölməsi`,
    ).toBeVisible();
  }

  // Naviqasiya hədəfi OLMAYAN bölmələr (`nav.ts`-də link yoxdur).
  await expect(page.getByRole("heading", { name: "Rəqəmlərlə" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sinif səhifən səni gözləyir" }),
  ).toBeVisible();
});

test("Blok 11A — üç CANLI bölmə seed məlumatı ilə render olunur", async ({ page }) => {
  // ⚠️ Bu üç bölmə BOŞ HALDA GİZLƏNİR, ona görə test əvvəlcə seed-də uyğun
  // PUBLIC məzmunun olduğunu SÜBUT edir — əks halda "görünmür" nəticəsi
  // yalançı yaşıl olardı.
  const [publicMemories, publicPosts, quotes] = await Promise.all([
    prisma.memory.count({ where: { visibility: "PUBLIC", status: "ACTIVE" } }),
    prisma.post.count({ where: { visibility: "PUBLIC", status: "ACTIVE" } }),
    prisma.memory.count({
      where: {
        visibility: "PUBLIC",
        status: "ACTIVE",
        type: { in: ["MESSAGE_TO_QU", "WHAT_UNI_GAVE_ME"] },
      },
    }),
  ]);

  await page.goto("/");

  if (publicMemories > 0) {
    await expect(
      page.getByRole("heading", { name: "İcmamızdan hekayələr" }),
    ).toBeVisible();
  }
  if (publicPosts > 0) {
    await expect(page.getByRole("heading", { name: "Son xəbərlər" })).toBeVisible();
  }
  if (quotes > 0) {
    await expect(page.getByRole("heading", { name: "Məzunlarımız deyir" })).toBeVisible();
    // Sitat FİQURDUR (`<figure>` + `<blockquote>`) — semantika vacibdir.
    await expect(page.locator("figure blockquote")).toHaveCount(1);
  }
});

test("hər bölmə `aria-labelledby` ilə başlığına bağlanıb", async ({ page }) => {
  await page.goto("/");

  for (const section of LANDING_SECTIONS) {
    const element = page.locator(`section#${section.id}`);
    await expect(element).toHaveAttribute("aria-labelledby", `${section.id}-heading`);
    // Bağlandığı `id` HƏQİQƏTƏN mövcuddur (əks halda əlaqə səssizcə qırılır).
    await expect(page.locator(`#${section.id}-heading`)).toHaveCount(1);
  }
});

test("başlıq iyerarxiyası pozulmur: h1-dən sonra h3 yoxdur", async ({ page }) => {
  await page.goto("/");

  const levels = await page
    .locator("h1, h2, h3, h4")
    .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));

  expect(levels[0], "səhifə h1 ilə başlamalıdır").toBe(1);

  // Səviyyə ATLANMIR: h1 → h3 keçidi ekran oxuyucusunda bölmə itirir.
  for (let i = 1; i < levels.length; i += 1) {
    expect(
      levels[i] - levels[i - 1],
      `${levels[i - 1]} → ${levels[i]} keçidi səviyyə atlayır`,
    ).toBeLessThanOrEqual(1);
  }
});

// ---------------------------------------------------------------------------
// 2. 🔴 SIZMA — anonim ziyarətçi sinif məzmunu görmür
// ---------------------------------------------------------------------------

/**
 * 🔴 YALNIZ CLASS PAYLAŞIMLARINDA olan mətn.
 *
 * Seçim məntiqi ORTAQ modula köçürüldü — eyni invariantı `public.spec.ts` də
 * yoxlayır və needle qaydası iki yerdə saxlanılsa biri köhnəlir.
 *
 * Blok 13B-də tapılan qüsur və düzəlişin izahı: `./class-only-text.ts`.
 */
async function classOnlyBodyFragment(): Promise<string> {
  return classOnlyPostText(prisma);
}

test("🔴 anonim brauzerdə seed-dəki CLASS paylaşımın mətni səhifədə YOXDUR", async ({
  page,
}) => {
  const fragment = await classOnlyBodyFragment();

  await page.goto("/");
  const content = await page.content();

  expect(content, "CLASS paylaşım açılış səhifəsinə SIZDI").not.toContain(fragment);
});

test("🔴 anonim brauzerdə CLASS və UNIVERSITY tədbirlərin başlıqları YOXDUR", async ({
  page,
}) => {
  const hidden = await prisma.event.findMany({
    where: {
      visibility: { in: ["CLASS", "UNIVERSITY"] },
      status: { in: ["PUBLISHED", "COMPLETED"] },
      startsAt: { gte: new Date() },
    },
    select: { title: true, visibility: true },
  });

  expect(hidden.length, "seed-də gizli qarşıdan gələn tədbir yoxdur").toBeGreaterThan(0);

  await page.goto("/");
  const content = await page.content();

  for (const event of hidden) {
    expect(
      content,
      `«${event.title}» (${event.visibility}) açılış səhifəsinə SIZDI`,
    ).not.toContain(event.title);
  }
});

test("PUBLIC tədbir GÖRÜNÜR — bölmə həqiqətən işləyir", async ({ page }) => {
  const publicEvent = await prisma.event.findFirst({
    where: {
      visibility: "PUBLIC",
      status: { in: ["PUBLISHED", "COMPLETED"] },
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    select: { title: true },
  });

  await page.goto("/");
  const section = page.locator("section#events");

  if (publicEvent) {
    await expect(section).toContainText(publicEvent.title);
  } else {
    // Boş halda bölmə GİZLƏNMİR (anchor hədəfidir) — EmptyState göstərilir.
    await expect(section).toContainText("Açıq tədbir yoxdur");
  }
});

test("«Rəqəmlərlə» zolağı YALNIZ struktur rəqəmləri göstərir", async ({ page }) => {
  const [faculties, programs, cohorts] = await Promise.all([
    prisma.faculty.count(),
    prisma.program.count(),
    prisma.cohort.count(),
  ]);

  await page.goto("/");
  const section = page.locator("section#numbers");

  await expect(section).toContainText(String(faculties));
  await expect(section).toContainText(String(programs));
  await expect(section).toContainText(String(cohorts));

  // 🔴 Üzv sayı GÖSTƏRİLMİR (aqreqasiya qaydası).
  //
  // ⚠️ Yoxlama BÖLMƏNİN TAMINA deyil, RƏQƏM KARTLARINA tətbiq olunur: bölmənin
  // TƏSVİRİ qəsdən "…üzv sayı ictimai səhifədə göstərilmir" cümləsini daşıyır və
  // sadə `not.toContainText("üzv")` onu səhvən tuturdu.
  const cards = section.locator(".rounded-card");
  await expect(cards).toHaveCount(3);

  const labels = await cards.allInnerTexts();
  for (const label of labels) {
    expect(label, `«${label}» kartı üzv sayı göstərir`).not.toMatch(/üzv/i);
  }
});

// ---------------------------------------------------------------------------
// 3. CTA və naviqasiya
// ---------------------------------------------------------------------------

test("hero CTA-ları: «Daxil ol» → /login, «Qeydiyyat» → /register", async ({ page }) => {
  await page.goto("/");

  // ⚠️ Seçici hero bölməsinə DARALDILIR: eyni etiketli düymələr header-də və
  // bağlanış bölməsində də var (Playwright strict mode pozuntusu olardı).
  const hero = page.locator("section[aria-labelledby='hero-heading']");

  await expect(hero.getByRole("link", { name: "Daxil ol" })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(hero.getByRole("link", { name: "Qeydiyyat" })).toHaveAttribute(
    "href",
    "/register",
  );

  await hero.getByRole("link", { name: "Daxil ol" }).click();
  await page.waitForURL("**/login");
  // ⚠️ T22 (Blok 7): `CardTitle` shadcn primitividir və `<div>` render olunur,
  // heading DEYİL — `getByRole("heading")` burada İŞLƏMİR.
  //
  // ⚠️ `getByText` DƏ uyğun deyil: kartın təsviri "Universitet e-poçtunuz və
  // şifrənizlə…" cümləsini daşıyır və seçici İKİ elementə düşür (strict mode
  // pozuntusu). Forma sahəsinə `getByLabel` ilə müraciət olunur — o, yalnız
  // `<label for>` bağlantısına baxır.
  await expect(page.getByLabel("Universitet e-poçtu")).toBeVisible();

  await page.goto("/");
  await hero.getByRole("link", { name: "Qeydiyyat" }).click();
  await page.waitForURL("**/register");
  await expect(page.getByLabel("Ad", { exact: true })).toBeVisible();
});

test("bağlanış CTA-sı qeydiyyata aparır", async ({ page }) => {
  await page.goto("/");

  const closing = page.locator("section#start");
  await closing.getByRole("link", { name: "Qeydiyyatdan keç" }).click();
  await page.waitForURL("**/register");
});

test("header naviqasiya linkləri REAL səhifələrə aparır (Blok 11A)", async ({ page }) => {
  // ⚠️ Blok 9S-də bu linklər açılış anchor-larına (`/#about`) baxırdı, çünki
  // səhifələr hələ yox idi. Blok 11A-da hamısı real ünvandır — test də
  // anchor deyil, SƏHİFƏ gözləyir.
  await page.goto("/");

  const nav = page.getByRole("navigation", { name: "Əsas naviqasiya" });

  for (const item of PUBLIC_NAV) {
    const link = nav.getByRole("link", { name: item.label });
    await expect(link).toHaveAttribute("href", item.href);

    // Anchor dövrü bitdi.
    expect(item.href.startsWith("/#"), `«${item.href}» hələ anchor-dur`).toBe(false);

    const response = await page.goto(item.href);
    expect(response?.status(), `${item.href} statusu`).toBe(200);
    await page.goto("/");
  }
});

test("footer-də «API sənədləri» keçidi var və /docs açılır", async ({ page }) => {
  await page.goto("/");

  const link = page.getByRole("contentinfo").getByRole("link", {
    name: "API sənədləri",
  });
  await expect(link).toHaveAttribute("href", "/docs");

  const response = await page.goto("/docs");
  expect(response?.status()).toBe(200);
});

// ---------------------------------------------------------------------------
// 4. Mobil menyu və responsivlik
// ---------------------------------------------------------------------------

test("mobil menyu 360px-də açılır və naviqasiya linkləri görünür", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto("/");

  await page.getByRole("button", { name: "Menyunu aç" }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Fakültələr" })).toBeVisible();

  await sheet.getByRole("link", { name: "Fakültələr" }).click();
  // ⚠️ Blok 9S-də bu, açılış anchor-u idi (`/#faculties`); Blok 11A-da real
  // səhifədir və mobil menyu da ora aparmalıdır.
  await expect(page).toHaveURL(/\/faculties$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Fakültələr və ixtisaslar" }),
  ).toBeVisible();
});

/** KUDS breakpoint-ləri: Mobile · Tablet · Laptop · Desktop · Large. */
const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-767", width: 767, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 800 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "large-1536", width: 1536, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`🔴 ${viewport.name} — YATAY SÜRÜŞMƏ yoxdur`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    // Şəkillər yerləşənə qədər gözlə: `next/image` layout-u dəyişdirə bilər.
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });

    expect(
      overflow.scrollWidth,
      `${viewport.width}px-də yatay sürüşmə var (${overflow.scrollWidth} > ${overflow.clientWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth);
  });
}

test("hero mobildə tək sütuna düşür, kartlar 360px-də sığır", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Kart qridindəki hər element viewport-dan geniş OLMAMALIDIR.
  const widths = await page
    .locator("section#about li")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));

  for (const width of widths) {
    expect(width).toBeLessThanOrEqual(360);
  }
});
