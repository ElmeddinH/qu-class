// ============================================================================
// scripts/screenshots.ts
// Blok 13B — SƏNƏD ÜÇÜN 17 EKRAN GÖRÜNTÜSÜ (KUDS desktop referansı 1440×900).
//
// İstifadə:
//   npx prisma db seed                 # bazanı sıfırla (determinizmin şərti)
//   npm run build
//   npm run shots:serve                # AYRI terminalda — saatı bağlı server
//   npm run shots
//
// `scripts/responsive-shots.ts` (Blok 12C) ilə ORTAQ HƏLL: `settle()`,
// `login()`, `browser.newContext({ viewport })` (TƏLƏ T16) və `SHOTS_*` mühit
// dəyişənləri eyni məntiqlə qurulub. Fərq — o skript ÖLÇÜR (5 breakpoint ×
// 10 səhifə, sürüşmə/toxunma hədəfi), bu skript isə SƏNƏDLƏŞDİRİR: tək
// breakpoint, 17 səth, README qalereyası. İkisi bir-birini əvəz etmir.
//
// ── DETERMİNİZM: DÖRD QAPI ─────────────────────────────────────────────────
// 1. SEED — skript başlamazdan əvvəl bazanın seed-dən gəldiyi yoxlanılır
//    (`assertSeedBaseline`): sabit `usr-001` ID-si və gözlənilən sətir sayları.
//    Seed özü `mulberry32` PRNG + sabit `NOW` işlədir, yəni iki icra = eyni baza.
// 2. SAAT — server tərəfi `scripts/freeze-clock.cjs` ilə, brauzer tərəfi
//    `context.clock.setFixedTime()` ilə eyni ana bağlanır. İkisi də lazımdır:
//    nisbi tarixlərin bir hissəsi server komponentində render olunur
//    (`FeedPreview`), bir hissəsi client-də (`PostCard`).
// 3. ANİMASİYA — `reducedMotion: "reduce"` (CSS keçidləri və Framer Motion
//    `prefers-reduced-motion`-a tabedir) + `screenshot({ animations: "disabled" })`
//    (kadr anında qalan hər animasiyanı son vəziyyətinə çəkir).
// 4. KUKİ — razılıq banneri `qu_cookie_consent=all` ilə əvvəlcədən bağlanır,
//    yoxsa hər səhifənin altında oturub məzmunu örtür. Bannerin ÖZÜ ayrıca
//    `SHOTS_CONSENT=0` ilə çəkilə bilər.
//
// ⚠️ BEŞİNCİ AMİL SKRİPTİN NƏZARƏTİNDƏ DEYİL: örtük şəkilləri seed-də
// `https://picsum.photos/seed/<açar>/…` kimi yazılıb. Ünvan seed açarına görə
// SABİT şəkil qaytarır (yəni məzmun deterministdir), amma İNTERNET tələb edir.
// Şəbəkə yoxdursa tədbir/cohort kartları şəkilsiz çəkilir — PNG-lər fərqlənir,
// düzəliş isə şəkil xidmətinin dəyişdirilməsidir, bu skriptin deyil.
//
// 🔴 ŞƏXSİ MƏLUMAT QAPISI (`scanForPersonalData`). Ekran görüntüləri repoya
// düşür və repo ictimai olacaq. Skript iki yerdən yoxlayır:
//   · BAZA — `User` cədvəlində real şəxsə aid ola biləcək dəyər varmı;
//   · PİKSEL — hər səhifənin görünən mətnində eyni yoxlama.
// Tapıntı varsa skript SIFIRDAN FƏRQLİ kodla çıxır və PNG-lər yazılsa da
// hesabatda 🔴 ilə işarələnir. Seed adları `MALE_FIRST_NAMES` /
// `FEMALE_FIRST_NAMES` / `LAST_NAME_STEMS` hovuzlarından qurulur, e-poçtlar
// `@qu.edu.az` / `@mail.az`, telefonlar `+994 5x …` şablonundadır — yəni
// hamısı UYDURMADIR.
//
// Mühit dəyişənləri:
//   SHOTS_BASE_URL   default http://127.0.0.1:3100
//   SHOTS_OUT_DIR    default docs/screenshots
//   SHOTS_ONLY       tək səhifə üçün açar (məs. SHOTS_ONLY=feed)
//   SHOTS_FULL_PAGE  "1" → tam səhifə (default: 1440×900 pəncərə kadrı)
//   SHOTS_CONSENT    "0" → kuki banneri GÖSTƏRİLİR
//   FIXED_NOW        brauzer saatı (server üçün eyni dəyər preload-a verilir)
//
// ⚠️ Skript YALNIZ OXUYUR — bazaya heç nə yazmır.
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_URL = process.env.SHOTS_BASE_URL ?? "http://127.0.0.1:3100";
const OUT_DIR = path.resolve(process.cwd(), process.env.SHOTS_OUT_DIR ?? "docs/screenshots");
const ONLY = process.env.SHOTS_ONLY ?? null;
const FULL_PAGE = process.env.SHOTS_FULL_PAGE === "1";
const SKIP_CONSENT = process.env.SHOTS_CONSENT !== "0";

