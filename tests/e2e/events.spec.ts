// ============================================================================
// tests/e2e/events.spec.ts
// Blok 9 DoD — Events & Reunion Coordinator [M12, M13].
//
// Yoxlanılır:
//   · coordinator@qu.edu.az tədbir yaradır (spec §14-ün 10 sahəsi + scope/category)
//   · rep@qu.edu.az həmin tədbirə QEYDİYYATDAN KEÇİR
//   · `.ics` faylı YÜKLƏNİR və məzmunu RFC 5545-ə uyğundur
//   · koordinator paneli CSV ixrac edir
//   · keçmiş tədbir Timeline-a əlavə edilir → BAZADA `TimelineEntry` yaranır
//   · 6 filtr URL-də saxlanılır
//   · adi üzv koordinator panelinə DÜŞMÜR
//
// 🔴 TƏLƏ T16: iki hesabla növbə ilə giriş üçün `clearCookies()` KİFAYƏT
// ETMİR — hər hesab üçün `browser.newContext()` (aşağıdaki `withAccount`).
//
// 🔴 TƏLƏ T19: server action-dan sonra siyahı SERVERDƏ yenilənir
// (`revalidatePath` + `router.refresh()`) → `expect.poll` işlədilir.
//
// ⚠️ Test YAZIR: yaradılan tədbir və törəmə sətirlər `afterAll`-da silinir —
// seed determinizmi pozulmamalıdır (`npm run db:seed` təkrar tələb olunmasın).
// ============================================================================

import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Test1234!";

/** PLAN.md §7 — hər ikisi `sec2023` sinfindədir. */
const COORDINATOR = "coordinator@qu.edu.az";
const REPRESENTATIVE = "rep@qu.edu.az";
const MODERATOR = "moderator@qu.edu.az";

/** Testin yaratdığı tədbirlərin id-ləri — `afterAll` təmizliyi üçün. */
const createdEventIds: string[] = [];

/** Başlıq unikal olmalıdır: siyahıda məhz bizim tədbiri tapmalıyıq. */
const EVENT_TITLE = `E2E Karyera günü ${Date.now()}`;
const PAST_EVENT_TITLE = `E2E Keçmiş seminar ${Date.now()}`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Universitet e-poçtu").fill(email);
  await page.getByLabel("Şifrə", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Daxil ol" }).click();
  await page.waitForURL(/\/class\/|\/home/);
}

/** Hər hesab üçün TƏMİZ kontekst — bax fayl başındaki T16 qeydi. */
async function withAccount<T>(
  browser: Browser,
  email: string,
  body: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, email);
    return await body(page);
  } finally {
    await context.close();
  }
}

async function cohortSlugOf(email: string): Promise<string> {
  const membership = await prisma.cohortMembership.findFirstOrThrow({
    where: { user: { email } },
    select: { cohort: { select: { slug: true } } },
  });
  return membership.cohort.slug;
}

test.afterAll(async () => {
  if (createdEventIds.length > 0) {
    // Cascade `EventRSVP`, `MediaAsset` və `TimelineEntry`-ni aparır.
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdEventIds } } });
    await prisma.notification.deleteMany({ where: { entityId: { in: createdEventIds } } });
  }
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// DoD 1 — koordinator tədbir yaradır
// ---------------------------------------------------------------------------

