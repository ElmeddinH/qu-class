// ============================================================================
// scripts/demo-gif.ts
// README «Demo» bölməsindəki `docs/media/demo.gif`-i YIĞIR.
//
// Ssenari UYDURULMUR — `docs/DEMO.md`-dəki axının ilk beş addımıdır:
//   açılış → giriş → sinif lenti → məxfilik seçicisi → «İndi haradayıq?»
//
// ----------------------------------------------------------------------------
// İŞLƏTMƏ
// ----------------------------------------------------------------------------
//   npm run build
//   npm run shots:serve          # AYRI terminal — saatı donduran server (3100)
//   npm run demo:gif
//
// 🔴 `shots:serve` MƏCBURİDİR (adi `npm start` YOX). Səbəb `screenshots.ts` ilə
// eynidir: nisbi tarixlər ("2 gün əvvəl") SERVER komponentində render olunur və
// donmuş saat olmadan hər çəkilişdə dəyişir. Brauzer tərəfi `context.clock`
// ilə bağlanır — iki qapı birlikdə işləməlidir, yoxsa GIF determinist olmur.
//
// ----------------------------------------------------------------------------
// NİYƏ VİDEO → ffmpeg, kadr-kadr PNG YOX
// ----------------------------------------------------------------------------
// Playwright `recordVideo` ilə ƏSL hərəkəti (scroll, yazı, keçid) yazır;
// kadr-kadr screenshot isə yalnız «slayd şou» verərdi. `which ffmpeg` yoxlanılır
// və tapılmasa skript AÇIQ mesajla dayanır (sharp ilə animasiya ehtiyat yolu
// `docs/quality-report-12c.md`-də izah olunub).
//
// 🔴 `palettegen` / `paletteuse` OLMADAN GIF 30+ MB olur. ffmpeg-in default
// GIF kodlayıcısı hər kadr üçün ayrıca 256 rəng seçir; vahid palitra həm faylı
// kiçildir, həm də KUDS rənglərinin kadrdan-kadra «titrəməsini» aradan qaldırır.
//
// ⚠️ HƏDƏF ≤ 8 MB. Aşılsa skript pillə-pillə geri çəkilir (`LADDER`): əvvəlcə
// kadr sürəti, sonra en, sonra rəng sayı azalır. Hansı pillədə dayandığı
// konsola yazılır və hesabata düşür.
// ============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

const BASE_URL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const FIXED_NOW = process.env.FIXED_NOW ?? "2026-07-31T10:00:00.000Z";

/** `docs/DEMO.md` §0.2 — demo hesabı və şifrəsi. */
const ACCOUNT = "alumni@qu.edu.az";
const PASSWORD = "Test1234!";
/** `docs/DEMO.md` §0.2 — məzun sinfi; karyera statistikası məhz oradadır. */
const COHORT = "maliyye-2022";

const RECORD_SIZE = { width: 1280, height: 720 } as const;
const OUT_DIR = path.join(process.cwd(), "docs", "media");
const OUT_FILE = path.join(OUT_DIR, "demo.gif");
const WORK_DIR = path.join(process.cwd(), ".next", "demo-gif");

const MAX_BYTES = 8 * 1024 * 1024;

/** Hədəf aşılarsa sıra ilə sınanan variantlar (keyfiyyətdən ən az itirən öncə). */
// ⚠️ EN 1024-DƏN AŞAĞI YALNIZ SON ÇARƏDİR: mətn (lent kartları, məxfilik
// etiketləri) 900px-də oxunaqlılığın sərhədinə düşür. Ona görə pillələr əvvəlcə
// KADR SÜRƏTİ və RƏNG sayını yeyir, eni ən sonda azaldır.
const LADDER = [
  { fps: 12, width: 1280, colors: 256 },
  { fps: 10, width: 1280, colors: 192 },
  { fps: 10, width: 1024, colors: 160 },
  { fps: 8, width: 1024, colors: 128 },
  { fps: 8, width: 1024, colors: 96 },
  { fps: 7, width: 1024, colors: 80 },
  { fps: 6, width: 1024, colors: 64 },
  { fps: 6, width: 900, colors: 64 },
  { fps: 5, width: 800, colors: 48 },
] as const;

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

