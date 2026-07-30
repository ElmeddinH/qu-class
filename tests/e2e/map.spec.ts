// ============================================================================
// tests/e2e/map.spec.ts
// Blok 10B DoD — "İndi haradayıq?" [M11] (spec §13).
//
// Yoxlanılır:
//   · sol menyudaki «İndi haradayıq?» linki 404 VERMİR (route `/map`-dir)
//   · dünya xəritəsi REAL render olunur (SVG `path` sayı > 0)
//   · 🔴 pin tooltip-ində HEÇ BİR istifadəçi adı yoxdur — seed adları səhifə
//     mətnində AXTARILIR və TAPILMAMALIDIR
//   · səkkiz tab URL-i dəyişir və məzmun yenilənir
//   · hər xəritənin cədvəl alternativi açılır (KUDS §21 / WCAG 2.2)
//   · razılıq bildirişi və «sənin məlumatın…» sətri görünür
//   · anonim brauzer nə səhifəni, nə v1 endpoint-ini görür
//
// 🔴 TƏLƏ T16: anonim yoxlama üçün `browser.newContext()` — `clearCookies()`
// kifayət etmir.
// 🔴 TƏLƏ T19: tab dəyişəndə məzmun CLIENT tərəfdə yenilənir; `expect.poll`
// ilə gözlənilir (Radix `TabsContent` mount olunana qədər).
//
// ⚠️ Test HEÇ NƏ YAZMIR — yalnız oxuyur. Seed determinizmi pozulmur.
// ⚠️ Bu fayl seed məlumatına ARXALANIR: `npm run db:seed` işlədilməlidir.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
/** Məzun sinfi (Maliyyə 2022) — karyera statistikası məhz orada var. */
const ALUMNI_EMAIL = "alumni@qu.edu.az";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

async function primaryCohortOf(email: string): Promise<{ slug: string; cohortId: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      memberships: {
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { cohortId: true, cohort: { select: { slug: true } } },
      },
    },
  });

  const membership = user.memberships[0];
  return { slug: membership.cohort.slug, cohortId: membership.cohortId };
}

let slug: string;
let cohortId: string;

test.beforeAll(async () => {
  ({ slug, cohortId } = await primaryCohortOf(ALUMNI_EMAIL));
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Route və naviqasiya
// ---------------------------------------------------------------------------

test("sol menyudaki «İndi haradayıq?» linki 404 vermir", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}`);

  const link = page.getByRole("link", { name: "İndi haradayıq?" }).first();
  await expect(link).toBeVisible();

  // 🔴 Link `nav.ts`-də `${base}/map`-dir. Səhifə başqa ünvanda yaradılsaydı
  // bu klik 404 gətirərdi — sinif üçün "sayt sınıb" deməkdir.
  await expect(link).toHaveAttribute("href", `/class/${slug}/map`);
  await link.click();
  await page.waitForURL(`**/class/${slug}/map`);

  await expect(page.getByRole("heading", { level: 1, name: "İndi haradayıq?" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Xəritə render olunur
// ---------------------------------------------------------------------------

test("dünya xəritəsi render olunur (SVG path > 0) və pinləri var", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);

  const map = page.getByTestId("world-map");
  await expect(map).toBeVisible();

  // Topologiya OFLAYN gəlir (`world-atlas` paketi) — CDN sorğusu yoxdur.
  await expect
    .poll(async () => map.locator("svg path").count(), { timeout: 15_000 })
    .toBeGreaterThan(50);

  // Şəhər markerləri: `Marker` `<g class="rsm-marker">` render edir.
  await expect.poll(async () => map.locator("g.rsm-marker").count()).toBeGreaterThan(0);

  // Marker klaviatura ilə fokuslana bilir (əlçatanlıq tələbi).
  const firstPin = map.locator("g.rsm-marker").first();
  await expect(firstPin).toHaveAttribute("tabindex", "0");
  await firstPin.focus();
  await expect(page.getByTestId("world-map")).toBeVisible();
});

test("Azərbaycan xəritəsi ayrıca tabda render olunur", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map?tab=azerbaijan`);

  const map = page.getByTestId("azerbaijan-map");
  await expect(map).toBeVisible();
  await expect
    .poll(async () => map.locator("svg path").count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect.poll(async () => map.locator("g.rsm-marker").count()).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 2b. Zoom / pan — Blok 12B
//
// 🔴 SUAL: yaxınlaşdırma YALNIZ siçan təkəri ilə deyil, KLAVİATURA ilə də
// mümkündürmü? `ZoomableGroup` d3-zoom işlədir və d3-zoom heç bir düymə
// hadisəsinə qulaq asmır — ona görə «+ / − / sıfırla» əsl `<button>` olmalıdır
// (WCAG 2.1.1). Test məhz klaviatura yolunu ölçür.
// ---------------------------------------------------------------------------

/** `ZoomableGroup` `transform="translate(x y) scale(k)"` yazır — `k` oxunur. */
async function zoomScaleOf(map: import("@playwright/test").Locator): Promise<number> {
  const transform = await map.locator("g.rsm-zoomable-group").getAttribute("transform");
  const match = /scale\(([\d.]+)\)/.exec(transform ?? "");
  return match ? Number(match[1]) : Number.NaN;
}

test("xəritə klaviatura düymələri ilə yaxınlaşır, uzaqlaşır və sıfırlanır", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);

  const map = page.getByTestId("world-map");
  await expect(map).toBeVisible();
  await expect.poll(async () => map.locator("g.rsm-zoomable-group").count()).toBe(1);

  const zoomIn = page.getByRole("button", { name: "Yaxınlaşdır" });
  const zoomOut = page.getByRole("button", { name: "Uzaqlaşdır" });
  const reset = page.getByRole("button", { name: "Sıfırla" });

  // Başlanğıc: miqyas 1, «uzaqlaşdır» və «sıfırla» PASSİVDİR (aşağı hədd).
  await expect.poll(() => zoomScaleOf(map)).toBe(1);
  await expect(zoomOut).toBeDisabled();
  await expect(reset).toBeDisabled();

  // 🔴 Klaviatura yolu: Enter ilə (siçan kliki deyil).
  await zoomIn.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => zoomScaleOf(map)).toBeGreaterThan(1);
  await expect(zoomOut).toBeEnabled();
  await expect(reset).toBeEnabled();

  const afterZoomIn = await zoomScaleOf(map);

  await zoomOut.click();
  await expect.poll(() => zoomScaleOf(map)).toBeLessThan(afterZoomIn);

  await zoomIn.click();
  await zoomIn.click();
  await reset.click();
  await expect.poll(() => zoomScaleOf(map)).toBe(1);
  await expect(reset).toBeDisabled();
});

