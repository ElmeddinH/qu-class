// ============================================================================
// tests/e2e/public.spec.ts
// Blok 11A DoD — İCTİMAİ SƏTHİN tam yoxlanışı.
//
// 🔴 FAYLIN ÜÇ ƏSAS SUALI:
//   1. ANONİM brauzerdə hər ictimai route 200 verirmi və HEÇ BİRİ `/login`-ə
//      atmırmı? (route icazə məntiqinə müdaxilənin e2e ölçüsü)
//   2. GİRİŞ ETMİŞ brauzerdə EYNİ yollar açılırmı? (ictimai səhifə istifadəçini
//      QOVMAMALIDIR — 2026-07-30 yönləndirmə dövrəsinin e2e qarşılığı)
//   3. Anonim səhifələrdə seed-dəki CLASS məzmun TAPILMIRmı?
//
// 🔴 TƏLƏ T16: anonim yoxlama üçün `browser.newContext()` — `clearCookies()`
// kifayət etmir (sessiya kukisi başqa anbarda qala bilir).
//
// ⚠️ TƏLƏ T31: JS `\b` azərbaycan hərflərində SƏHV işləyir (`ş`, `ə`, `ı` söz
// sərhədi sayılır). Ad/başlıq axtarışında `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`
// + `u` bayrağı işlədilir.
//
// ⚠️ Fayl YALNIZ OXUYUR — kuki razılığı testi istisna olmaqla heç bir sətir
// yaratmır; həmin test də öz `newContext()`-ində qalır və bazaya toxunmur.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { PUBLIC_PAGE_PATHS } from "../../src/lib/routes";
import { FOOTER_NAV, PUBLIC_NAV } from "../../src/layouts/nav";
import { LEGAL_PAGES } from "../../src/lib/content-routes";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const MEMBER_EMAIL = "rep@qu.edu.az";

/** Dinamik yolların konkret nümunəsi — SEED-dən oxunur, hardcode DEYİL. */
let facultySlug: string;
let placeId: string;

/** Bütün ictimai yollar (statik + dinamik nümunələr). */
function allPublicPaths(): string[] {
  return [
    ...PUBLIC_PAGE_PATHS,
    `/faculties/${facultySlug}`,
    `/khankendi/${placeId}`,
    ...LEGAL_PAGES.map((page) => `/legal/${page.slug}`),
  ];
}

test.beforeAll(async () => {
  const [faculty, place] = await Promise.all([
    prisma.faculty.findFirstOrThrow({ select: { slug: true } }),
    prisma.guidePlace.findFirstOrThrow({ select: { id: true } }),
  ]);

  facultySlug = faculty.slug;
  placeId = place.id;
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
async function anonymousPage(browser: Browser): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

// ---------------------------------------------------------------------------
// 1. Anonim əlçatanlıq
// ---------------------------------------------------------------------------

test("🔴 ANONİM brauzerdə hər ictimai route 200 verir və /login-ə ATMIR", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    for (const path of allPublicPaths()) {
      const response = await page.goto(path);

      expect(response?.status(), `${path} statusu`).toBe(200);
      // 🔴 Yönləndirmə olsaydı URL `/login`-ə dəyişərdi.
      expect(new URL(page.url()).pathname, `${path} yönləndirildi`).toBe(path);
    }
  } finally {
    await close();
  }
});

test("🔴 GİRİŞ ETMİŞ brauzerdə də EYNİ yollar açılır (istifadəçi qovulmur)", async ({
  page,
}) => {
  await login(page, MEMBER_EMAIL);

  for (const path of allPublicPaths()) {
    const response = await page.goto(path);

    expect(response?.status(), `${path} statusu`).toBe(200);
    // Bu, yönləndirmə dövrəsi testinin e2e qarşılığıdır: ictimai səhifə giriş
    // etmiş istifadəçini `/home`-a atmamalıdır.
    expect(new URL(page.url()).pathname, `${path} → ${page.url()}`).toBe(path);
  }
});

