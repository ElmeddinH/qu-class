// ============================================================================
// tests/e2e/empty-states.spec.ts
// Blok 12C · D bəndi — BOŞ VƏZİYYƏTLƏRİN GƏZİLMƏSİ.
//
// 🔴 FAYLIN SUALI: nəticə SIFIR olanda hər siyahı NƏ göstərir — izahlı boş
// vəziyyət, yoxsa ağ boşluq?
//
// 🔴 ÜSUL — «BAZANI BOŞALTMAQ» ƏVƏZİNƏ «BOŞ FİLTR».
// Seed-i silmək (və ya ayrıca boş baza qurmaq) həm digər testləri sındırardı,
// həm də uzun çəkərdi. Bunun əvəzinə hər siyahıya ETİBARLI, amma HEÇ NƏYƏ
// UYĞUN GƏLMƏYƏN filtr verilir (`?name=zzzqwerty`, `?year=1900-1901`…).
// Nəticə eynidir — sorğu sıfır sətir qaytarır — amma baza toxunulmaz qalır.
//
// ⚠️ FİLTR DƏYƏRİ «ETİBARLI, LAKİN BOŞ» OLMALIDIR. Zibil enum dəyəri
// (`?category=ZZZ`) parser tərəfindən SƏSSİZCƏ ATILIR (bax
// `lib/*-filters.ts`) və səhifə BÜTÜN nəticələri göstərir — yəni test heç nə
// ölçməzdi. Ona görə mətn axtarışı və mövcud olmayan (amma formatı düzgün)
// tədris ili işlədilir.
//
// ⚠️ Yoxlama İKİ QATLIDIR:
//   1. `[data-testid="empty-state"]` görünür — yəni izahlı vəziyyət var;
//   2. `<main>` içindəki mətn 80 simvoldan uzundur — yəni səhifə ağ deyil
//      (birinci şərt ödənilib, amma qalan hər şey itibsə bunu tutur).
//
// 🔴 LENT (`/class/[slug]/feed`) BURADA YOXDUR — səbəb ölçülüb, unudulmayıb.
// Lent CLIENT siyahısıdır və serverdən `initialData` ALIR. Yəni:
//   · boş vəziyyət yalnız sinifdə HEÇ paylaşım olmayanda görünür — seed-də isə
//     altı sinfin altısında da post var (38–65 ədəd) və hər 12 kateqoriyada
//     sətir mövcuddur, yəni URL filtri ilə boş nəticə almaq MÜMKÜN DEYİL;
//   · `/api/feed` cavabını brauzerdə əvəz etmək də kömək etmir — `initialData`
//     olduğu üçün komponent şəbəkəni gözləmədən dolu siyahı render edir.
// Ona görə lentin boş vəziyyəti KOMPONENT testi ilə ölçülür:
// `src/features/feed/FeedList.test.tsx`.
//
// ⚠️ TƏLƏ T16: kontekstlər `afterAll`-da bağlanır.
// ⚠️ Fayl bazada heç nə yaratmır/dəyişmir.
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@qu.edu.az";
const MEMBER_EMAIL = "rep@qu.edu.az";

/** Heç bir seed sətrinə uyğun gəlməyən axtarış sözü. */
const NO_MATCH = "zzzqwertyxyz";

/** Formatı düzgün, amma seed-də olmayan tədris ili (`/^\d{4}-\d{4}$/`). */
const NO_MATCH_YEAR = "1900-1901";

let cohortSlug: string;

interface EmptyCase {
  label: string;
  path: () => string;
  as: "anon" | "member" | "admin";
}

const CASES: EmptyCase[] = [
  // --- İctimai siyahılar ---
  { label: "/faq (axtarış boş)", path: () => `/faq?q=${NO_MATCH}`, as: "anon" },

  // --- Sinif siyahıları (server + Suspense) ---
  {
    label: "kataloq (ad filtri boş)",
    path: () => `/class/${cohortSlug}/directory?name=${NO_MATCH}`,
    as: "member",
  },
  {
    label: "xronologiya (tədris ili boş)",
    path: () => `/class/${cohortSlug}/timeline?year=${NO_MATCH_YEAR}`,
    as: "member",
  },
  {
    label: "xatirələr (növ filtri boş)",
    path: () => `/class/${cohortSlug}/memories?type=PROFESSOR_QUOTE&page=99`,
    as: "member",
  },
  {
    label: "tədbirlər (səhifə hüdudundan kənar)",
    path: () => `/class/${cohortSlug}/events?page=99`,
    as: "member",
  },
  {
    label: "nailiyyətlər (səhifə hüdudundan kənar)",
    path: () => `/class/${cohortSlug}/achievements?page=99`,
    as: "member",
  },

  // --- İstifadəçi səthləri ---
  { label: "axtarış (nəticəsiz)", path: () => `/search?q=${NO_MATCH}`, as: "member" },
  {
    label: "bildirişlər (oxunmuş + səhifə hüdudundan kənar)",
    path: () => `/notifications?page=99`,
    as: "member",
  },

  // --- Admin siyahıları ---
  {
    label: "admin istifadəçilər (axtarış boş)",
    path: () => `/admin/users?q=${NO_MATCH}`,
    as: "admin",
  },
  { label: "admin audit (səhifə hüdudundan kənar)", path: () => `/admin/audit?page=99`, as: "admin" },
];

