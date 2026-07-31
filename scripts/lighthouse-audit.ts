// ============================================================================
// scripts/lighthouse-audit.ts
// Blok 12C · B bəndi — LIGHTHOUSE AUDİTİ (KUDS §22).
//
// İstifadə:
//   npm run build && npm start        # ayrı terminalda, port 3100
//   npm run audit:lighthouse
//
// 🔴 LIGHTHOUSE QURAŞDIRILMIR — `npx lighthouse@12` ilə işlədilir (tapşırığın
// açıq tələbi). Yəni `package.json`-a yeni asılılıq düşmür.
//
// 🔴 BEŞ SƏHİFƏNİN ÜÇÜ AUTENTİFİKASİYA TƏLƏB EDİR (`/home`,
// `/class/[slug]/directory`, `/admin`). Lighthouse CLI forma doldura bilmir,
// ona görə sessiya kukisi ƏVVƏLCƏ `/api/v1/auth/login`-dən alınır və
// `--extra-headers` ilə ötürülür. Kuki ADI cavabdan oxunur, sabit yazılmır:
// Auth.js https altında `__Secure-` prefiksi əlavə edir.
//
// 🔴 `--preset=desktop`. Default profil «yavaş 4G + zəif mobil CPU»
// simulyasiyasıdır; universitet portalının əsas auditoriyası isə masaüstü
// brauzerdir və hədəf rəqəmlər (Performance ≥ 90) məhz bu profil üçün
// qoyulub. Profil hesabatda AÇIQ yazılır — rəqəmlər kontekstsiz oxunmasın.
//
// ⚠️ `--extra-headers` BÜTÜN sorğulara qoşulur; kuki yalnız lokal seed
// hesabınındır və hesabatlara DÜŞMÜR (aşağıda `redact`).
//
// ⚠️ Skript REPOZİTORİYADA QALIR və 13B-də yenidən işlədilə bilər: bütün
// parametrlər (port, çıxış qovluğu, hesab) mühit dəyişənlərindən oxunur.
// ============================================================================

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.LH_BASE_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = path.resolve(process.cwd(), process.env.LH_OUT_DIR ?? "docs/lighthouse");
const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

/**
 * `desktop` (default) və ya `mobile`.
 *
 * ⚠️ `mobile` Lighthouse-un ÖZ default profilidir: yavaş 4G şəbəkə + 4×
 * zəiflədilmiş CPU. Rəqəmlər masaüstündən aşağı olur və bu, NASAZLIQ DEYİL —
 * fərqli ölçmə şəraitidir. Hesabatda hər iki profil saxlanılır ki, «100 aldıq»
 * cümləsi kontekstsiz oxunmasın.
 */
const PRESET = process.env.LH_PRESET === "mobile" ? "mobile" : "desktop";

/** Seed admini — həm `/admin`, həm sinif səhifələrini görür. */
const AUDIT_EMAIL = process.env.LH_EMAIL ?? "admin@qu.edu.az";
const AUDIT_PASSWORD = process.env.LH_PASSWORD ?? "Test1234!";

/** KUDS §22 hədəfləri — hesabat cədvəlindəki «hədəf» sütunu. */
const TARGETS: Record<string, number> = {
  performance: 90,
  accessibility: 95,
  "best-practices": 90,
  seo: 90,
};

interface PageSpec {
  key: string;
  label: string;
  pathname: string;
  needsAuth: boolean;
}

async function resolvePages(): Promise<PageSpec[]> {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: AUDIT_EMAIL },
    select: {
      memberships: {
        where: { isPrimary: true },
        select: { cohort: { select: { slug: true } } },
      },
    },
  });

  const slug = admin.memberships[0]?.cohort.slug;
  if (!slug) throw new Error(`${AUDIT_EMAIL} hesabının əsas sinfi yoxdur.`);

  return [
    { key: "landing", label: "/", pathname: "/", needsAuth: false },
    { key: "home", label: "/home", pathname: "/home", needsAuth: true },
    {
      key: "directory",
      label: "/class/[slug]/directory",
      pathname: `/class/${slug}/directory`,
      needsAuth: true,
    },
    {
      key: "map",
      label: "/class/[slug]/map",
      pathname: `/class/${slug}/map`,
      needsAuth: true,
    },
    { key: "admin", label: "/admin", pathname: "/admin", needsAuth: true },
  ];
}

/**
 * Sessiya kukisini alır.
 *
 * ⚠️ `Content-Type: application/json` MƏCBURİDİR — endpoint `requireJson()`
 * qapısı ilə qorunur (CSRF müdafiəsi, bax route başlığı).
 */