test("zoom hüdudları [1, 8] aşılmır", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map?tab=azerbaijan`);

  const map = page.getByTestId("azerbaijan-map");
  await expect(map).toBeVisible();
  await expect.poll(async () => map.locator("g.rsm-zoomable-group").count()).toBe(1);

  const zoomIn = page.getByRole("button", { name: "Yaxınlaşdır" });

  // Yuxarı hədd: addım 1.6×, yəni 1 → 8 üçün 5 klik bəs edir. Artıq klikləmək
  // 8-i AŞMAMALIDIR və düymə passivləşməlidir.
  for (let index = 0; index < 8; index += 1) {
    if (await zoomIn.isDisabled()) break;
    await zoomIn.click();
  }

  await expect(zoomIn).toBeDisabled();
  await expect.poll(() => zoomScaleOf(map)).toBeLessThanOrEqual(8);
  await expect.poll(() => zoomScaleOf(map)).toBeGreaterThan(4);
});

// ---------------------------------------------------------------------------
// 2c. Donut kontrastı — Blok 12B
//
// 🔴 SUAL: bitişik dilimlər YALNIZ rənglə fərqlənirmi? Cavab "xeyr" olmalıdır:
// faiz etiketi, leqenda (ad + say + faiz) və hover/fokus vurğusu — üç ayrı
// kanal. Rənglərin özü də `--slice-*` tokenlərindən gəlir (hardcode hex yox).
// ---------------------------------------------------------------------------

test("donut dilimləri rəngdən başqa kanallarla da fərqlənir", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map?tab=industries`);

  const donut = page.locator("svg .recharts-pie");
  await expect(donut).toBeVisible();

  // 1. Hər dilimin ÜZƏRİNDƏ faiz etiketi.
  const sliceCount = await page.locator("svg .recharts-pie-sector").count();
  expect(sliceCount).toBeGreaterThan(0);

  const labels = page.locator("svg .recharts-pie-label-text");
  await expect.poll(async () => labels.count()).toBe(sliceCount);
  await expect(labels.first()).toHaveText(/^\d+%$/);

  // 2. Leqenda: hər dilim üçün klaviatura ilə gəzilə bilən düymə.
  const legendButtons = page.locator("button[aria-pressed]");
  await expect.poll(async () => legendButtons.count()).toBe(sliceCount);
  // Ad + say + faiz — rəngdən tam asılı olmayan kanal.
  await expect(legendButtons.first()).toHaveText(/\d+ · \d+%$/);

  // 3. 🔴 Dilim rəngləri TOKEN-dəndir (CLAUDE.md §2 — hardcode hex yoxdur).
  const fills = await page.locator("svg .recharts-pie-sector path").evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute("fill") ?? ""),
  );
  expect(fills.length).toBeGreaterThan(0);
  for (const fill of fills) expect(fill).toMatch(/^var\(--slice-\d\)$/);
  // Hər dilim FƏRQLİ pillədədir — təkrarlanan ton ayırdedilməni sıfırlayardı.
  expect(new Set(fills).size).toBe(fills.length);

  // 4. Fokus vurğusu: Tab ilə leqendaya girəndə dilimin konturu qalınlaşır.
  const firstSlice = page.locator("svg .recharts-pie-sector path").first();
  await expect(firstSlice).toHaveAttribute("stroke-width", "2");

  await legendButtons.first().focus();
  await expect(firstSlice).toHaveAttribute("stroke-width", "4");
  // Qalan dilimlər sönükləşir — vurğu tək əlamətlə verilmir.
  if (sliceCount > 1) {
    await expect(page.locator("svg .recharts-pie-sector path").nth(1)).toHaveAttribute(
      "fill-opacity",
      "0.45",
    );
  }

  // Klik vurğunu SABİTLƏYİR (toxunma cihazında hover yoxdur).
  await legendButtons.first().click();
  await expect(legendButtons.first()).toHaveAttribute("aria-pressed", "true");
  await legendButtons.first().click();
  await expect(legendButtons.first()).toHaveAttribute("aria-pressed", "false");
});