/** `freeze-clock.cjs`-dəki default ilə EYNİ olmalıdır. */
const FIXED_NOW = process.env.FIXED_NOW ?? "2026-07-31T10:00:00.000Z";

/** KUDS §9 «Desktop» referans ölçüsü. */
const VIEWPORT = { width: 1440, height: 900 } as const;

const PASSWORD = process.env.SHOTS_PASSWORD ?? "Test1234!";

/**
 * İki hesab, çünki bir hesab 17 səthin hamısını MƏNALI göstərə bilmir.
 *
 * · `admin` — `UNIVERSITY_ADMIN`, mərhələsi STUDENT, sinfi
 *   `informasiya-tehlukesizliyi-2027` (65 paylaşım, 42 timeline sətri,
 *   19 nailiyyət). İdarə paneli və tələbə səthləri buradan çəkilir.
 * · `alumni` — `ALUMNI`, sinfi `maliyye-2022` (40 karyera qeydi, 15 xatirə).
 *
 * 🔴 XƏRİTƏ ADMİN HESABI İLƏ ÇƏKİLMİR və bu, məxfilik modelinin nəticəsidir,
 * zövq məsələsi deyil: `UNIVERSITY_ADMIN` başqa sinfin `CLASS` məzmununu
 * OXUMUR, aqreqasiya isə ayrıca `includeInStats` razılığı tələb edir. Admin
 * hesabının öz sinfində cəmi 12 karyera qeydi var və k-anonimlik (min 3)
 * xanaların çoxunu «Açıqlanmayan»a yığır — panel boş görünərdi. Yəni burada
 * seçim «daha dolu görünsün» deyil, «məhz həmin sinfin üzvü kimi bax»dır.
 */
const ACCOUNTS = {
  admin: { email: "admin@qu.edu.az", cohort: "informasiya-tehlukesizliyi-2027" },
  alumni: { email: "alumni@qu.edu.az", cohort: "maliyye-2022" },
} as const;

type AccountKey = keyof typeof ACCOUNTS;

interface ShotSpec {
  /** Fayl adının kökü — `docs/screenshots/<key>.png`. */
  key: string;
  /** README qalereyasında görünən başlıq. */
  title: string;
  /** Spesifikasiyadakı modul(lar). */
  module: string;
  /** Şablon yol — `{cohort}` hesabın əsas sinfi ilə əvəzlənir. */
  pathname: string;
  /** `null` → anonim ziyarətçi. */
  account: AccountKey | null;
  /** Kadrdan əvvəl icra olunan hazırlıq (tab açmaq, akkordeon genişləndirmək). */
  prepare?: (page: Page) => Promise<void>;
}

