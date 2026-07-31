// ============================================================================
// tests/e2e/headings.spec.ts
// Blok 12B · T22 — BAŞLIQ İYERARXİYASI (WCAG 1.3.1, 2.4.6).
//
// 🔴 FAYLIN SUALI: hər səhifədə DƏQİQ BİR birinci səviyyə başlıq varmı və
// səviyyələr ATLANIRMI (h1 → h3 kimi sıçrayış)?
//
// ⚠️ Bu, T22-nin ölçüsüdür. shadcn `CardTitle` `<div>` render edir — kart
// başlığı sənəd iyerarxiyasına düşmür. Düzəliş `components/kuds/SectionCard.tsx`
// (`CardHeading` → `role="heading" aria-level`) ilə verilir, ona görə yoxlama
// TEQ adına deyil, ACCESSIBILITY rolu + səviyyəyə baxır: `[role="heading"]`
// `<h2>` ilə eyni sayılmalıdır.
//
// ⚠️ Gizli başlıqlar SAYILIR (`sr-only` — ekran oxuyucu onları oxuyur), amma
// `aria-hidden` və `display:none` olanlar sayılmır: birincisi a11y ağacındadır,
// ikincisi deyil.
//
// ⚠️ Fayl YALNIZ OXUYUR — heç bir sətir yaratmır/dəyişmir.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { PUBLIC_PAGE_PATHS } from "../../src/lib/routes";

import { settleHeadings } from "./settle";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@qu.edu.az";
const MEMBER_EMAIL = "rep@qu.edu.az";

let cohortSlug: string;
let memberId: string;

interface HeadingInfo {
  level: number;
  text: string;
}