test("hər ictimai səhifədə TƏK bir <h1> var", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    for (const path of allPublicPaths()) {
      // `/docs` Swagger UI-dir — öz başlıq quruluşu var, kənarda saxlanılır.
      if (path === "/docs") continue;

      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    }
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 2. Naviqasiya — heç bir link 404 vermir
// ---------------------------------------------------------------------------

test("PUBLIC_NAV və FOOTER_NAV-dakı HEÇ BİR link 404 vermir", async ({ browser }) => {
  const links = [
    ...PUBLIC_NAV.map((item) => item.href),
    ...FOOTER_NAV.flatMap((section) => section.items.map((item) => item.href)),
  ];
  const unique = [...new Set(links)];

  const { page, close } = await anonymousPage(browser);

  try {
    for (const href of unique) {
      const response = await page.goto(href);
      expect(response?.status(), `${href} statusu`).toBe(200);
    }
  } finally {
    await close();
  }

  // Anchor dövrü bitdi — naviqasiya artıq REAL səhifələrə baxır (Blok 11A).
  expect(unique.some((href) => href.startsWith("/#"))).toBe(false);
});

test("footer-də DÖRD sütun var və hüquqi sənədlər siyahıdadır", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");

    for (const section of FOOTER_NAV) {
      await expect(
        page.getByRole("heading", { name: section.title!, exact: true }),
        section.title!,
      ).toBeVisible();
    }

    expect(FOOTER_NAV).toHaveLength(4);

    for (const legal of LEGAL_PAGES) {
      await expect(
        page.getByRole("link", { name: legal.label, exact: true }).first(),
        legal.label,
      ).toBeVisible();
    }
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 3. 🔴 SIZMA — anonim səhifələrdə CLASS məzmun YOXDUR
// ---------------------------------------------------------------------------

/** TƏLƏ T31 — azərbaycan hərflərində `\b` işləmir. */
function wholePhrase(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
}

test("🔴 anonim ictimai səhifələrdə seed-dəki CLASS paylaşımın mətni TAPILMIR", async ({
  browser,
}) => {
  // 🔴 NEEDLE YALNIZ CLASS-A MƏXSUS OLMALIDIR. Seed gövdələri sabit hovuzdan
  // (`POST_BODIES[category]`) dövrə ilə seçilir, yəni eyni mətn həm CLASS, həm
  // PUBLIC paylaşımda ola bilər. «Bir CLASS postun ilk cümləsi» götürülsəydi
  // test PUBLIC nüsxəni görüb YALANDAN qırılardı — sızma olmadığı halda.
  const [classPosts, publicPosts] = await Promise.all([
    prisma.post.findMany({
      where: { visibility: "CLASS", status: "ACTIVE", body: { not: null } },
      select: { body: true },
    }),
    prisma.post.findMany({
      where: { visibility: "PUBLIC", status: "ACTIVE", body: { not: null } },
      select: { body: true },
    }),
  ]);

  const publicBodies = publicPosts.map((post) => post.body as string);

  const needle = classPosts
    .map((post) => (post.body as string).split(/[.!?\n]/)[0].trim().slice(0, 60))
    .find(
      (candidate) =>
        candidate.length > 20 && !publicBodies.some((body) => body.includes(candidate)),
    );

  expect(needle, "yalnız CLASS-a məxsus mətn tapılmadı").toBeTruthy();

  const { page, close } = await anonymousPage(browser);

  try {
    for (const path of ["/", "/events", "/khankendi", `/khankendi/${placeId}`]) {
      await page.goto(path);
      const content = await page.content();
      expect(content.includes(needle!), `${path} səhifəsində CLASS post mətni var`).toBe(
        false,
      );
    }
  } finally {
    await close();
  }
});

test("🔴 anonim bələdçi səhifəsində CLASS XATİRƏNİN başlığı TAPILMIR", async ({
  browser,
}) => {
  // M9 ↔ M3 körpüsünün sızma testi: `PlaceMemories` ictimai səhifədədir.
  const classMemory = await prisma.memory.findFirstOrThrow({
    where: { guidePlaceId: { not: null }, visibility: "CLASS", status: "ACTIVE" },
    select: { title: true, guidePlaceId: true },
  });

  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto(`/khankendi/${classMemory.guidePlaceId}`);

    // Bölmə RENDER OLUNUR (başlıq görünür) — məzmun isə süzülüb.
    await expect(
      page.getByRole("heading", { name: /bu yer haqqında xatirələri/i }),
    ).toBeVisible();

    const content = await page.content();
    expect(
      wholePhrase(classMemory.title).test(content),
      "CLASS xatirənin başlığı ictimai səhifədə görünür",
    ).toBe(false);
  } finally {
    await close();
  }
});

test("🔴 /events YALNIZ ictimai tədbirləri göstərir", async ({ browser }) => {
  const hidden = await prisma.event.findFirstOrThrow({
    where: { visibility: "CLASS", status: { in: ["PUBLISHED", "COMPLETED"] } },
    select: { title: true },
  });

  const publicEvent = await prisma.event.findFirst({
    where: { visibility: "PUBLIC", status: { in: ["PUBLISHED", "COMPLETED"] } },
    select: { title: true },
  });

  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/events");
    let content = await page.content();
    expect(wholePhrase(hidden.title).test(content), "CLASS tədbir görünür").toBe(false);

    await page.goto("/events?when=past");
    content = await page.content();
    expect(wholePhrase(hidden.title).test(content), "arxivdə CLASS tədbir").toBe(false);

    // PUBLIC tədbir HƏQİQƏTƏN görünür — bölmə işləyir (yalançı yaşıl deyil).
    if (publicEvent) {
      await page.goto("/events");
      const upcomingHas = wholePhrase(publicEvent.title).test(await page.content());
      await page.goto("/events?when=past");
      const pastHas = wholePhrase(publicEvent.title).test(await page.content());

      expect(upcomingHas || pastHas, "heç bir PUBLIC tədbir görünmür").toBe(true);
    }
  } finally {
    await close();
  }
});

