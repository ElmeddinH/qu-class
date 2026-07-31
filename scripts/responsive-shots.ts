// ============================================================================
// scripts/responsive-shots.ts
// Blok 12C · C bəndi — 5 BREAKPOINT × 10 SƏHİFƏ EKRAN GÖRÜNTÜSÜ (KUDS §9).
//
// İstifadə:
//   npm run build && npm start        # ayrı terminalda, port 3100
//   npm run audit:responsive
//
// ⚠️ 13B-DƏ YENİDƏN İŞLƏDİLƏCƏK — ona görə heç nə sabit yazılmayıb:
//   · baza ünvan   → `SHOTS_BASE_URL`   (default 127.0.0.1:3100)
//   · çıxış qovluğu → `SHOTS_OUT_DIR`    (default docs/responsive)
//   · hesab         → `SHOTS_EMAIL` / `SHOTS_PASSWORD`
//   · yalnız bir səhifə → `SHOTS_ONLY=feed`
// Skript İDEMPOTENTDİR: eyni fayl adlarını üzərinə yazır, artıq qalıq qoymur.
//
// 🔴 SKRİPT YALNIZ ŞƏKİL ÇƏKMİR, ÖLÇÜR DƏ. Hər görüntüdən əvvəl üç maşın
// yoxlaması işləyir və nəticə `docs/responsive/report.md`-yə yazılır:
//   1. ÜFÜQİ SÜRÜŞMƏ — `documentElement.scrollWidth > clientWidth`
//      (KUDS §9-un ən sərt qaydası: heç bir enlikdə yan sürüşmə OLMAMALIDIR)
//   2. TAŞAN ELEMENT — sağ kənarı viewport-dan kənara çıxan konkret elementlər
//      (sürüşmə varsa «hansı element?» sualının cavabı dərhal lazımdır)
//   3. KİÇİK TOXUNMA HƏDƏFİ — 44×44 px-dən kiçik interaktiv elementlər
//      (WCAG 2.2 «Target Size (Minimum)» 24px-dir; KUDS 44px tələb edir)
//
// ⚠️ `browser.newContext({ viewport })` — TƏLƏ T16: hər breakpoint öz
// kontekstini alır və `finally`-də bağlanır. `page.setViewportSize()` ilə
// eyni kontekstdə ölçü dəyişmək `deviceScaleFactor`-u və mobil emulyasiyanı
// saxlamır.
//
// ⚠️ Skript YALNIZ OXUYUR — bazaya heç nə yazmır.
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.SHOTS_BASE_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = path.resolve(process.cwd(), process.env.SHOTS_OUT_DIR ?? "docs/responsive");
const ONLY = process.env.SHOTS_ONLY ?? null;

const EMAIL = process.env.SHOTS_EMAIL ?? "admin@qu.edu.az";
const PASSWORD = process.env.SHOTS_PASSWORD ?? "Test1234!";

/** KUDS §9 — beş breakpoint. Hündürlük yalnız ilk ekran üçündür (tam səhifə çəkilir). */
const BREAKPOINTS = [
  { width: 375, height: 812, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "laptop" },
  { width: 1280, height: 800, label: "desktop" },
  { width: 1536, height: 864, label: "large" },
] as const;

/**
 * İKİ HƏDD, ÇÜNKİ İKİ FƏRQLİ SƏNƏD İKİ FƏRQLİ RƏQƏM DEYİR:
 *
 *   · `HARD` = 24px — WCAG 2.2 AA, SC 2.5.8 «Target Size (Minimum)».
 *     Bu, STANDARTIN TƏLƏBİDİR və hesabatda QAPI kimi işlədilir.
 *   · `KUDS` = 44px — layihənin öz dizayn qaydası (tapşırıq mətni).
 *     Bu MƏSLƏHƏTDİR, qapı deyil.
 *
 * 🔴 NİYƏ 44px QAPI DEYİL: shadcn düymələrinin standart hündürlüyü `h-9`
 * (36px), input-larınki `h-9`/`h-10`-dur və bu ölçülər `src/components/ui/`
 * mənbəyindədir — CLAUDE.md §1-ə görə TOXUNULMAZ. 44px-i qapı etsək hesabat
 * hər səhifədə onlarla «pozuntu» göstərər və REAL tapıntı (4×4 px xəritə
 * markeri) həmin səs-küydə itər.
 */
const HARD_TOUCH_TARGET = 24;
const KUDS_TOUCH_TARGET = 44;

/**
 * Toxunma hədəfi ölçüsündən AZAD edilən hallar — hər biri standartın öz
 * istisnasıdır (WCAG 2.2 SC 2.5.8 «Inline» və «Equivalent»).
 */