test.beforeAll(async () => {
  const member = await prisma.user.findUniqueOrThrow({
    where: { email: MEMBER_EMAIL },
    select: {
      id: true,
      memberships: {
        where: { isPrimary: true },
        select: { cohort: { select: { slug: true } } },
      },
    },
  });

  memberId = member.id;
  cohortSlug = member.memberships[0].cohort.slug;
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

/** Təmiz (kukisiz) kontekst — TƏLƏ T16. */
async function anonymousPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

/**
 * Səhifədəki bütün başlıqları SƏNƏD SIRASI ilə oxuyur.
 *
 * `<h1>`–`<h6>` və `[role="heading"]` eyni selektorda toplanır ki, sıra
 * qarışmasın — `querySelectorAll` çoxlu selektoru sənəd sırasında qaytarır.
 */
async function readHeadings(page: Page, scope: "document" | "main"): Promise<HeadingInfo[]> {
  return page.evaluate((rootSelector) => {
    const root = rootSelector === "main" ? document.querySelector("main") : document;
    if (!root) return [];

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(
        'h1, h2, h3, h4, h5, h6, [role="heading"]',
      ),
    );

    return nodes
      .filter((node) => {
        if (node.closest("[aria-hidden='true']")) return false;
        const style = window.getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((node) => {
        const ariaLevel = node.getAttribute("aria-level");
        const tagLevel = /^H([1-6])$/.exec(node.tagName)?.[1];

        return {
          level: Number(ariaLevel ?? tagLevel ?? "0"),
          text: (node.textContent ?? "").trim().slice(0, 60),
        };
      })
      .filter((heading) => heading.level > 0);
  }, scope);
}

/** Səviyyə atlanmasını mətnli mesajla qaytarır (boşdursa pozuntu yoxdur). */
function findLevelJump(headings: HeadingInfo[]): string | null {
  let previous = 0;

  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) {
      return `h${previous} → h${heading.level} («${heading.text}»)`;
    }
    previous = heading.level;
  }

  return null;
}

/**
 * ⚠️ Sənəd sırası ilə İLK başlıq həmişə `<h1>` DEYİL: `AppShell`/`AdminShell`
 * sidebar-ı naviqasiya qruplarını `<h2>` ilə etiketləyir və o, DOM-da
 * `<main>`-dən ƏVVƏLdir. Bu, WCAG pozuntusu deyil (nav ayrı landmark-dır) və
 * səviyyə ATLANMASI da yaratmır — h2-dən h1-ə enmək sıçrayış sayılmır.
 * Ona görə "ilk başlıq h1-dir" şərti `<main>` daxilində ölçülür.
 */
async function assertHierarchy(page: Page, path: string) {
  // 🔴 SUSPENSE AXINI GÖZLƏNİLİR — Blok 13B-də tutulan FLAKE.
  // `page.goto()` `load` hadisəsində qayıdır, amma stream olunan widget-lərin
  // başlıqları hələ gəlməmiş ola bilir; həmin anda `readHeadings` BOŞ massiv
  // qaytarır və test «heç bir başlıq tapılmadı» deyib qırılır. İzah və niyə
  // «skeleton sayı = 0» şərtinin işləmədiyi: `./settle.ts`.
  await settleHeadings(page);

  const headings = await readHeadings(page, "document");

  expect(headings.length, `${path}: heç bir başlıq tapılmadı`).toBeGreaterThan(0);

  const firstLevels = headings.filter((heading) => heading.level === 1);
  expect(
    firstLevels.length,
    `${path}: birinci səviyyə başlıq sayı 1 olmalıdır, tapıldı ${firstLevels.length} — ${firstLevels
      .map((heading) => heading.text)
      .join(" | ")}`,
  ).toBe(1);

  const mainHeadings = await readHeadings(page, "main");
  expect(mainHeadings.length, `${path}: <main> daxilində başlıq yoxdur`).toBeGreaterThan(0);
  expect(
    mainHeadings[0].level,
    `${path}: <main>-in İLK başlığı h${mainHeadings[0].level}-dir («${mainHeadings[0].text}»)`,
  ).toBe(1);

  const jump = findLevelJump(headings);
  expect(jump, `${path}: başlıq səviyyəsi atlanıb — ${jump}`).toBeNull();

  const mainJump = findLevelJump(mainHeadings);
  expect(mainJump, `${path}: <main> daxilində səviyyə atlanıb — ${mainJump}`).toBeNull();
}

// ---------------------------------------------------------------------------
// 1. İctimai səhifələr (anonim)
// ---------------------------------------------------------------------------

test("ictimai səhifələrdə başlıq iyerarxiyası pozulmur", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    const faculty = await prisma.faculty.findFirstOrThrow({ select: { slug: true } });
    const place = await prisma.guidePlace.findFirstOrThrow({ select: { id: true } });

    const paths = [
      ...PUBLIC_PAGE_PATHS,
      `/faculties/${faculty.slug}`,
      `/khankendi/${place.id}`,
      "/login",
      "/register",
    ];

    for (const path of paths) {
      // 🔴 `/docs` KƏNARDADIR — `public.spec.ts`-dəki eyni istisna ilə üzbəüz.
      //
      // Səhifə Swagger UI-dir: bizim `<h1>API sənədləri</h1>`-dən sonra
      // kitabxana hidrasiya zamanı ÖZ `<h1>`-ini (`QU CLASS API 0.1.0 OAS 3.0`)
      // əlavə edir, yəni sənəddə iki birinci səviyyə başlıq olur. İyerarxiya
      // `swagger-ui-dist`-in daxili şablonundadır — `src/components/ui/` kimi
      // bizim nəzarətimizdə deyil.
      //
      // ⚠️ Blok 13B-yə qədər bu sətir SƏSSİZCƏ keçirdi, çünki yoxlama Swagger
      // hidrasiyasından ƏVVƏL oxuyurdu. `settleHeadings()` gözləməni düzəldəndə
      // vəziyyət göründü — yəni test əvvəl «yaşıl» deyil, ERKƏN idi.
      if (path === "/docs") continue;

      await page.goto(path);
      await assertHierarchy(page, path);
    }
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 2. Giriş etmiş istifadəçinin səthləri
// ---------------------------------------------------------------------------

test("istifadəçi səhifələrində başlıq iyerarxiyası pozulmur", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, MEMBER_EMAIL);

    const paths = [
      `/class/${cohortSlug}`,
      `/class/${cohortSlug}/feed`,
      `/class/${cohortSlug}/directory`,
      `/class/${cohortSlug}/memories`,
      `/class/${cohortSlug}/events`,
      `/class/${cohortSlug}/timeline`,
      `/class/${cohortSlug}/achievements`,
      `/class/${cohortSlug}/map`,
      `/class/${cohortSlug}/support`,
      `/class/${cohortSlug}/yearbook`,
      `/u/${memberId}`,
      "/me/edit",
      "/me/privacy",
      "/me/career",
      "/notifications",
      "/kuds",
    ];

    for (const path of paths) {
      await page.goto(path);
      await assertHierarchy(page, path);
    }
  } finally {
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// 3. Admin səthləri — T22 düzəlişinin ƏSAS ölçüldüyü yer
// ---------------------------------------------------------------------------

test("admin səhifələrində kart başlıqları iyerarxiyaya daxildir", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page, ADMIN_EMAIL);

    const paths = [
      "/admin",
      "/admin/cohorts",
      "/admin/users",
      "/admin/moderation",
      "/admin/achievements",
      "/admin/audit",
      "/admin/content",
      "/admin/stats",
      "/admin/import",
    ];

    for (const path of paths) {
      await page.goto(path);
      await assertHierarchy(page, path);
    }

    // 🔴 T22-nin birbaşa ölçüsü: `/admin/content`-də kart başlıqları
    // `CardTitle` `<div>`-i olsaydı ROL üzrə tapılmazdı.
    await page.goto("/admin/content");
    await expect(
      page.getByRole("heading", { level: 2, name: /^Səhifələr \(/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^Xankəndi bələdçisi \(/ }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