// ---------------------------------------------------------------------------
// 3. 🔴 MƏXFİLİK SƏRHƏDİ — ad sızmır
// ---------------------------------------------------------------------------

test("🔴 səhifədə HEÇ BİR sinif yoldaşının adı görünmür", async ({ page }) => {
  // Statistikaya düşən REAL istifadəçilərin adlarını bazadan götürürük —
  // sabit ad siyahısı seed dəyişəndə köhnələrdi.
  const respondents = await prisma.careerEntry.findMany({
    where: {
      isCurrent: true,
      includeInStats: true,
      user: { memberships: { some: { cohortId } } },
    },
    select: { user: { select: { firstName: true, lastName: true } } },
  });

  expect(respondents.length, "statistikada respondent yoxdur — test mənasızdır").toBeGreaterThan(0);

  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);
  await expect(page.getByTestId("world-map")).toBeVisible();

  // Bütün tabları gəzirik — ad HEÇ BİR görünüşdə olmamalıdır.
  const tabs = [
    "world",
    "azerbaijan",
    "cities",
    "countries",
    "companies",
    "industries",
    "functions",
    "education",
  ];

  const names = new Set(
    respondents.flatMap((row) => [row.user.firstName, row.user.lastName]),
  );

  for (const tab of tabs) {
    await page.goto(`/class/${slug}/map?tab=${tab}`);
    // Panelin yüklənməsini gözləyirik (skeleton keçsin).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const text = (await page.locator("main").innerText()).toLowerCase();

    for (const name of names) {
      // ⚠️ SÖZ SƏRHƏDİ ÜÇÜN `\b` İŞLƏMİR: JS-də `\w` = [A-Za-z0-9_], yəni
      // «ş», «ə», «ı» hərfləri SƏRHƏD sayılır. Nəticədə «yaşayan» sözü
      // «Ayan» adına uyğun gəlirdi (ş-dan sonra `\b` var) və test YALANDAN
      // qırılırdı. Unicode hərf sinifləri ilə lookaround düzgün nəticə verir.
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${name.toLowerCase()}(?![\\p{L}\\p{N}])`,
        "u",
      );
      expect(
        pattern.test(text),
        `«${name}» adı «${tab}» görünüşündə göründü — xəritə insan izləyicisinə çevrilir`,
      ).toBe(false);
    }
  }
});

test("🔴 pin tooltip-i yalnız şəhər, say və vəzifə bölgüsü göstərir", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);

  const map = page.getByTestId("world-map");
  await expect(map).toBeVisible();
  await expect.poll(async () => map.locator("g.rsm-marker").count()).toBeGreaterThan(0);

  const pin = map.locator("g.rsm-marker").first();
  const label = (await pin.getAttribute("aria-label")) ?? "";

  // Forma: «Şəhər, Ölkə — N nəfər[ · N rol…]»
  expect(label).toMatch(/ — \d+ nəfər/);
  // Profil linki və şirkət–şəxs bağı YOXDUR.
  expect(label).not.toContain("/u/");
  expect(label).not.toMatch(/@/);

  // ⚠️ `hover()` İŞLƏMİR: dünya miqyasında Bakı və Xankəndi pinləri üst-üstə
  // düşür və Playwright «başqa element pointer hadisəsini tutur» deyib dayanır.
  // `focus()` həm daha stabildir, həm də əsl tələbi yoxlayır — marker
  // KLAVİATURA ilə açılmalıdır (komponent `onFocus`-u da idarə edir).
  await pin.focus();

  // Detal paneli açılır və eyni məzmunu göstərir.
  await expect(page.getByText(/\d+ nəfər/).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Səkkiz tab + URL vəziyyəti
// ---------------------------------------------------------------------------

test("səkkiz tab URL-i dəyişir və məzmun yenilənir", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);

  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(8);

  // Default görünüş URL-də YAZILMIR (link təmiz qalsın).
  expect(new URL(page.url()).searchParams.get("tab")).toBeNull();

  const cases: Array<{ name: string; param: string; heading: string }> = [
    { name: "Şəhərlər", param: "cities", heading: "Şəhərlər üzrə paylanma" },
    { name: "Ölkələr", param: "countries", heading: "Ölkələr üzrə paylanma" },
    { name: "Şirkətlər", param: "companies", heading: "İşəgötürənlər üzrə statistika" },
    { name: "Sənaye", param: "industries", heading: "Fəaliyyət sahələri" },
    { name: "Vəzifələr", param: "functions", heading: "Vəzifə istiqamətləri" },
    { name: "Təhsil", param: "education", heading: "Təhsil pillələri" },
  ];

  for (const item of cases) {
    await page.getByRole("tab", { name: item.name }).click();

    // 🔴 T19: URL client tərəfdə yazılır — dərhal oxumaq köhnə dəyəri verir.
    await expect
      .poll(() => new URL(page.url()).searchParams.get("tab"))
      .toBe(item.param);

    await expect(page.getByRole("heading", { level: 2, name: item.heading })).toBeVisible();
  }
});

test("paylaşılan `?tab=` linki birbaşa həmin görünüşü açır", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map?tab=education`);

  await expect(
    page.getByRole("heading", { level: 2, name: "Təhsil pillələri" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Təhsil" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

// ---------------------------------------------------------------------------
// 5. Əlçatanlıq — cədvəl alternativi
// ---------------------------------------------------------------------------

test("hər xəritənin və qrafikin cədvəl alternativi açılır", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);

  for (const tab of ["world", "azerbaijan", "cities", "industries", "education"]) {
    await page.goto(`/class/${slug}/map?tab=${tab}`);

    const summary = page.getByText("Cədvəl kimi göstər").first();
    await expect(summary).toBeVisible();

    // Açılmamış: cədvəl DOM-da var, amma görünmür (`<details>`).
    await summary.click();

    const table = page.locator("table").first();
    await expect(table).toBeVisible();
    // Cəm sətri məxfilik mexanizmini yoxlanabilən edir.
    await expect(table.getByText("Cəmi")).toBeVisible();
    await expect(table.getByText("Açıqlanmayan")).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// 6. Razılıq şəffaflığı
// ---------------------------------------------------------------------------

test("razılıq bildirişi və «sənin məlumatın…» sətri görünür", async ({ page }) => {
  await login(page, ALUMNI_EMAIL);
  await page.goto(`/class/${slug}/map`);

  await expect(
    page.getByText(/yalnız aqreqasiyaya razılıq verən üzvlərin/i),
  ).toBeVisible();
  await expect(page.getByText(/üzvdən \d+-i razılıq verib/)).toBeVisible();

  const participation = page.getByTestId("viewer-participation");
  await expect(participation).toBeVisible();
  await expect(participation).toHaveText(/iştirak (edir|etmir)/);

  // Gizlədilmiş qrupların səbəbi AÇIQ yazılır (səssizcə atılmır).
  await expect(page.getByText(/nəfərdən az olan qruplar məxfilik üçün/)).toBeVisible();

  // Razılığı dəyişmək üçün birbaşa yol var.
  await expect(page.getByRole("link", { name: /Karyera məlumatım/ })).toHaveAttribute(
    "href",
    "/me/career",
  );
});

// ---------------------------------------------------------------------------
// 7. Anonim giriş bağlıdır
// ---------------------------------------------------------------------------

test("anonim brauzer nə səhifəni, nə v1 endpoint-ini görür", async ({ browser }: { browser: Browser }) => {
  // 🔴 T16: təmiz kontekst — `clearCookies()` kifayət etmir.
  const context = await browser.newContext();

  try {
    const page = await context.newPage();
    await page.goto(`/class/${slug}/map`);
    // Middleware `/class` prefiksini qoruyur → `/login`-ə yönləndirir.
    await page.waitForURL(/\/login/);

    const response = await context.request.get(
      `/api/v1/cohorts/${slug}/stats/where-are-we-now`,
    );
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"]).toContain("application/json");

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
  } finally {
    await context.close();
  }
});