function has(binary: string): boolean {
  try {
    execFileSync("which", [binary], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** `screenshots.ts` ilə EYNİ şərt: `#main` görünür + skeleton qalmayıb. */
async function settle(page: Page) {
  await page.locator("#main").waitFor({ state: "visible" });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await page.locator(".animate-pulse").count()) === 0) break;
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => document.fonts.ready);
}

/** Yumşaq sürüşmə — bir sıçrayışla aşağı atılsaq GIF-də məzmun oxunmur. */
async function glide(page: Page, distance: number, steps = 24) {
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(45);
  }
}

function mib(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Ssenari — `docs/DEMO.md` axını
// ---------------------------------------------------------------------------

async function record(): Promise<string> {
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { ...RECORD_SIZE },
    locale: "az-AZ",
    timezoneId: "Asia/Baku",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    recordVideo: { dir: WORK_DIR, size: { ...RECORD_SIZE } },
  });

  // Saatın brauzer yarısı (server yarısı `shots:serve`-dədir).
  await context.clock.setFixedTime(new Date(FIXED_NOW));

  // Kuki banneri ekranın altını örtür — `DEMO.md` §0.2 onu əvvəlcədən qəbul
  // etməyi tələb edir; burada da eyni cür qabaqlanır.
  await context.addCookies([
    {
      name: "qu_cookie_consent",
      value: "all",
      domain: new URL(BASE_URL).hostname,
      path: "/",
    },
  ]);

  const page = await context.newPage();

  // 1. AÇILIŞ — ictimai səth (≈ 7 san)
  await page.goto(`${BASE_URL}/`);
  await settle(page);
  await page.waitForTimeout(2200);
  await glide(page, 900);
  await page.waitForTimeout(1800);

  // 2. GİRİŞ — hərflər bir-bir yazılır (≈ 8 san)
  await page.goto(`${BASE_URL}/login`);
  await settle(page);
  await page.waitForTimeout(800);
  await page.getByLabel("Universitet e-poçtu").pressSequentially(ACCOUNT, { delay: 55 });
  await page.waitForTimeout(300);
  await page.getByLabel("Şifrə", { exact: true }).pressSequentially(PASSWORD, { delay: 55 });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
  await settle(page);
  await page.waitForTimeout(1200);

  // 3. SİNİF LENTİ (≈ 8 san)
  await page.goto(`${BASE_URL}/class/${COHORT}/feed`);
  await settle(page);
  await page.waitForTimeout(2000);
  await glide(page, 1400, 32);
  await page.waitForTimeout(2200);

  // 4. MƏXFİLİK SEÇİCİSİ (≈ 9 san)
  await page.goto(`${BASE_URL}/me/privacy`);
  await settle(page);
  await page.waitForTimeout(1600);
  await glide(page, 700);
  await page.waitForTimeout(800);

  // Seçicini AÇIRIQ ki, dörd səviyyə görünsün — panelin bütün mənası budur.
  // ⚠️ HEÇ NƏ YAZILMIR: menyu `Escape` ilə bağlanır, dəyər dəyişmir.
  const selector = page.getByRole("combobox").first();
  if (await selector.count()) {
    await selector.scrollIntoViewIfNeeded();
    await selector.click();
    await page.waitForTimeout(1800);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }

  // 5. «İNDİ HARADAYIQ?» (≈ 10 san)
  await page.goto(`${BASE_URL}/class/${COHORT}/map`);
  await settle(page);
  await page.waitForTimeout(2000);

  // Yaxınlaşdırma — 12F-də əlavə olunan klaviatura idarəsi görünsün.
  const zoomIn = page.getByRole("button", { name: "Yaxınlaşdır" });
  if (await zoomIn.count()) {
    await zoomIn.click();
    await page.waitForTimeout(700);
    await zoomIn.click();
    await page.waitForTimeout(1200);
  }

  // Donut — kontrast işinin nəticəsi.
  await page.goto(`${BASE_URL}/class/${COHORT}/map?tab=industries`);
  await settle(page);
  await page.waitForTimeout(2600);
  await glide(page, 500, 16);
  await page.waitForTimeout(2400);

  await context.close();
  await browser.close();

  const videos = readdirSync(WORK_DIR).filter((file) => file.endsWith(".webm"));
  if (videos.length === 0) throw new Error("Playwright video yazmadı.");
  return path.join(WORK_DIR, videos[0]);
}