test("anonim istifadəçi tədbir DETALINDA /login-ə yönləndirilir (qərar)", async ({
  browser,
}) => {
  // `/events` AÇIQ, `/events/<id>` isə QORUNUR (RSVP + iştirakçı siyahısı).
  const event = await prisma.event.findFirstOrThrow({
    where: { visibility: "PUBLIC", status: "PUBLISHED" },
    select: { id: true },
  });

  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto(`/events/${event.id}`);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 4. Məzmun səhifələri
// ---------------------------------------------------------------------------

test("/khankendi 11 kateqoriya, xəritə və təcili bölmə göstərir", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/khankendi");

    await expect(page.getByRole("heading", { name: "Təcili əlaqə" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Xəritə və vacib nöqtələr" }),
    ).toBeVisible();

    // Kateqoriya filtri URL-dədir və paylaşıla biləndir.
    await page.goto("/khankendi?category=TRANSPORT");
    await expect(
      page.getByRole("heading", { name: "İctimai nəqliyyat", exact: true }),
    ).toBeVisible();
    // Filtr işləyir: başqa kateqoriyanın başlığı YOXDUR.
    await expect(page.getByRole("heading", { name: "Sağlamlıq", exact: true })).toHaveCount(
      0,
    );
  } finally {
    await close();
  }
});

test("/faculties → fakültə səhifəsinə keçid işləyir, ÜZV SAYI göstərilmir", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/faculties");
    await expect(
      page.getByRole("heading", { name: "Fakültələr və ixtisaslar" }),
    ).toBeVisible();

    await page.goto(`/faculties/${facultySlug}`);
    await expect(page.getByRole("heading", { name: "İxtisaslar" })).toBeVisible();

    // 🔴 AQREQASİYA QAYDASI: struktur rəqəmi var, üzv sayı YOXDUR.
    const content = await page.content();
    expect(content).toContain("açıq sinif");
    expect(/\d+\s*(tələbə|üzv)\b/u.test(content)).toBe(false);
  } finally {
    await close();
  }
});