const SHOTS: ShotSpec[] = [
  {
    key: "01-welcome",
    title: "Açılış səhifəsi",
    module: "M1",
    pathname: "/",
    account: null,
  },
  {
    key: "02-faq",
    title: "Tez-tez verilən suallar",
    module: "M2",
    pathname: "/faq",
    account: null,
    // Akkordeon bağlı çəkilsə səhifə boş siyahı kimi görünür — ilk sual açılır.
    prepare: async (page) => {
      const first = page.getByRole("button", { name: /\?/ }).first();
      if (await first.count()) await first.click();
    },
  },
  {
    key: "03-khankendi",
    title: "Xankəndi bələdçisi",
    module: "M3",
    pathname: "/khankendi",
    account: null,
  },
  {
    key: "04-login",
    title: "Giriş",
    module: "—",
    pathname: "/login",
    account: null,
  },
  {
    key: "05-feed",
    title: "Sinif lenti",
    module: "M5",
    pathname: "/class/{cohort}/feed",
    account: "admin",
  },
  {
    key: "06-directory",
    title: "Sinif kataloqu",
    module: "M6",
    pathname: "/class/{cohort}/directory",
    account: "admin",
  },
  {
    key: "07-class-story",
    title: "Mənim sinif hekayəm",
    module: "M7",
    pathname: "/me",
    account: "admin",
  },
  {
    key: "08-timeline",
    title: "Sinif xronologiyası",
    module: "M8",
    pathname: "/class/{cohort}/timeline",
    account: "admin",
  },
  {
    key: "09-achievements",
    title: "Sinif nailiyyətləri",
    module: "M10",
    pathname: "/class/{cohort}/achievements",
    account: "admin",
  },
  {
    key: "10-memories",
    title: "Xatirələr",
    module: "M9",
    pathname: "/class/{cohort}/memories",
    account: "alumni",
  },
  {
    key: "11-events",
    title: "Tədbirlər",
    module: "M12",
    pathname: "/class/{cohort}/events",
    account: "admin",
  },
  {
    key: "12-map",
    title: "İndi haradayıq?",
    module: "M11",
    pathname: "/class/{cohort}/map",
    account: "alumni",
  },
  {
    key: "13-notifications",
    title: "Bildiriş mərkəzi",
    module: "M15",
    pathname: "/notifications",
    account: "admin",
  },
  {
    key: "14-privacy",
    title: "Məxfilik idarəetməsi",
    module: "M14",
    pathname: "/me/privacy",
    account: "admin",
  },
  {
    key: "15-admin-dashboard",
    title: "İdarə paneli",
    module: "M17",
    pathname: "/admin",
    account: "admin",
  },
  {
    key: "16-admin-moderation",
    title: "Şikayət moderasiyası",
    module: "M17",
    pathname: "/admin/moderation",
    account: "admin",
  },
  {
    key: "17-kuds",
    title: "KUDS stil bələdçisi",
    module: "KUDS v1.0",
    pathname: "/kuds",
    account: "admin",
  },
];

// ---------------------------------------------------------------------------
// Şəxsi məlumat qapısı
// ---------------------------------------------------------------------------

/**
 * Seed-in işlətdiyi YEGANƏ e-poçt domenləri. Bunlardan kənar hər ünvan
 * tapıntıdır: ya kod real bir ünvanı hardcode edib, ya da baza seed-dən deyil.
 */
const ALLOWED_EMAIL_DOMAINS = ["qu.edu.az", "mail.az"];

/**
 * Real şəxsə aid olduğu bilinən dəyərlər — repo sahibinin öz kimliyi
 * (`scripts/git-config.mjs` → `DEFAULT_AUTHOR`) və istifadəçi hesabları.
 *
 * ⚠️ Müəllif adı README-də və `docs/`-də QALIR (müəlliflik göstəricisidir);
 * qadağan olunan yer EKRAN GÖRÜNTÜSÜDÜR — orada görünsə demək ki, real
 * hesabla giriş edilib və şəxsi profil çəkilib.
 */
const PERSONAL_DENYLIST = [
  "heydarovelmeddin2@gmail.com",
  "Elmeddin Heydarov",
  "Elməddin Heydərov",
];

/** İstehlakçı poçt provayderləri — seed-də HEÇ BİRİ işlədilmir. */
const CONSUMER_MAIL = /@(gmail|yandex|mail\.ru|hotmail|outlook|icloud|yahoo|proton)\./i;

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

interface Leak {
  where: string;
  kind: string;
  value: string;
}

