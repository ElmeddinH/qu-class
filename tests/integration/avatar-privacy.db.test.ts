// @vitest-environment node
// ============================================================================
// tests/integration/avatar-privacy.db.test.ts
// Blok 12A · tapıntı P2 — 🔴 TƏLƏ T40
//
// SUAL: `avatarUrl` sahə-səviyyə məxfiliyi (`/me/privacy` → «Profil şəkli»)
// BÜTÜN oxu səthlərində işləyirmi?
//
// `avatarUrl` `CONTROLLED_PROFILE_FIELDS`-in üzvüdür (`lib/visibility.ts`), yəni
// istifadəçi onu `PRIVATE` edə bilir. `redactProfile` isə yalnız ÇAĞIRILDIĞI
// yerdə işləyir — və «müəllif kartı» (`{id, firstName, lastName, avatarUrl}`)
// formasında bu sahə doqquz ayrı `select`-də təkrarlanır.
//
// Audit zamanı ONLARIN SƏKKİZİ redaksiyadan KEÇMİRDİ: lentdə, şərhlərdə,
// xatirələrdə, nailiyyətlərdə, tədbirlərdə və bildirişlərdə şəkli gizlədən
// adamın avatarı yenə göstərilirdi — yəni ayar praktikada heç bir yerdə
// işləmirdi. `listMemoriesForPlace` xüsusilə ağırdır: Xankəndi bələdçisi
// səhifəsi İCTİMAİDİR, yəni şəkil autentifikasiyasız internetə çıxırdı.
//
// ⚠️ AD-SOYAD HƏMİŞƏ QALIR — mühərrik onu heç vaxt gizlətmir (platformanın
// işləməsi üçün minimum). Test məhz bunu da yoxlayır: sahə itir, kimlik yox.
//
// ⚠️ Fayl YAZIR (`avatarUrl` sütunu + `FieldVisibility` sətri), ona görə hər
// dəyişiklik `finally`/`afterAll`-da GERİ QAYTARILIR — seed determinizmi
// (`events.db.test.ts`-dəki eyni intizam).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MemoryType, Visibility } from "@/lib/enums";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";
import { listAchievements } from "@/services/achievement.service";
import { getEventDetail, listEvents } from "@/services/event.service";
import {
  createMemory,
  listMemories,
  listMemoriesForPlace,
} from "@/services/memory.service";
import { listNotifications } from "@/services/notification.service";
import { listComments, listFeed } from "@/services/post.service";
import { listAdminUsers } from "@/services/admin-users.service";
import { emptyAdminUserFilters } from "@/lib/admin-filters";

const prisma = new PrismaClient();

const ALL = 1000;

type UserViewer = Extract<Viewer, { kind: "USER" }>;

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

/** Testin qoyduğu tanınan şəkil ünvanı — nəticədə tapılması asan olsun. */
const AVATAR = "https://example.test/avatar-privacy-fixture.svg";

let member: UserViewer; // rep@ — şəkli GİZLƏDƏN tərəf
let viewerSameClass: UserViewer; // coordinator@ — eyni sinif, BAXAN tərəf
let admin: UserViewer;
let cohortId: string;

/** `member`-in dəyişdirilən sütun/sətir dəyərləri — `afterAll` geri qaytarır. */
let previousAvatarUrl: string | null = null;
let previousLevel: string | null = null;

const createdMemoryIds: string[] = [];

beforeAll(async () => {
  [member, viewerSameClass, admin] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("coordinator@qu.edu.az"),
    viewerOf("admin@qu.edu.az"),
  ]);

  cohortId = member.cohortIds[0];
  // Sanity: baxan tərəf EYNİ sinifdədir — `CLASS` səviyyəsi keçir, `PRIVATE` yox.
  expect(viewerSameClass.cohortIds).toContain(cohortId);

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: member.userId },
    select: { avatarUrl: true, fieldVisibility: { where: { field: "avatarUrl" } } },
  });
  previousAvatarUrl = before.avatarUrl;
  previousLevel = before.fieldVisibility[0]?.level ?? null;

  // Şəkil qoyulur və PRIVATE edilir: «gizlədən istifadəçi» vəziyyəti.
  await prisma.user.update({
    where: { id: member.userId },
    data: { avatarUrl: AVATAR },
  });
  await prisma.fieldVisibility.upsert({
    where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
    create: { userId: member.userId, field: "avatarUrl", level: Visibility.PRIVATE },
    update: { level: Visibility.PRIVATE },
  });
});