test.beforeAll(async () => {
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

test.describe("boş vəziyyətlər — hər siyahı izahlı ekran göstərir", () => {
  let anonPage: Page;
  let memberPage: Page;
  let adminPage: Page;
  let closeAll: () => Promise<void>;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const anonContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const adminContext = await browser.newContext();

    anonPage = await anonContext.newPage();
    memberPage = await memberContext.newPage();
    adminPage = await adminContext.newPage();

    await login(memberPage, MEMBER_EMAIL);
    await login(adminPage, ADMIN_EMAIL);

    closeAll = async () => {
      await anonContext.close();
      await memberContext.close();
      await adminContext.close();
    };
  });

  test.afterAll(async () => {
    await closeAll();
  });

  for (const scenario of CASES) {
    test(`${scenario.label}`, async () => {
      const page =
        scenario.as === "admin"
          ? adminPage
          : scenario.as === "member"
            ? memberPage
            : anonPage;

      await page.goto(scenario.path());
      await page.locator("#main").waitFor({ state: "visible" });

      // Skeleton yox olana qədər — TƏLƏ T19 (sabit gözləmə yoxdur).
      await expect
        .poll(() => page.locator(".animate-pulse").count(), { timeout: 20_000 })
        .toBe(0);

      // 1) İzahlı boş vəziyyət var.
      await expect(page.getByTestId("empty-state").first()).toBeVisible();

      // 2) Səhifə AĞ DEYİL — başlıq, naviqasiya və izah mətni yerindədir.
      const mainText = (await page.locator("#main").innerText()).trim();
      expect(
        mainText.length,
        `«${scenario.label}» səhifəsində mətn çox azdır: «${mainText}»`,
      ).toBeGreaterThan(80);
    });
  }

  // -------------------------------------------------------------------------
  // ROUTE QRUPU SƏVİYYƏSİNDƏ 404 — KARKAS QALIR
  //
  // 🔴 ÖLÇÜNÜN MƏNASI: kök `app/not-found.tsx` route qrupu layout-larının
  // ÜSTÜNDƏDİR — yəni sinif tapılmayanda AppShell (sidebar + header) də yox
  // olurdu və istifadəçinin geri qayıtmaq üçün naviqasiyası qalmırdı.
  // `(app)/not-found.tsx` isə qrupun layout-u İÇİNDƏ render olunur.
  // Test məhz bunu yoxlayır: 404 mətni VAR, karkas da YERİNDƏDİR.
  // -------------------------------------------------------------------------
  test("mövcud olmayan sinif — 404 karkasın İÇİNDƏ göstərilir", async () => {
    const response = await memberPage.goto("/class/bele-sinif-yoxdur-12c");
    expect(response?.status(), "404 statusu qaytarılmalıdır").toBe(404);

    await expect(memberPage.getByText("404")).toBeVisible();
    await expect(
      memberPage.getByRole("heading", { name: "Bu bölmə tapılmadı" }),
    ).toBeVisible();

    // Karkas yerindədir: skip-link + əsas naviqasiya qalıb.
    await expect(
      memberPage.getByRole("link", { name: "Əsas məzmuna keç" }),
    ).toBeAttached();
    await expect(memberPage.locator("#main")).toBeVisible();
  });

  test("mövcud olmayan ictimai ünvan — kök 404 ekranı", async () => {
    const response = await anonPage.goto("/bele-sehife-yoxdur-12c");
    expect(response?.status()).toBe(404);

    await expect(
      anonPage.getByRole("heading", { name: "Səhifə tapılmadı" }),
    ).toBeVisible();
  });
});