function scanText(where: string, text: string): Leak[] {
  const leaks: Leak[] = [];

  for (const needle of PERSONAL_DENYLIST) {
    if (text.includes(needle)) leaks.push({ where, kind: "denylist", value: needle });
  }

  for (const email of text.match(EMAIL_PATTERN) ?? []) {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (CONSUMER_MAIL.test(email)) {
      leaks.push({ where, kind: "istehlakçı-poçt", value: email });
    } else if (!ALLOWED_EMAIL_DOMAINS.some((allowed) => domain === allowed)) {
      leaks.push({ where, kind: "naməlum-domen", value: email });
    }
  }

  // Təkrarları at — eyni ünvan bir səhifədə onlarla dəfə görünə bilər.
  return leaks.filter(
    (leak, index, all) =>
      all.findIndex((other) => other.where === leak.where && other.value === leak.value) === index,
  );
}

/**
 * Bazadakı BÜTÜN istifadəçi sətirlərini yoxlayır.
 *
 * 🔴 Bu, piksel yoxlamasından GÜCLÜDÜR: ekran görüntüsündə görünməyən, amma
 * bazada oturan real dəyər sabah başqa səhifədə görünə bilər. Ona görə qapı
 * mənbədədir, təzahürdə deyil.
 */
async function scanDatabase(): Promise<Leak[]> {
  const users = await prisma.user.findMany({
    select: { email: true, personalEmail: true, phone: true, firstName: true, lastName: true },
  });

  const leaks: Leak[] = [];

  for (const user of users) {
    const blob = [user.email, user.personalEmail, `${user.firstName} ${user.lastName}`]
      .filter(Boolean)
      .join(" ");
    leaks.push(...scanText("baza:User", blob));

    // Telefon — seed şablonu `+994 5x xxx xx xx`. Fərqli forma tapıntıdır.
    if (user.phone && !/^\+994 5\d \d{3} \d{2} \d{2}$/.test(user.phone)) {
      leaks.push({ where: "baza:User", kind: "telefon-şablonu", value: user.phone });
    }
  }

  return leaks;
}

// ---------------------------------------------------------------------------
// Determinizm bazası
// ---------------------------------------------------------------------------

/**
 * Bazanın TƏZƏ seed-dən gəldiyini təsdiqləyir.
 *
 * Niyə lazımdır: skript işləyəndən sonra kimsə `/me/edit`-də bir sahə dəyişsə
 * növbəti icrada PNG-lər səssizcə fərqlənir və diff «kod dəyişdi» kimi oxunur.
 * Bu yoxlama həmin halı ERKƏN, şəkil çəkilməmişdən əvvəl tutur.
 */
async function assertSeedBaseline() {
  const first = await prisma.user.findUnique({
    where: { id: "usr-001" },
    select: { email: true },
  });

  if (!first) {
    throw new Error(
      "Baza seed-dən gəlmir (`usr-001` yoxdur). Əvvəlcə: npx prisma db seed",
    );
  }

  const counts = {
    user: await prisma.user.count(),
    cohort: await prisma.cohort.count(),
    post: await prisma.post.count(),
    memory: await prisma.memory.count(),
    achievement: await prisma.achievement.count(),
  };

  console.log(
    `• seed bazası: ${counts.user} istifadəçi · ${counts.cohort} sinif · ` +
      `${counts.post} paylaşım · ${counts.memory} xatirə · ${counts.achievement} nailiyyət`,
  );

  return counts;
}

// ---------------------------------------------------------------------------
// Brauzer
// ---------------------------------------------------------------------------

/**
 * Səhifənin oturduğunu təsdiqləyir.
 *
 * ⚠️ `networkidle` İŞLƏDİLMİR — Next.js prefetch-ləri fasiləsizdir və şərt heç
 * vaxt ödənmir. Şərt: `#main` görünür + skeleton qalmayıb (12C ilə eyni).
 */
async function settle(page: Page) {
  await page.locator("#main").waitFor({ state: "visible" });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await page.locator(".animate-pulse").count()) === 0) break;
    await page.waitForTimeout(250);
  }

  // Şrift yüklənməsi bitməsə ilk kadr fallback (Tahoma) ilə çəkilir.
  await page.evaluate(() => document.fonts.ready);
}