test("/faq axtarış və kateqoriya filtri URL-də işləyir", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/faq?category=CAMPUS");
    await expect(page.getByRole("heading", { name: "Kampus", exact: true })).toBeVisible();

    await page.getByLabel("Suallarda axtar").fill("kitabxana");
    await page.getByRole("button", { name: "Axtar" }).click();

    await page.waitForURL(/q=kitabxana/);
    // Kateqoriya İTMİR — axtarış onu sıfırlamamalıdır.
    expect(page.url()).toContain("category=CAMPUS");
  } finally {
    await close();
  }
});

test("/newcomers bölmə anchor-ları ilə render olunur", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/newcomers");

    await expect(page.getByRole("navigation", { name: "Bu səhifədə" })).toBeVisible();

    const pages = await prisma.contentPage.findMany({
      where: { section: "NEWCOMERS", isPublished: true },
      select: { slug: true },
    });

    for (const entry of pages) {
      await expect(page.locator(`#${entry.slug}`), entry.slug).toHaveCount(1);
    }
  } finally {
    await close();
  }
});

test("/accessibility anonimə bəyanatı göstərir, formanı GİZLƏDİR", async ({
  browser,
  page,
}) => {
  const { page: anon, close } = await anonymousPage(browser);

  try {
    await anon.goto("/accessibility");
    await expect(anon.getByRole("heading", { name: "Əlçatanlıq bəyanatı" })).toBeVisible();
    await expect(anon.getByRole("heading", { name: "Bilinən məhdudiyyətlər" })).toBeVisible();

    // Anonim halda forma YOXDUR — əvəzində giriş çağırışı var.
    await expect(anon.getByLabel("Maneəni təsvir edin")).toHaveCount(0);
    await expect(anon.getByRole("link", { name: "Daxil ol" }).first()).toBeVisible();
  } finally {
    await close();
  }

  // Giriş etmiş istifadəçi FORMANI görür.
  await login(page, MEMBER_EMAIL);
  await page.goto("/accessibility");
  await expect(page.getByLabel("Maneəni təsvir edin")).toBeVisible();
});

test("/legal/<slug> dörd sənəd arasında keçid verir", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/legal/privacy");
    await expect(page.getByRole("heading", { name: "Məxfilik bildirişi" })).toBeVisible();

    await page.getByRole("link", { name: "İstifadə şərtləri" }).first().click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
    await expect(page.getByRole("heading", { name: "İstifadə şərtləri" })).toBeVisible();
  } finally {
    await close();
  }
});

test("naməlum hüquqi slug 404 verir", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    // 🔴 Adi məzmun səhifəsi `/legal/` altında GÖSTƏRİLMƏMƏLİDİR (ağ siyahı).
    const response = await page.goto("/legal/kampus-heyati");
    expect(response?.status()).toBe(404);
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 5. 🔴 KUKİ RAZILIĞI (TƏLƏ E)
// ---------------------------------------------------------------------------

test("🔴 kuki banneri ilk ziyarətdə görünür, «Hamısını qəbul et»dən sonra YENİLƏMƏDƏ görünmür", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");

    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: "Hamısını qəbul et" }).click();
    await expect(banner).toHaveCount(0);

    // 🔴 ƏSL YOXLAMA: YENİLƏMƏDƏN sonra banner HTML-ə ÜMUMİYYƏTLƏ düşmür.
    // `localStorage` ilə saxlansaydı server komponenti onu oxuya bilməzdi və
    // banner bir anlıq görünərdi (hidrasiya sıçrayışı).
    await page.reload();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    // Başqa səhifədə də görünmür.
    await page.goto("/khankendi");
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    // Kuka həqiqətən yazılıb (localStorage YOX).
    const cookies = await page.context().cookies();
    const consent = cookies.find((cookie) => cookie.name === "qu_cookie_consent");
    expect(consent?.value).toBe("all");
    expect(consent?.sameSite).toBe("Lax");
  } finally {
    await close();
  }
});