const TARGET_SIZE_EXEMPT = [
  // Cümlə içindəki link — sətir hündürlüyü ilə məhdudlaşır («Inline» istisnası)
  ".kuds-prose-link",
  // Fokusa qədər 1×1 px olan skip-link
  ".skip-link",
];

interface PageSpec {
  key: string;
  label: string;
  pathname: string;
  /**
   * 🔴 GİRİŞ VƏZİYYƏTİ SƏHİFƏNİN ÖZÜ QƏDƏR VACİBDİR.
   * `/login` giriş etmiş brauzerdə middleware tərəfindən sinif səhifəsinə
   * YÖNLƏNDİRİLİR — yəni «hamısını bir sessiyada gəz» yanaşması ictimai
   * səhifələri səssizcə BAŞQA səhifə kimi ölçür. Ona görə hər breakpoint iki
   * kontekstlə işləyir: anonim və giriş etmiş.
   */
  auth: boolean;
}

async function resolvePages(): Promise<PageSpec[]> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: EMAIL },
    select: {
      memberships: {
        where: { isPrimary: true },
        select: { cohort: { select: { slug: true } } },
      },
    },
  });

  const slug = user.memberships[0]?.cohort.slug;
  if (!slug) throw new Error(`${EMAIL} hesabının əsas sinfi yoxdur.`);

  const pages: PageSpec[] = [
    { key: "landing", label: "/", pathname: "/", auth: false },
    { key: "khankendi", label: "/khankendi", pathname: "/khankendi", auth: false },
    { key: "login", label: "/login", pathname: "/login", auth: false },
    { key: "class", label: "/class/[slug]", pathname: `/class/${slug}`, auth: true },
    {
      key: "feed",
      label: "/class/[slug]/feed",
      pathname: `/class/${slug}/feed`,
      auth: true,
    },
    {
      key: "directory",
      label: "/class/[slug]/directory",
      pathname: `/class/${slug}/directory`,
      auth: true,
    },
    {
      key: "timeline",
      label: "/class/[slug]/timeline",
      pathname: `/class/${slug}/timeline`,
      auth: true,
    },
    { key: "map", label: "/class/[slug]/map", pathname: `/class/${slug}/map`, auth: true },
    { key: "privacy", label: "/me/privacy", pathname: "/me/privacy", auth: true },
    { key: "admin-users", label: "/admin/users", pathname: "/admin/users", auth: true },
  ];

  return ONLY ? pages.filter((entry) => entry.key === ONLY) : pages;
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Universitet e-poçtu").fill(EMAIL);
  await page.getByLabel("Şifrə", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

interface Overflow {
  selector: string;
  right: number;
}

interface SmallTarget {
  selector: string;
  width: number;
  height: number;
  /** 24px WCAG 2.2 həddindən də kiçikdirmi (yəni QAPI pozuntusu). */
  hard: boolean;
}

interface Finding {
  page: string;
  breakpoint: string;
  scrollWidth: number;
  clientWidth: number;
  overflowing: Overflow[];
  smallTargets: SmallTarget[];
}

/**
 * Səhifənin yükləndiyini təsdiqləyir.
 *
 * ⚠️ `networkidle` İŞLƏDİLMİR (Next.js prefetch-ləri fasiləsizdir). Şərt:
 * `<main>` görünür + skeleton qalmayıb.
 */
async function settle(page: Page) {
  await page.locator("#main").waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await page.locator(".animate-pulse").count()) === 0) return;
    await page.waitForTimeout(250);
  }
}