async function newShotContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { ...VIEWPORT },
    locale: "az-AZ",
    timezoneId: "Asia/Baku",
    // Qapı 3 — CSS keçidləri və Framer Motion `prefers-reduced-motion`-a tabedir.
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });

  // Qapı 2 (brauzer yarısı). `setFixedTime` YALNIZ oxunan vaxtı sabitləyir,
  // `setTimeout`/`setInterval` normal işləməyə davam edir — yəni React
  // hidrasiyası və TanStack Query dayanmır.
  await context.clock.setFixedTime(new Date(FIXED_NOW));

  // Qapı 4 — razılıq banneri.
  if (SKIP_CONSENT) {
    const { hostname } = new URL(BASE_URL);
    await context.addCookies([
      { name: "qu_cookie_consent", value: "all", domain: hostname, path: "/" },
    ]);
  }

  return context;
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

interface ShotResult {
  spec: ShotSpec;
  url: string;
  file: string;
  leaks: Leak[];
}

async function capture(page: Page, spec: ShotSpec, pathname: string): Promise<ShotResult> {
  await page.goto(`${BASE_URL}${pathname}`);
  await settle(page);

  if (spec.prepare) {
    await spec.prepare(page);
    await page.waitForTimeout(200);
  }

  const file = `${spec.key}.png`;
  await page.screenshot({
    path: path.join(OUT_DIR, file),
    fullPage: FULL_PAGE,
    // Qapı 3-ün ikinci yarısı: kadr anında qalan animasiyalar son vəziyyətə
    // çəkilir (CSS `animation`/`transition` — `reducedMotion` onları tam
    // dayandırmır, məsələn `animate-pulse` skeletonları).
    animations: "disabled",
  });

  // 🔴 Piksel yoxlaması `innerText` üzərindən gedir — yəni EKRANDA GÖRÜNƏN
  // mətn. `textContent` işlətsək `sr-only` və `display:none` qovluqları da
  // daxil olardı; onlar şəkildə YOXDUR, yəni yalançı tapıntı verərdi.
  const visible = await page.evaluate(() => document.body.innerText);
  const leaks = scanText(`ekran:${spec.key}`, visible);

  return { spec, url: pathname, file, leaks };
}

// ---------------------------------------------------------------------------
// Hesabat
// ---------------------------------------------------------------------------