test("«Rədd et» də banneri bağlayır və seçimi saxlayır", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Rədd et" }).click();
    await page.reload();

    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "qu_cookie_consent")?.value).toBe("necessary");
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 5b. «Seçimlər» ekranı (Blok 12B · GW-ANALİZ §1.1 №17)
//
// 🔴 SUAL: ekran DÜRÜSTdürmü? Uydurma «Analitika» açarı OLMAMALIDIR — layihədə
// analitika qurulmayıb və mövcud olmayan emal üzərində nəzarət göstərmək
// istifadəçini aldatmaqdır. Zəruri kateqoriya isə AÇIQ və PASSİV olmalıdır.
// ---------------------------------------------------------------------------

test("«Seçimlər» kateqoriya ekranı açılır və zəruri kuki söndürülə bilmir", async ({
  browser,
}) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");
    await expect(page.getByTestId("cookie-banner")).toBeVisible();

    await page.getByRole("button", { name: "Seçimlər" }).click();

    const dialog = page.getByTestId("cookie-preferences");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Kuki seçimləri" })).toBeVisible();

    // 🔴 Zəruri kateqoriya: AÇIQ + PASSİV (yalan vəd yoxdur).
    const necessary = dialog.getByRole("switch", { name: /Zəruri kukilər/ });
    await expect(necessary).toBeVisible();
    await expect(necessary).toBeChecked();
    await expect(necessary).toBeDisabled();

    // 🔴 UYDURMA KATEQORİYA YOXDUR: ekranda BAŞQA açar mövcud deyil.
    // ⚠️ Mətn axtarışı ilə ölçmək OLMAZ — dürüstlük qeydinin ÖZÜ «analitika»
    // sözünü keçirir («…analitika kukisi işlətmirik»). Ölçü AÇAR sayıdır.
    await expect(dialog.getByRole("switch")).toHaveCount(1);
    await expect(dialog.getByText(/Başqa kateqoriya yoxdur/)).toBeVisible();

    // Məxfilik bildirişinə keçid var.
    await expect(dialog.getByRole("link", { name: "Məxfilik bildirişi" })).toBeVisible();

    // Seçim SAXLANILIR və banner bağlanır.
    await dialog.getByRole("button", { name: "Seçimimi saxla" }).click();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    // İxtiyari kateqoriya olmadığı üçün nəticə «yalnız zəruri»dir — kuki bunu
    // olduğu kimi yazır, uydurma «all» yazmır.
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "qu_cookie_consent")?.value).toBe("necessary");
  } finally {
    await close();
  }
});

test("«Seçimlər» ekranından «Hamısını qəbul et» də işləyir", async ({ browser }) => {
  const { page, close } = await anonymousPage(browser);

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Seçimlər" }).click();

    const dialog = page.getByTestId("cookie-preferences");
    await dialog.getByRole("button", { name: "Hamısını qəbul et" }).click();

    await expect(page.getByTestId("cookie-banner")).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "qu_cookie_consent")?.value).toBe("all");
  } finally {
    await close();
  }
});

// ---------------------------------------------------------------------------
// 6. Responsivlik
// ---------------------------------------------------------------------------

test("🔴 360px viewport-da yatay sürüşmə yoxdur", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await context.newPage();

  try {
    for (const path of ["/", "/khankendi", `/khankendi/${placeId}`, "/faculties", "/faq", "/events"]) {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow, `${path} yatay sürüşür`).toBeLessThanOrEqual(1);
    }
  } finally {
    await context.close();
  }
});