async function measure(page: Page, viewportWidth: number) {
  return page.evaluate(
    // 🔴 BU FUNKSİYANIN İÇİNDƏ ADLI KÖMƏKÇİ FUNKSİYA TƏYİN ETMƏ.
    // `tsx` mənbəni esbuild ilə `keepNames` rejimində çevirir və hər adlı
    // funksiya bindinq-inə `__name(...)` sarğısı əlavə edir. Həmin köməkçi
    // Node tərəfindədir, BRAUZERDƏ YOXDUR — `page.evaluate` içində istifadə
    // olunanda `ReferenceError: __name is not defined` verir. Ona görə
    // selektor mətni dövrənin içində SƏTİR-SƏTİR qurulur.
    ({ minTarget, hardTarget, exempt }) => {
      const root = document.documentElement;
      const clientWidth = root.clientWidth;

      const overflowing: { selector: string; right: number }[] = [];
      const smallTargets: {
        selector: string;
        width: number;
        height: number;
        hard: boolean;
      }[] = [];

      for (const node of Array.from(document.body.querySelectorAll("*"))) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        // Qısa, oxunaqlı selektor — `teq#id.sinif1.sinif2.sinif3`.
        const rawClass = node.className;
        const classText = typeof rawClass === "string" ? rawClass.trim() : "";
        const selector =
          node.tagName.toLowerCase() +
          (node.id ? `#${node.id}` : "") +
          (classText ? `.${classText.split(/\s+/).slice(0, 3).join(".")}` : "");

        // 1) Viewport-dan sağa taşan elementlər.
        // ⚠️ 1px tolerantlıq: sub-piksel yuvarlaqlaşma yalançı tapıntı verir.
        if (rect.right > clientWidth + 1 && style.position !== "fixed") {
          overflowing.push({ selector, right: Math.round(rect.right) });
        }

        // 2) Kiçik toxunma hədəfləri — yalnız İNTERAKTİV elementlər.
        const interactive =
          node.matches("a[href], button, input, select, textarea, [role='button']") &&
          !node.hasAttribute("disabled");

        if (!interactive) continue;
        if (exempt.some((selector) => node.matches(selector))) continue;
        // Gizli (sr-only) idarəedicilər — vizual hədəf label-dır.
        if (rect.width <= 1 || rect.height <= 1) continue;
        // 🔴 WCAG 2.2 SC 2.5.8 «INLINE» İSTİSNASI — iki formada yoxlanılır.
        //
        // Standartın mətni: «target is in a sentence or its size is otherwise
        // constrained by the line-height of non-target text».
        //
        // (a) `display: inline` — linkin özü mətn axınındadır.
        if (style.display === "inline") continue;
        //
        // (b) Link `flex` sətrinin övladıdırsa brauzer onu BLOKLAŞDIRIR
        //     (`display: block`), amma o, hələ də cümlənin bir hissəsidir:
        //     «Samir Qasımov · 3 gün əvvəl». Şərt — valideynin İÇİNDƏ hədəf
        //     OLMAYAN mətn var (tarix, ayırıcı) VƏ linkin hündürlüyü öz
        //     sətir hündürlüyünə bərabərdir (yəni daxili boşluq yoxdur).
        //
        //     ⚠️ Bu istisna «yalnız linklərdən ibarət sətir»ə (footer meta
        //     zolağı, breadcrumb) ŞAMİL OLUNMUR — orada hədəf olmayan mətn
        //     yoxdur və 24px minimumu qüvvədədir.
        const parent = node.parentElement;
        if (parent) {
          let siblingText = "";
          for (const child of Array.from(parent.childNodes)) {
            if (child === node) continue;
            if (child.nodeType === Node.TEXT_NODE) {
              siblingText += child.textContent ?? "";
            } else if (child instanceof HTMLElement) {
              const isTarget = child.matches(
                "a[href], button, input, select, textarea, [role='button']",
              );
              if (!isTarget) siblingText += child.textContent ?? "";
            }
          }

          const lineHeight = Number.parseFloat(style.lineHeight);
          const constrainedByLine =
            Number.isFinite(lineHeight) && Math.abs(rect.height - lineHeight) <= 1;

          if (siblingText.trim().length > 0 && constrainedByLine) continue;
        }

        if (rect.width < minTarget || rect.height < minTarget) {
          smallTargets.push({
            selector,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            hard: rect.width < hardTarget || rect.height < hardTarget,
          });
        }
      }

      return {
        scrollWidth: root.scrollWidth,
        clientWidth,
        // Eyni selektor onlarla dəfə təkrarlanır (siyahı elementləri) — unikallaşdırılır.
        overflowing: overflowing
          .filter(
            (entry, index, all) =>
              all.findIndex((other) => other.selector === entry.selector) === index,
          )
          .slice(0, 10),
        smallTargets: smallTargets
          .filter(
            (entry, index, all) =>
              all.findIndex((other) => other.selector === entry.selector) === index,
          )
          .slice(0, 10),
      };
    },
    {
      minTarget: KUDS_TOUCH_TARGET,
      hardTarget: HARD_TOUCH_TARGET,
      exempt: TARGET_SIZE_EXEMPT,
      viewportWidth,
    },
  );
}