afterAll(async () => {
  for (const memoryId of createdMemoryIds) {
    await prisma.auditLog.deleteMany({ where: { entityId: memoryId } });
    await prisma.memory.deleteMany({ where: { id: memoryId } });
  }

  await prisma.user.update({
    where: { id: member.userId },
    data: { avatarUrl: previousAvatarUrl },
  });

  if (previousLevel === null) {
    await prisma.fieldVisibility.deleteMany({
      where: { userId: member.userId, field: "avatarUrl" },
    });
  } else {
    await prisma.fieldVisibility.update({
      where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
      data: { level: previousLevel },
    });
  }

  await prisma.$disconnect();
});

/** Kartın forması düzgündürmü: kimlik qalır, şəkil itir. */
function expectHidden(card: { firstName: string; avatarUrl: string | null } | undefined) {
  expect(card, "sətir nəticədə yoxdur — test yanlış qurulub").toBeDefined();
  // Ad-soyad HƏMİŞƏ görünür.
  expect(card!.firstName.length).toBeGreaterThan(0);
  expect(card!.avatarUrl).toBeNull();
}

// ===========================================================================
// 1. Lent və şərhlər
// ===========================================================================

describe("🔒 T40 — lent və şərhlər", () => {
  it("paylaşım müəllifinin gizlədilmiş avatarı QAYTARILMIR", async () => {
    const page = await listFeed(viewerSameClass, { cohortId, take: ALL });
    const mine = page.items.filter((post) => post.author.id === member.userId);

    expect(mine.length, "seed-də bu istifadəçinin paylaşımı yoxdur").toBeGreaterThan(0);
    for (const post of mine) expectHidden(post.author);
  });

  it("SAHİB özü şəklini görür (redaksiya sahibə tətbiq olunmur)", async () => {
    const page = await listFeed(member, { cohortId, take: ALL });
    const mine = page.items.filter((post) => post.author.id === member.userId);

    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0].author.avatarUrl).toBe(AVATAR);
  });

  it("şərh müəllifinin gizlədilmiş avatarı QAYTARILMIR", async () => {
    // 🔴 ŞƏRH SEÇİMİ MƏXFİLİKDƏN KEÇMƏLİDİR — yoxsa test öz-özünü sındırır.
    //
    // Əvvəl burada sadəcə `take: 1` var idi. Seed determinist olduğu üçün o,
    // HƏMİŞƏ `cmt-009`-u seçirdi — və həmin şərhin paylaşımı (`pst-288`)
    // BAŞQASININ `PRIVATE` paylaşımıdır. `listComments(viewerSameClass, …)`
    // ondan sıfır sətir qaytarır, çünki məxfilik mühərriki DÜZGÜN işləyir:
    // `PRIVATE` yalnız sahibinə görünür. Yəni `expect(mine.length > 0)`
    // uğursuzluğu məhsul qüsuru deyil, testin YANLIŞ QURULMASI idi.
    //
    // İndi şərh yalnız BAXAN TƏRƏFİN GÖRDÜYÜ paylaşımlardan seçilir. Testin
    // mövzusu dəyişmir — mövzu avatar redaksiyasıdır, paylaşım görünürlüyü
    // deyil (onun öz testləri `visibility.test.ts`-dədir).
    const comments = await prisma.comment.findMany({
      where: {
        authorId: member.userId,
        status: "ACTIVE",
        post: {
          status: "ACTIVE",
          cohortId: { in: viewerSameClass.cohortIds },
          // `PRIVATE` qəsdən kənardadır: baxan tərəf onu görmür.
          visibility: { in: [Visibility.PUBLIC, Visibility.UNIVERSITY, Visibility.CLASS] },
        },
      },
      select: { postId: true },
      orderBy: { id: "asc" },
      take: 1,
    });

    if (comments.length === 0) return; // seed-də uyğun şərh yoxdursa yoxlanacaq bir şey yoxdur

    const rows = await listComments(viewerSameClass, comments[0].postId);
    const mine = rows.filter((row) => row.author.id === member.userId);

    expect(mine.length).toBeGreaterThan(0);
    for (const row of mine) expectHidden(row.author);
  });
});

// ===========================================================================
// 2. Xatirələr — o cümlədən İCTİMAİ bələdçi səhifəsi
// ===========================================================================

