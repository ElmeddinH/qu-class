// ============================================================================
// tests/e2e/a11y.spec.ts
// Blok 12C · A bəndi — AVTOMATİK ƏLÇATANLIQ AUDİTİ (KUDS §21, WCAG 2.2 AA).
//
// 🔴 FAYLIN SUALI: 12 əsas səhifədə axe-core `serious` və ya `critical`
// səviyyəli pozuntu varmı — həm ANONİM, həm GİRİŞ ETMİŞ vəziyyətdə?
//
// ⚠️ NİYƏ `moderate`/`minor` testi QIRMIZI ETMİR (DoD-un qərarı):
// axe-in `moderate` qaydalarının bir hissəsi (məs. `landmark-unique`) kontekst
// tələb edir və avtomatik qərar verilə bilməz. Onlar SAYILIR və hesabata
// (`docs/quality-report-12c.md`) düşür, amma qapı yalnız serious/critical-dır.
//
// ⚠️ TEQ SEÇİMİ: yalnız WCAG teqləri (`wcag2a` … `wcag22aa`). `best-practice`
// QOŞULMUR — orada `region` kimi qaydalar var ki, standartın tələbi deyil və
// qapını səbəbsiz qırmızı edərdi.
//
// ⚠️ TƏLƏ T16: hər test ÖZ `browser.newContext()`-ini yaradır və `finally`
// blokunda bağlayır. Giriş etmiş vəziyyət üçün iki kontekst `beforeAll`-da bir
// dəfə qurulur (12 səhifə üçün 12 dəfə giriş etmək dəstin vaxtını ikiqat
// edirdi) və `afterAll`-da bağlanır.
//
// ⚠️ TƏLƏ T19: skeleton-ların yox olmasını `expect.poll` gözləyir — sabit
// `waitForTimeout` YOXDUR. Skeleton qalarsa bu, ölçmə deyil, REAL nasazlıqdır
// (yüklənmə vəziyyəti heç vaxt bitmir) və testin qırmızı olması doğrudur.
//
// ⚠️ Fayl YALNIZ OXUYUR — bazada heç bir sətir yaratmır/dəyişmir.
// Nəticələr `test-results/axe/` altına JSON kimi yazılır (gitignore-dadır);
// hesabat cədvəli oradan qurulur.
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@qu.edu.az";
const MEMBER_EMAIL = "rep@qu.edu.az";

/** WCAG 2.0/2.1/2.2 — A və AA. `best-practice` qəsdən YOXDUR (bax başlıq). */
const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

/** Qapını qırmızı edən təsir səviyyələri. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

const RESULT_DIR = path.join(process.cwd(), "test-results", "axe");

interface PageSpec {
  /** Fayl adı üçün qısa açar */
  key: string;
  /** Testin adında görünən yol şablonu */
  label: string;
  /** Real ünvan — `beforeAll` cohort slug-ını oxuduqdan sonra qurulur */
  path: () => string;
  /** Giriş etmiş vəziyyət hansı hesabla yoxlanılır */
  as: "member" | "admin";
}

let cohortSlug: string;

const PAGES: PageSpec[] = [
  { key: "landing", label: "/", path: () => "/", as: "member" },
  { key: "faq", label: "/faq", path: () => "/faq", as: "member" },
  { key: "khankendi", label: "/khankendi", path: () => "/khankendi", as: "member" },
  { key: "login", label: "/login", path: () => "/login", as: "member" },
  { key: "register", label: "/register", path: () => "/register", as: "member" },
  { key: "home", label: "/home", path: () => "/home", as: "member" },
  {
    key: "class",
    label: "/class/[slug]",
    path: () => `/class/${cohortSlug}`,
    as: "member",
  },
  {
    key: "directory",
    label: "/class/[slug]/directory",
    path: () => `/class/${cohortSlug}/directory`,
    as: "member",
  },
  {
    key: "timeline",
    label: "/class/[slug]/timeline",
    path: () => `/class/${cohortSlug}/timeline`,
    as: "member",
  },
  {
    key: "map",
    label: "/class/[slug]/map",
    path: () => `/class/${cohortSlug}/map`,
    as: "member",
  },
  { key: "privacy", label: "/me/privacy", path: () => "/me/privacy", as: "member" },
  { key: "admin", label: "/admin", path: () => "/admin", as: "admin" },
];