function reportMarkdown(findings: Finding[]): string {
  const overflowRows = findings
    .filter((entry) => entry.scrollWidth > entry.clientWidth + 1)
    .map(
      (entry) =>
        `| \`${entry.page}\` | ${entry.breakpoint} | ${entry.scrollWidth} > ${entry.clientWidth} | ` +
        `${entry.overflowing.map((item) => `\`${item.selector}\``).join(", ") || "—"} |`,
    );

  // QAPI — WCAG 2.2 AA (24px). Yalnız bunlar «pozuntu»dur.
  const hardRows = findings
    .map((entry) => ({ entry, hard: entry.smallTargets.filter((item) => item.hard) }))
    .filter((row) => row.hard.length > 0)
    .map(
      (row) =>
        `| \`${row.entry.page}\` | ${row.entry.breakpoint} | ` +
        `${row.hard
          .map((item) => `\`${item.selector}\` ${item.width}×${item.height}`)
          .join("<br>")} |`,
    );

  // MƏSLƏHƏT — KUDS 44px. Yalnız SAY verilir; siyahı shadcn `h-9` primitivləri
  // ilə dolur və hər səhifədə təkrarlanır (bax sabitin yanındakı izah).
  const advisoryCount = findings.reduce(
    (total, entry) => total + entry.smallTargets.filter((item) => !item.hard).length,
    0,
  );

  return [
    "# Responsive audit — Blok 12C",
    "",
    `Baza: \`${BASE_URL}\` · Breakpoint-lər: ${BREAKPOINTS.map((b) => b.width).join(" / ")} px`,
    `Toxunma hədəfi: QAPI ${HARD_TOUCH_TARGET}px (WCAG 2.2 AA) · MƏSLƏHƏT ${KUDS_TOUCH_TARGET}px (KUDS)`,
    "",
    "## 1. Üfüqi sürüşmə",
    "",
    overflowRows.length === 0
      ? "**Tapıntı yoxdur** — beş breakpoint-in heç birində üfüqi sürüşmə yoxdur ✅"
      : [
          "| Səhifə | Breakpoint | scrollWidth | Taşan elementlər |",
          "| --- | --- | --- | --- |",
          ...overflowRows,
        ].join("\n"),
    "",
    `## 2. Toxunma hədəfi — QAPI (WCAG 2.2 AA, ${HARD_TOUCH_TARGET}px)`,
    "",
    hardRows.length === 0
      ? `**Tapıntı yoxdur** — bütün interaktiv elementlər ≥ ${HARD_TOUCH_TARGET}px ✅`
      : [
          "| Səhifə | Breakpoint | Elementlər |",
          "| --- | --- | --- |",
          ...hardRows,
        ].join("\n"),
    "",
    `## 3. Toxunma hədəfi — MƏSLƏHƏT (KUDS ${KUDS_TOUCH_TARGET}px)`,
    "",
    `${advisoryCount} element 24px-i keçir, amma KUDS-un ${KUDS_TOUCH_TARGET}px tövsiyəsindən kiçikdir.`,
    "Böyük hissəsi shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36px) və",
    "`src/components/ui/` CLAUDE.md §1-ə görə toxunulmazdır — ona görə bu bölmə",
    "qapı deyil, siyahıdır.",
    "",
    `Ekran görüntüləri: \`<səhifə>__<en>.png\` (${findings.length} ədəd).`,
    "",
  ].join("\n");
}

async function shoot(browser: Browser, pages: PageSpec[]): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const breakpoint of BREAKPOINTS) {
    // TƏLƏ T16 — hər breakpoint İKİ kontekst açır və ikisini də bağlayır.
    const viewport = { width: breakpoint.width, height: breakpoint.height };
    const anonContext = await browser.newContext({ viewport, locale: "az-AZ" });
    const authContext = await browser.newContext({ viewport, locale: "az-AZ" });

    try {
      const anonPage = await anonContext.newPage();
      const authPage = await authContext.newPage();
      await login(authPage);

      for (const spec of pages) {
        const page = spec.auth ? authPage : anonPage;
        await page.goto(`${BASE_URL}${spec.pathname}`);
        await settle(page);

        const measured = await measure(page, breakpoint.width);

        await page.screenshot({
          path: path.join(OUT_DIR, `${spec.key}__${breakpoint.width}.png`),
          fullPage: true,
        });

        findings.push({
          page: spec.label,
          breakpoint: `${breakpoint.width} (${breakpoint.label})`,
          ...measured,
        });

        const overflow = measured.scrollWidth > measured.clientWidth + 1 ? " 🔴 SÜRÜŞMƏ" : "";
        const hardCount = measured.smallTargets.filter((item) => item.hard).length;
        const targets = hardCount > 0 ? ` 🔴 ${hardCount} kiçik hədəf (<24px)` : "";

        console.log(`  ${breakpoint.width}px ${spec.label}${overflow}${targets}`);
      }
    } finally {
      await anonContext.close();
      await authContext.close();
    }
  }

  return findings;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const health = await fetch(`${BASE_URL}/api/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Server ${BASE_URL} ünvanında cavab vermir. Əvvəlcə: npm run build && npm start`,
    );
  }

  const pages = await resolvePages();
  const browser = await chromium.launch();

  try {
    const findings = await shoot(browser, pages);
    const markdown = reportMarkdown(findings);
    writeFileSync(path.join(OUT_DIR, "report.md"), markdown, "utf8");
    console.log(`\n${markdown}`);
  } finally {
    await browser.close();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