function galleryMarkdown(results: ShotResult[], dbLeaks: Leak[]): string {
  const rows = results.map(
    (result) =>
      `| \`${result.spec.key}\` | ${result.spec.title} | ${result.spec.module} | ` +
      `\`${result.url}\` | ![${result.spec.title}](${result.file}) |`,
  );

  const allLeaks = [...dbLeaks, ...results.flatMap((result) => result.leaks)];

  const leakSection =
    allLeaks.length === 0
      ? [
          "**Tapıntı yoxdur** ✅ — nə bazada, nə də 17 ekranın görünən mətnində",
          "real şəxsə aid dəyər var. Bütün adlar seed-in ad hovuzlarından",
          "(`MALE_FIRST_NAMES` / `FEMALE_FIRST_NAMES` / `LAST_NAME_STEMS`)",
          "qurulub, e-poçtlar `@qu.edu.az` və `@mail.az` domenlərindədir,",
          "telefonlar `+994 5x xxx xx xx` şablonundandır — hamısı uydurmadır.",
        ].join("\n")
      : [
          "🔴 **TAPINTI VAR — bu ekran görüntüləri commit edilməməlidir.**",
          "",
          "| Yer | Növ | Dəyər |",
          "| --- | --- | --- |",
          ...allLeaks.map((leak) => `| \`${leak.where}\` | ${leak.kind} | \`${leak.value}\` |`),
        ].join("\n");

  return [
    "# Ekran görüntüləri — Blok 13B",
    "",
    "Bu qovluq `npm run shots` ilə YENİDƏN YARADILIR — fayllar əl ilə",
    "redaktə edilmir. Skript: [`scripts/screenshots.ts`](../../scripts/screenshots.ts).",
    "",
    "| Ölçü | Dəyər |",
    "| --- | --- |",
    `| Pəncərə | ${VIEWPORT.width}×${VIEWPORT.height} (KUDS §9 «Desktop») |`,
    `| Kadr | ${FULL_PAGE ? "tam səhifə" : "pəncərə"} · \`deviceScaleFactor: 1\` |`,
    `| Sabit an | \`${FIXED_NOW}\` (server + brauzer) |`,
    "| Animasiya | `prefers-reduced-motion: reduce` + `animations: \"disabled\"` |",
    `| Kuki banneri | ${SKIP_CONSENT ? "bağlı (`qu_cookie_consent=all`)" : "açıq"} |`,
    `| Ekran sayı | ${results.length} |`,
    "",
    "⚠️ Örtük şəkilləri seed-də `picsum.photos/seed/<açar>` ünvanındadır — açara",
    "görə sabit şəkil qaytarır, amma şəbəkə tələb edir. Oflayn icrada tədbir və",
    "cohort kartları şəkilsiz çəkilir.",
    "",
    "## Şəxsi məlumat yoxlaması",
    "",
    leakSection,
    "",
    "## Qalereya",
    "",
    "| Açar | Ekran | Modul | Yol | Görüntü |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const health = await fetch(`${BASE_URL}/api/v1/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `Server ${BASE_URL} ünvanında cavab vermir.\n` +
        "  Əvvəlcə: npm run build && npm run shots:serve",
    );
  }

  await assertSeedBaseline();

  const dbLeaks = await scanDatabase();
  if (dbLeaks.length > 0) {
    console.error(`🔴 Bazada ${dbLeaks.length} şəxsi məlumat tapıntısı:`);
    for (const leak of dbLeaks) console.error(`   ${leak.kind}: ${leak.value}`);
  }

  const specs = ONLY ? SHOTS.filter((spec) => spec.key.includes(ONLY)) : SHOTS;
  if (specs.length === 0) throw new Error(`SHOTS_ONLY="${ONLY}" heç bir ekrana uyğun gəlmədi.`);

  const browser = await chromium.launch();
  const results: ShotResult[] = [];

  try {
    // Hər hesab üçün BİR kontekst — 17 dəfə giriş etmək həm yavaşdır, həm də
    // `lastSeenAt` sütununu 17 dəfə yeniləyərdi (skript «yalnız oxuyur»
    // vədini pozardı).
    const contexts = new Map<AccountKey | "anon", { context: BrowserContext; page: Page }>();

    const acquire = async (account: AccountKey | null) => {
      const key = account ?? "anon";
      const existing = contexts.get(key);
      if (existing) return existing;

      const context = await newShotContext(browser);
      const page = await context.newPage();
      if (account) await login(page, ACCOUNTS[account].email);

      const entry = { context, page };
      contexts.set(key, entry);
      return entry;
    };

    try {
      for (const spec of specs) {
        const { page } = await acquire(spec.account);
        const cohort = spec.account ? ACCOUNTS[spec.account].cohort : "";
        const pathname = spec.pathname.replace("{cohort}", cohort);

        const result = await capture(page, spec, pathname);
        results.push(result);

        const flag = result.leaks.length > 0 ? ` 🔴 ${result.leaks.length} tapıntı` : "";
        console.log(`  ✓ ${result.file.padEnd(26)} ${pathname}${flag}`);
      }
    } finally {
      for (const { context } of contexts.values()) await context.close();
    }
  } finally {
    await browser.close();
  }

  const markdown = galleryMarkdown(results, dbLeaks);
  writeFileSync(path.join(OUT_DIR, "README.md"), markdown, "utf8");

  const leakCount = dbLeaks.length + results.reduce((total, r) => total + r.leaks.length, 0);
  console.log(`\n${results.length} ekran görüntüsü → ${path.relative(process.cwd(), OUT_DIR)}`);
  console.log(
    leakCount === 0
      ? "Şəxsi məlumat yoxlaması: TƏMİZ ✅"
      : `🔴 Şəxsi məlumat yoxlaması: ${leakCount} tapıntı — bax ${path.relative(process.cwd(), OUT_DIR)}/README.md`,
  );

  if (leakCount > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