// ---------------------------------------------------------------------------
// GIF — vahid palitra ilə
// ---------------------------------------------------------------------------

function toGif(
  source: string,
  target: string,
  { fps, width, colors }: { fps: number; width: number; colors: number },
) {
  const palette = path.join(WORK_DIR, "palette.png");
  const chain = `fps=${fps},scale=${width}:-1:flags=lanczos`;

  // 1-ci keçid — bütün kadrlara ORTAQ palitra.
  execFileSync(
    "ffmpeg",
    ["-y", "-i", source, "-vf", `${chain},palettegen=max_colors=${colors}:stats_mode=diff`, palette],
    { stdio: "ignore" },
  );

  // 2-ci keçid — `dither=bayer` KUDS-un böyük düz sahələrində «qum» effektini
  // minimuma endirir; `bayer_scale=5` fayl ölçüsünü də saxlayır.
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i", source,
      "-i", palette,
      "-lavfi", `${chain}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
      "-loop", "0",
      target,
    ],
    { stdio: "ignore" },
  );
}

function durationOf(file: string): number {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]).toString().trim();
  return Number(out);
}

// ---------------------------------------------------------------------------

async function main() {
  if (!has("ffmpeg")) {
    throw new Error(
      "ffmpeg tapılmadı. Quraşdırma sudo tələb edir — əvəzinə `sharp` ilə\n" +
        "kadr-kadr animasiya yolu işlədilməlidir (bax docs/quality-report-12c.md).",
    );
  }

  const health = await fetch(`${BASE_URL}/api/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Server ${BASE_URL} ünvanında cavab vermir.\n` +
        "AYRI terminalda `npm run shots:serve` işlət (saatı donduran server).",
    );
  }

  console.log("[demo-gif] video yazılır…");
  const video = await record();
  const seconds = durationOf(video);
  console.log(`[demo-gif] video: ${mib(statSync(video).size)} · ${seconds.toFixed(1)} san`);

  mkdirSync(OUT_DIR, { recursive: true });

  let chosen: (typeof LADDER)[number] | null = null;
  for (const step of LADDER) {
    const candidate = path.join(WORK_DIR, "candidate.gif");
    toGif(video, candidate, step);
    const size = statSync(candidate).size;
    const mark = size <= MAX_BYTES ? "✅" : "üstündür, növbəti pillə";
    console.log(
      `[demo-gif] fps=${step.fps} en=${step.width} rəng=${step.colors} → ${mib(size)} ${mark}`,
    );

    if (size <= MAX_BYTES) {
      if (existsSync(OUT_FILE)) rmSync(OUT_FILE);
      renameSync(candidate, OUT_FILE);
      chosen = step;
      break;
    }
    rmSync(candidate);
  }

  if (!chosen) throw new Error("Ən aşağı pillədə də 8 MB aşıldı — ssenarini qısalt.");

  const finalSize = statSync(OUT_FILE).size;
  console.log(
    `\n[demo-gif] ${OUT_FILE}\n` +
      `[demo-gif] ${mib(finalSize)} · ${seconds.toFixed(1)} san · ` +
      `${chosen.width}px · ${chosen.fps} fps · ${chosen.colors} rəng`,
  );

  rmSync(WORK_DIR, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`[demo-gif] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