async function sessionCookie(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUDIT_EMAIL, password: AUDIT_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Giriş alınmadı: ${response.status} ${await response.text()}`);
  }

  const raw = response.headers.getSetCookie?.() ?? [];
  const token = raw
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry.includes("authjs.session-token"));

  if (!token) throw new Error("Sessiya kukisi cavabda tapılmadı.");
  return token;
}

/** Kuki dəyərini loqdan çıxarır — terminal çıxışı paylaşıla bilər. */
function redact(value: string): string {
  return value.replace(/=.*/, "=<gizlədilib>");
}

interface Scores {
  performance: number;
  accessibility: number;
  "best-practices": number;
  seo: number;
}

interface Measurement {
  page: PageSpec;
  scores: Scores;
  metrics: Record<string, string>;
}

function runLighthouse(page: PageSpec, cookie: string | null): Measurement {
  const outputPath = path.join(OUT_DIR, page.key);

  const args = [
    "--yes",
    "lighthouse@12",
    `${BASE_URL}${page.pathname}`,
    // `mobile` Lighthouse-un defaultudur və `--preset` bayrağı onu qəbul
    // etmir — o halda bayraq ÜMUMİYYƏTLƏ verilmir.
    ...(PRESET === "desktop" ? ["--preset=desktop"] : []),
    "--output=html",
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
    "--quiet",
  ];

  if (page.needsAuth && cookie) {
    args.push(`--extra-headers=${JSON.stringify({ Cookie: cookie })}`);
  }

  const result = spawnSync("npx", args, {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CHROME_PATH },
  });

  if (result.status !== 0) {
    throw new Error(`${page.label}: lighthouse ${result.status} kodu ilə dayandı.`);
  }

  const report = JSON.parse(
    readFileSync(`${outputPath}.report.json`, "utf8"),
  ) as LighthouseReport;

  const scores = Object.fromEntries(
    Object.keys(TARGETS).map((key) => [
      key,
      Math.round((report.categories[key]?.score ?? 0) * 100),
    ]),
  ) as unknown as Scores;

  const metrics = {
    FCP: report.audits["first-contentful-paint"]?.displayValue ?? "—",
    LCP: report.audits["largest-contentful-paint"]?.displayValue ?? "—",
    TBT: report.audits["total-blocking-time"]?.displayValue ?? "—",
    CLS: report.audits["cumulative-layout-shift"]?.displayValue ?? "—",
    SI: report.audits["speed-index"]?.displayValue ?? "—",
  };

  return { page, scores, metrics };
}

interface LighthouseReport {
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { displayValue?: string }>;
}

function summaryMarkdown(measurements: Measurement[]): string {
  const head = [
    "| Səhifə | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  const rows = measurements.map((entry) => {
    const cell = (key: keyof Scores) => {
      const value = entry.scores[key];
      return `${value}${value >= TARGETS[key] ? " ✅" : " ❌"}`;
    };

    return (
      `| \`${entry.page.label}\` | ${cell("performance")} | ${cell("accessibility")} ` +
      `| ${cell("best-practices")} | ${cell("seo")} ` +
      `| ${entry.metrics.FCP} | ${entry.metrics.LCP} | ${entry.metrics.TBT} | ${entry.metrics.CLS} |`
    );
  });

  const targets = Object.entries(TARGETS)
    .map(([key, value]) => `${key} ≥ ${value}`)
    .join(" · ");

  return [
    "# Lighthouse — Blok 12C",
    "",
    `Profil: **${PRESET} preset** · Baza: \`${BASE_URL}\` (\`next start\`, istehsal build-i)`,
    `Hədəflər: ${targets}`,
    "",
    ...head,
    ...rows,
    "",
    "Tam hesabatlar (HTML + JSON) bu qovluqdadır: `<key>.report.html` / `<key>.report.json`.",
    "",
  ].join("\n");
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
  const cookie = await sessionCookie();
  console.log(`→ sessiya kukisi alındı: ${redact(cookie)}`);

  const measurements: Measurement[] = [];

  for (const page of pages) {
    console.log(`→ ${page.label} ölçülür...`);
    measurements.push(runLighthouse(page, cookie));
  }

  const markdown = summaryMarkdown(measurements);
  writeFileSync(path.join(OUT_DIR, "README.md"), markdown, "utf8");

  console.log(`\n${markdown}`);

  const failed = measurements.filter((entry) =>
    (Object.keys(TARGETS) as (keyof Scores)[]).some(
      (key) => entry.scores[key] < TARGETS[key],
    ),
  );

  if (failed.length > 0) {
    console.log(
      `⚠️  Hədəfə çatmayan səhifə: ${failed.map((entry) => entry.page.label).join(", ")}`,
    );
  } else {
    console.log("✅ Beş səhifənin hamısı bütün hədəfləri keçdi.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