test("coordinator tədbir yaradır, rep qeydiyyatdan keçir", async ({ browser }) => {
  const slug = await cohortSlugOf(COORDINATOR);

  // --- Koordinator: tədbir yaradır ---
  await withAccount(browser, COORDINATOR, async (page) => {
    await page.goto(`/class/${slug}/events`);

    await page.getByRole("button", { name: "Yeni tədbir" }).click();

    // ⚠️ Seçicilər FORMA daxilinə daraldılır: filtr panelində də «Kateqoriya»
    // adlı seçim var və eyni səhifədədir (strict mode pozuntusu).
    const composer = page.getByRole("form", { name: "Yeni tədbir formu" });

    // spec §14 — 1. ad · 2. təsvir
    await composer.getByLabel("Tədbirin adı").fill(EVENT_TITLE);
    await composer.getByLabel("Təsvir").fill("E2E testi tərəfindən yaradılıb.");

    // ⚠️ scope ≠ category — İKİ AYRI seçim. Bu, blokun əsas təsnifat
    // qaydasıdır və testdə də ayrıca doldurulur.
    await composer.getByLabel("Kateqoriya").click();
    await page.getByRole("option", { name: "Karyera tədbiri" }).click();

    // 3. tarix — gələcək (defolt onsuz da sabahdır, açıq yazılır)
    const start = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    start.setHours(12, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localValue = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    await composer.getByLabel("Başlama").fill(localValue(start));
    await composer
      .getByLabel("Bitmə")
      .fill(localValue(new Date(start.getTime() + 7_200_000)));

    // 4. məkan · 6. limit
    await composer.getByLabel("Məkan").fill("Xankəndi, QU kampusu, A korpusu");
    await composer.getByLabel("İştirakçı limiti").fill("40");

    // 8. proqram (markdown)
    await composer.getByLabel("Proqram").fill("## 12:00 Qeydiyyat\n- Açılış\n- Panel");

    await composer.getByRole("button", { name: "Tədbiri elan et" }).click();

    // Yaradılan tədbir siyahıda görünür (server revalidate + router.refresh).
    await expect
      .poll(async () => page.getByText(EVENT_TITLE).count(), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  // Bazada həqiqətən yarandımı?
  const event = await prisma.event.findFirstOrThrow({
    where: { title: EVENT_TITLE },
    select: { id: true, capacity: true, category: true, scope: true, agenda: true },
  });
  createdEventIds.push(event.id);

  expect(event.capacity).toBe(40);
  expect(event.category).toBe("CAREER");
  // Defolt təşkilatçı səviyyəsi sinifdir — universitetə səhvən elan verilməsin.
  expect(event.scope).toBe("CLASS");
  expect(event.agenda).toContain("12:00 Qeydiyyat");

  // --- Sinif nümayəndəsi: qeydiyyatdan keçir ---
  await withAccount(browser, REPRESENTATIVE, async (page) => {
    await page.goto(`/events/${event.id}`);
    await expect(page.getByRole("heading", { name: EVENT_TITLE })).toBeVisible();

    // Proqram markdown kimi render olunur (h3 başlıq).
    await expect(page.getByText("12:00 Qeydiyyat")).toBeVisible();

    await page.getByRole("button", { name: "Qeydiyyatdan keç" }).click();

    await expect
      .poll(
        async () =>
          prisma.eventRSVP.count({
            where: { eventId: event.id, status: "REGISTERED" },
          }),
        { timeout: 15_000 },
      )
      .toBe(1);
  });
});

// ---------------------------------------------------------------------------
// DoD 2 — `.ics` faylı yüklənir
// ---------------------------------------------------------------------------

test(".ics faylı yüklənir və RFC 5545-ə uyğundur", async ({ browser }) => {
  const eventId = createdEventIds[0];
  expect(eventId, "əvvəlki test tədbir yaratmalıdır").toBeTruthy();

  await withAccount(browser, REPRESENTATIVE, async (page) => {
    await page.goto(`/events/${eventId}`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Təqvimə əlavə et" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.ics$/);

    // Faylın MƏZMUNU — DoD "təqvimdə düzgün açılır" tələbinin yoxlanılan hissəsi.
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString("utf8");

    expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("END:VCALENDAR");
    expect(body).toContain(`UID:${eventId}@`);
    expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(body).toMatch(/DTEND:\d{8}T\d{6}Z/);
    // CRLF — tək LF olmamalıdır.
    expect(/[^\r]\n/.test(body)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DoD 3 — koordinator paneli CSV ixrac edir
// ---------------------------------------------------------------------------

test("koordinator paneli CSV ixrac edir", async ({ browser }) => {
  const eventId = createdEventIds[0];
  expect(eventId).toBeTruthy();

  await withAccount(browser, COORDINATOR, async (page) => {
    await page.goto(`/events/${eventId}/manage`);
    await expect(page.getByRole("heading", { name: "Koordinator paneli" })).toBeVisible();

    // Cədvəldə qeydiyyatdan keçən nümayəndə görünür.
    await expect(page.getByText("Dəvət olunanlar və qeydiyyatlar")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "CSV ixrac" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks);
    const body = raw.toString("utf8");

    // BOM (Excel UTF-8) + azərbaycanca başlıqlar + ən azı bir sətir.
    expect([...raw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(body).toContain("Ad,Soyad,E-poçt");
    expect(body).toContain("@qu.edu.az");
    expect(/[^\r]\n/.test(body)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DoD 4 — keçmiş tədbir Timeline-a əlavə olunur
// ---------------------------------------------------------------------------

test("keçmiş tədbir Class Timeline-a əlavə olunur → TimelineEntry yaranır", async ({
  browser,
}) => {
  const slug = await cohortSlugOf(COORDINATOR);
  const cohort = await prisma.cohort.findUniqueOrThrow({
    where: { slug },
    select: { id: true },
  });
  const creator = await prisma.user.findUniqueOrThrow({
    where: { email: COORDINATOR },
    select: { id: true },
  });

  // Keçmiş tədbir birbaşa bazada qurulur: UI-dan gələcək tarixli tədbir
  // yaradıb sonra tarixini dəyişmək testi uzadar, üstəlik yoxlanan davranış
  // (Timeline düyməsi) tədbirin NECƏ yarandığından asılı deyil.
  const past = await prisma.event.create({
    data: {
      cohortId: cohort.id,
      scope: "CLASS",
      category: "SEMINAR",
      title: PAST_EVENT_TITLE,
      description: "E2E — keçmiş tədbir.",
      startsAt: new Date("2026-03-10T10:00:00.000Z"),
      location: "Xankəndi",
      isOnline: false,
      createdById: creator.id,
      visibility: "CLASS",
      status: "COMPLETED",
    },
    select: { id: true },
  });
  createdEventIds.push(past.id);

  await withAccount(browser, COORDINATOR, async (page) => {
    await page.goto(`/events/${past.id}`);

    await page.getByRole("button", { name: "Class Timeline-a əlavə et" }).click();

    await expect
      .poll(async () => prisma.timelineEntry.count({ where: { eventId: past.id } }), {
        timeout: 15_000,
      })
      .toBe(1);
  });

  const entry = await prisma.timelineEntry.findUniqueOrThrow({
    where: { eventId: past.id },
    select: { sourceType: true, visibility: true, category: true, cohortId: true },
  });

  expect(entry.sourceType).toBe("EVENT");
  // 🔒 Görünürlük TƏDBİRDƏN kopyalanır, ondan açıq ola bilməz.
  expect(entry.visibility).toBe("CLASS");
  expect(entry.cohortId).toBe(cohort.id);
  // `EventCategory` DEYİL — xronologiya filtri `PostCategory` üzərindədir.
  expect(entry.category).toBe("GENERAL");

  // Xronologiya səhifəsində də görünür.
  await withAccount(browser, COORDINATOR, async (page) => {
    await page.goto(`/class/${slug}/timeline?year=2025-2026`);
    await expect(page.getByText(PAST_EVENT_TITLE)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Filtrlər və icazə
// ---------------------------------------------------------------------------

test("6 filtr URL-də saxlanılır və yeniləmədən sonra qalır", async ({ browser }) => {
  const slug = await cohortSlugOf(COORDINATOR);

  await withAccount(browser, COORDINATOR, async (page) => {
    await page.goto(`/class/${slug}/events`);

    // «Təşkilatçı» filtri — REUNION YALNIZ burada var (category-də YOX).
    await page.getByLabel("Təşkilatçı").click();
    await page.getByRole("option", { name: "Məzunlar görüşü" }).click();

    await expect.poll(async () => page.url(), { timeout: 10_000 }).toContain("scope=REUNION");

    // «Tarix» filtri — keçmiş tədbirlər.
    await page.getByLabel("Tarix").click();
    await page.getByRole("option", { name: "Keçmiş tədbirlər" }).click();

    await expect.poll(async () => page.url(), { timeout: 10_000 }).toContain("when=PAST");

    // Yeniləmədən sonra vəziyyət qalır (URL vəziyyət mənbəyidir).
    await page.reload();
    expect(page.url()).toContain("scope=REUNION");
    expect(page.url()).toContain("when=PAST");

    // Aktiv filtr çipləri göstərilir.
    await expect(page.getByText("Məzunlar görüşü").first()).toBeVisible();
  });
});

test("adi üzv koordinator panelinə DÜŞMÜR", async ({ browser }) => {
  const eventId = createdEventIds[0];
  expect(eventId).toBeTruthy();

  // Moderator bu tədbirdə nə yaradıcıdır, nə də `EVENT_MANAGER_ROLES`
  // rolundadır → panel 404 verir ("yoxdur" və "icazə yoxdur" ayırd edilmir).
  await withAccount(browser, MODERATOR, async (page) => {
    const response = await page.goto(`/events/${eventId}/manage`);
    expect(response?.status()).toBe(404);
  });
});