describe("🔒 T40 — xatirələr", () => {
  it("xatirə müəllifinin gizlədilmiş avatarı QAYTARILMIR", async () => {
    const rows = await listMemories(viewerSameClass, { cohortId, take: ALL });
    const mine = rows.filter((row) => row.author.id === member.userId);

    expect(mine.length, "seed-də bu istifadəçinin xatirəsi yoxdur").toBeGreaterThan(0);
    for (const row of mine) expectHidden(row.author);
  });

  it("🔴 İCTİMAİ bələdçi səhifəsində ANONİM ziyarətçiyə avatar getmir", async () => {
    const place = await prisma.guidePlace.findFirstOrThrow({ select: { id: true } });

    const result = await createMemory(member, {
      cohortId,
      type: MemoryType.SHORT_MEMORY,
      title: "Məkan xatirəsi — avatar testi",
      body: "Bələdçi səhifəsi ictimaidir; bu qeyd PUBLIC səviyyədədir.",
      dedicatedTo: null,
      imageUrl: null,
      occurredAt: new Date("2026-05-11T10:00:00.000Z"),
      guidePlaceId: place.id,
      visibility: Visibility.PUBLIC,
      showInProfile: true,
      showInFeed: false,
      showInTimeline: false,
      showInYearbook: false,
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    createdMemoryIds.push(result.value.memoryId);

    const rows = await listMemoriesForPlace(ANONYMOUS, place.id, ALL);
    const mine = rows.filter((row) => row.author.id === member.userId);

    expect(mine.length).toBeGreaterThan(0);
    for (const row of mine) expectHidden(row.author);
  });
});

// ===========================================================================
// 3. Nailiyyətlər · tədbirlər · bildirişlər
// ===========================================================================

describe("🔒 T40 — nailiyyət, tədbir, bildiriş", () => {
  it("nailiyyət sahibinin gizlədilmiş avatarı QAYTARILMIR", async () => {
    const rows = await listAchievements(viewerSameClass, {
      cohortId,
      ownerId: member.userId,
      take: ALL,
    });

    if (rows.length === 0) return; // seed-də təsdiqlənmiş nailiyyəti yoxdursa keç
    for (const row of rows) expectHidden(row.owner);
  });

  it("tədbiri YARADANIN gizlədilmiş avatarı QAYTARILMIR", async () => {
    const rows = await listEvents(viewerSameClass, { cohortId, take: ALL });
    const mine = rows.filter((row) => row.createdBy.id === member.userId);

    if (mine.length === 0) return;
    for (const row of mine) expectHidden(row.createdBy);
  });

  it("tədbirin ƏLAQƏLƏNDİRİCİ şəxsinin gizlədilmiş avatarı QAYTARILMIR", async () => {
    const event = await prisma.event.findFirst({
      where: { contactId: member.userId, status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { id: true },
    });

    if (!event) return;

    const detail = await getEventDetail(viewerSameClass, event.id);
    expect(detail).not.toBeNull();
    if (detail?.contact) expectHidden(detail.contact);
  });

  it("bildiriş AKTORUNUN gizlədilmiş avatarı QAYTARILMIR", async () => {
    const rows = await listNotifications(viewerSameClass, { take: ALL });
    const mine = rows.filter((row) => row.actor?.id === member.userId);

    if (mine.length === 0) return;
    for (const row of mine) expectHidden(row.actor!);
  });
});

// ===========================================================================
// 4. Admin cədvəli — admin olmaq sahə görünürlüyünü AŞMIR
// ===========================================================================

describe("🔒 T40 — admin istifadəçi cədvəli", () => {
  it("🔴 ADMİN də gizlədilmiş avatarı görmür (şəhərlə eyni qayda)", async () => {
    const page = await listAdminUsers(admin, emptyAdminUserFilters(), ALL, 0);
    const row = page.items.find((item) => item.id === member.userId);

    expect(row, "istifadəçi admin cədvəlində tapılmadı").toBeDefined();
    expect(row!.firstName.length).toBeGreaterThan(0);
    // `currentCity` üçün qayda artıq tətbiq olunurdu — avatar da eyni olmalıdır.
    expect(row!.avatarUrl).toBeNull();
  });
});

// ===========================================================================
// 5. UNIVERSITY səviyyəsi — redaksiya «hər şeyi gizlət» demək DEYİL
// ===========================================================================

describe("🔒 T40 — səviyyə düzgün oxunur", () => {
  it("`UNIVERSITY` səviyyəsində avatar autentifikasiya olunmuşa AÇIQ, anonimə BAĞLIDIR", async () => {
    await prisma.fieldVisibility.update({
      where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
      data: { level: Visibility.UNIVERSITY },
    });

    try {
      const place = await prisma.guidePlace.findFirstOrThrow({ select: { id: true } });

      const forUser = await listMemoriesForPlace(viewerSameClass, place.id, ALL);
      const seenByUser = forUser.filter((row) => row.author.id === member.userId);
      if (seenByUser.length > 0) {
        expect(seenByUser[0].author.avatarUrl).toBe(AVATAR);
      }

      const forAnon = await listMemoriesForPlace(ANONYMOUS, place.id, ALL);
      const seenByAnon = forAnon.filter((row) => row.author.id === member.userId);
      if (seenByAnon.length > 0) {
        expect(seenByAnon[0].author.avatarUrl).toBeNull();
      }
    } finally {
      await prisma.fieldVisibility.update({
        where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
        data: { level: Visibility.PRIVATE },
      });
    }
  });
});