test.beforeAll(async () => {
  mkdirSync(RESULT_DIR, { recursive: true });

  const member = await prisma.user.findUniqueOrThrow({
    where: { email: MEMBER_EMAIL },
    select: {
      memberships: {
        where: { isPrimary: true },
        select: { cohort: { select: { slug: true } } },
      },
    },
  });

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

/**
 * Səhifənin ÖLÇÜLƏ BİLƏN vəziyyətə gəlməsini gözləyir.
 *
 * ⚠️ `networkidle` İŞLƏDİLMİR — Next.js-in RSC prefetch-ləri arxa planda davam
 * edir və gözləmə təsadüfi vaxta düşür. Bunun əvəzinə iki dəqiq şərt:
 *   1. `<main id="main">` görünür (karkas render olunub);
 *   2. `animate-pulse` (shadcn `Skeleton`) sinfi qalmayıb — yəni bütün
 *      Suspense sərhədləri həll olunub və axe REAL məzmunu ölçür.
 */
async function settle(page: Page) {
  await page.locator("#main").waitFor({ state: "visible" });

  await expect
    .poll(() => page.locator(".animate-pulse").count(), {
      timeout: 20_000,
      message: "Skeleton yox olmadı — yüklənmə vəziyyəti bitmir",
    })
    .toBe(0);
}

interface ScanSummary {
  page: string;
  state: string;
  requestedPath: string;
  finalPath: string;
  counts: Record<string, number>;
  blocking: {
    id: string;
    impact: string;
    help: string;
    nodes: string[];
  }[];
}

/**
 * Səhifəni skan edir, nəticəni JSON kimi yazır və serious/critical siyahısını
 * qaytarır. Sayğaclar (`minor`…`critical`) hesabat üçün saxlanılır.
 */
async function scan(page: Page, spec: PageSpec, state: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  const counts: Record<string, number> = {
    minor: 0,
    moderate: 0,
    serious: 0,
    critical: 0,
  };

  for (const violation of results.violations) {
    const impact = violation.impact ?? "minor";
    counts[impact] = (counts[impact] ?? 0) + violation.nodes.length;
  }

  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? "",
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    }));

  const summary: ScanSummary = {
    page: spec.label,
    state,
    requestedPath: spec.path(),
    finalPath: new URL(page.url()).pathname,
    counts,
    blocking,
  };

  writeFileSync(
    path.join(RESULT_DIR, `${state}__${spec.key}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  return blocking;
}

/** Oxunaqlı xəta mətni — hansı qayda, hansı element. */
function describeBlocking(blocking: Awaited<ReturnType<typeof scan>>) {
  return blocking
    .map(
      (violation) =>
        `[${violation.impact}] ${violation.id} — ${violation.help}\n` +
        violation.nodes.map((node) => `    → ${node}`).join("\n"),
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// 1) ANONİM ziyarətçi
//
// ⚠️ Qorunan yollar (`/home`, `/class/*`, `/me/privacy`, `/admin`) middleware
// tərəfindən `/login`-ə yönləndirilir. Bu, SƏHV DEYİL — anonim istifadəçinin
// REAL gördüyü səhifə məhz odur və axe onu ölçür. Yönləndirmənin baş verdiyi
// JSON-da `finalPath` ilə qeyd olunur.
// ---------------------------------------------------------------------------
test.describe("axe · anonim ziyarətçi", () => {
  for (const spec of PAGES) {
    test(`${spec.label} — serious/critical pozuntu yoxdur`, async ({ browser }) => {
      const context = await browser.newContext();

      try {
        const page = await context.newPage();
        await page.goto(spec.path());
        await settle(page);

        const blocking = await scan(page, spec, "anon");
        expect(blocking, describeBlocking(blocking)).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 2) GİRİŞ ETMİŞ istifadəçi
//
// İki kontekst: sinif üzvü (`rep@`) və universitet admini (`admin@`).
// `/admin` admin kontekstində, qalan 11 səhifə üzv kontekstində ölçülür.
// ---------------------------------------------------------------------------
test.describe("axe · giriş etmiş istifadəçi", () => {
  let memberPage: Page;
  let adminPage: Page;
  let closeAll: () => Promise<void>;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const memberContext = await browser.newContext();
    const adminContext = await browser.newContext();

    memberPage = await memberContext.newPage();
    adminPage = await adminContext.newPage();

    await login(memberPage, MEMBER_EMAIL);
    await login(adminPage, ADMIN_EMAIL);

    // TƏLƏ T16 — hər iki kontekst mütləq bağlanmalıdır.
    closeAll = async () => {
      await memberContext.close();
      await adminContext.close();
    };
  });

  test.afterAll(async () => {
    await closeAll();
  });

  for (const spec of PAGES) {
    test(`${spec.label} — serious/critical pozuntu yoxdur`, async () => {
      const page = spec.as === "admin" ? adminPage : memberPage;

      await page.goto(spec.path());
      await settle(page);

      const blocking = await scan(page, spec, "auth");
      expect(blocking, describeBlocking(blocking)).toEqual([]);
    });
  }
});
