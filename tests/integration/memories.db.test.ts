// @vitest-environment node
// ============================================================================
// tests/integration/memories.db.test.ts
// Blok 10A [M9] — Share Memories, Digital Yearbook, dəstək təklifləri və
// başlıq zolağının REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ÜÇ ƏSAS SUALI:
//   1. ALBOM — `showInYearbook` bayrağı görünürlüyü ƏVƏZ EDİRmi?
//      (etməməlidir: `PRIVATE` xatirə albom üçün seçilsə də yalnız sahibinə)
//   2. MƏKAN — `guidePlaceId` filtri məxfilik filtrini ƏVƏZ EDİRmi?
//      (etməməlidir: bələdçi səhifəsi Blok 11-də İCTİMAİ olacaq və anonim
//      ziyarətçi `CLASS` xatirəni GÖRMƏMƏLİDİR — bu, blokun ən vacib testidir)
//   3. TƏLƏ A — `showInFeed` / `showInTimeline` keçidləri törəmə sətirləri
//      (Post + TimelineEntry) DOĞRU yaradıb silirmi?
//
// ⚠️ Fayl YAZIR (xatirə yaradır, redaktə edir, silir), ona görə
// `profile.db.test.ts` / `timeline.db.test.ts` ilə eyni intizam: yaradılan hər
// sətir `finally`-də və ya `afterAll`-da GERİ QAYTARILIR — seed determinizmi
// pozulmamalıdır (növbəti icra eyni bazanı görməlidir).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MemoryType, Visibility } from "@/lib/enums";
import { isHeadlineStatsVisible } from "@/lib/headline-stats";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";
import { groupYearbook } from "@/lib/yearbook";
import { listCohortSupportOffers } from "@/services/cohort.service";
import {
  countMemories,
  createMemory,
  deleteMemory,
  listMemories,
  listMemoriesForPlace,
  listYearbook,
  updateMemory,
  type CreateMemoryData,
} from "@/services/memory.service";
import { getCohortHeadlineStats } from "@/services/stats.service";

const prisma = new PrismaClient();

/** Səhifələmə deyil, ƏHATƏ yoxlanılır. */
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

/** Sətir sahibinin viewer-i — seed hesabı olmaya bilər (id-dən qurulur). */
async function viewerOfUserId(userId: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, systemRole: true, memberships: { select: { cohortId: true, role: true } } },
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

/** PLAN.md §7 test hesabları. */
let member: UserViewer; // rep@ — İnformasiya təhlükəsizliyi 2027
let alumni: UserViewer; // alumni@ — Maliyyə 2022 (BAŞQA sinif)
/** moderator@ — `member` ilə EYNİ sinifdə `CLASS_MODERATOR` (T41 testləri). */
let moderator: UserViewer;
let cohortId: string;
let alumniCohortId: string;

/** Testin yaratdığı bütün xatirələr — `afterAll` onları tam təmizləyir. */
const createdMemoryIds: string[] = [];

beforeAll(async () => {
  [member, alumni, moderator] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
    viewerOf("moderator@qu.edu.az"),
  ]);

  cohortId = member.cohortIds[0];
  alumniCohortId = alumni.cohortIds[0];

  // Sanity: iki hesab FƏRQLİ siniflərdədir — "başqa sinif" testləri bundan asılıdır.
  expect(alumni.cohortIds).not.toContain(cohortId);
  // Sanity: moderator MƏHZ bu sinfin moderatorudur (T41 testləri bundan asılıdır).
  expect(moderator.moderatedCohortIds).toContain(cohortId);
});

afterAll(async () => {
  // Törəmə sətirlər (Post → TimelineEntry) əvvəl, sonra xatirənin özü.
  for (const memoryId of createdMemoryIds) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      select: { postId: true },
    });

    if (memory?.postId) {
      await prisma.timelineEntry.deleteMany({ where: { postId: memory.postId } });
      await prisma.mediaAsset.deleteMany({ where: { postId: memory.postId } });
      await prisma.notification.deleteMany({ where: { entityId: memory.postId } });
      await prisma.post.delete({ where: { id: memory.postId } });
    }

    // T41 testlərinin yaratdığı moderasiya izi — seed determinizmi üçün geri alınır.
    await prisma.auditLog.deleteMany({ where: { entityId: memoryId } });
    await prisma.memory.deleteMany({ where: { id: memoryId } });
  }

  await prisma.$disconnect();
});

/** Yeni xatirə yaradır və təmizlik siyahısına yazır. */
async function createFor(
  viewer: UserViewer,
  overrides: Partial<CreateMemoryData> = {},
): Promise<string> {
  const result = await createMemory(viewer, {
    cohortId,
    type: MemoryType.SHORT_MEMORY,
    title: "Test xatirəsi",
    body: "İnteqrasiya testinin yaratdığı xatirə mətni — kifayət qədər uzundur.",
    dedicatedTo: null,
    imageUrl: null,
    occurredAt: new Date("2026-05-10T10:00:00.000Z"),
    guidePlaceId: null,
    visibility: Visibility.CLASS,
    showInProfile: true,
    showInFeed: false,
    showInTimeline: false,
    showInYearbook: false,
    ...overrides,
  });

  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error(result.reason);

  createdMemoryIds.push(result.value.memoryId);
  return result.value.memoryId;
}

// ===========================================================================
// 1. 🔴 ALBOM — bayraq görünürlüyü əvəz etmir
// ===========================================================================

describe("listYearbook", () => {
  it("`showInYearbook = false` xatirə albomda ÇIXMIR", async () => {
    // --- SANITY: sinifdə belə xatirə var (boş nəticə ilə yaşıl olma tələsi) ---
    const excluded = await prisma.memory.findMany({
      where: { cohortId, showInYearbook: false, status: "ACTIVE" },
      select: { id: true },
    });
    expect(excluded.length, "albom üçün seçilməmiş xatirə").toBeGreaterThan(0);

    const album = await listYearbook(member, cohortId);
    const albumIds = new Set(album.map((entry) => entry.id));

    for (const row of excluded) {
      expect(albumIds.has(row.id), `${row.id} albomda göründü`).toBe(false);
    }
    expect(album.every((entry) => entry.showInYearbook)).toBe(true);
  });

  it("🔴 PRIVATE xatirə BAŞQASINA çıxmır, SAHİBİNƏ çıxır", async () => {
    // Seed-də `PRIVATE` + `showInYearbook` xatirə var (mry-016). Sahibi öz
    // albomunda onu görməlidir, sinif yoldaşı isə YOX.
    const priv = await prisma.memory.findFirstOrThrow({
      where: { visibility: Visibility.PRIVATE, status: "ACTIVE", showInYearbook: true },
      select: { id: true, authorId: true, cohortId: true },
    });

    const owner = await viewerOfUserId(priv.authorId);
    const classmate = await prisma.cohortMembership.findFirstOrThrow({
      where: { cohortId: priv.cohortId, userId: { not: priv.authorId } },
      select: { userId: true },
    });
    const otherViewer = await viewerOfUserId(classmate.userId);

    const ownerAlbum = await listYearbook(owner, priv.cohortId);
    const otherAlbum = await listYearbook(otherViewer, priv.cohortId);

    expect(ownerAlbum.map((e) => e.id)).toContain(priv.id);
    expect(otherAlbum.map((e) => e.id)).not.toContain(priv.id);
  });

  it("ANONİM viewer sinfin albomunda yalnız PUBLIC qeyd görür", async () => {
    const anonymous = await listYearbook(ANONYMOUS, cohortId);

    expect(anonymous.every((entry) => entry.visibility === Visibility.PUBLIC)).toBe(true);
  });

  it("qruplaşdırma qaydası real məlumatda da bir qeydi bir bölmədə saxlayır", async () => {
    const album = await listYearbook(member, cohortId);
    const seen = groupYearbook(album).flatMap((group) => group.items.map((i) => i.id));

    expect(seen.length).toBe(new Set(seen).size);
  });
});

// ===========================================================================
// 2. 🔴 MƏKAN — bələdçi üzərindən sızma (blokun ən vacib testi)
// ===========================================================================

describe("listMemoriesForPlace", () => {
  it("🔴 ANONİM viewer üçün CLASS xatirə QAYTARILMIR", async () => {
    // --- SANITY: məkana bağlı CLASS xatirə həqiqətən var ---
    const classMemories = await prisma.memory.findMany({
      where: { guidePlaceId: { not: null }, visibility: Visibility.CLASS, status: "ACTIVE" },
      select: { id: true, guidePlaceId: true },
    });
    expect(classMemories.length, "məkana bağlı CLASS xatirə").toBeGreaterThan(0);

    // Hər belə məkan üçün anonim sorğu yoxlanılır — biri sızsa test qırılır.
    const placeIds = [...new Set(classMemories.map((m) => m.guidePlaceId!))];

    for (const placeId of placeIds) {
      const visible = await listMemoriesForPlace(ANONYMOUS, placeId, ALL);

      expect(
        visible.every((memory) => memory.visibility === Visibility.PUBLIC),
        `gpl ${placeId} anonim sorğuda PUBLIC olmayan xatirə verdi`,
      ).toBe(true);
    }
  });

  it("🔴 PRIVATE xatirə də məkan üzərindən sızmır", async () => {
    const priv = await prisma.memory.findFirstOrThrow({
      where: { visibility: Visibility.PRIVATE, status: "ACTIVE", guidePlaceId: { not: null } },
      select: { id: true, guidePlaceId: true, authorId: true },
    });

    const anonymous = await listMemoriesForPlace(ANONYMOUS, priv.guidePlaceId!, ALL);
    expect(anonymous.map((m) => m.id)).not.toContain(priv.id);

    const owner = await viewerOfUserId(priv.authorId);
    const forOwner = await listMemoriesForPlace(owner, priv.guidePlaceId!, ALL);
    expect(forOwner.map((m) => m.id)).toContain(priv.id);
  });

  it("sinif üzvü ÖZ sinfinin məkan xatirəsini görür", async () => {
    const target = await prisma.memory.findFirstOrThrow({
      where: {
        cohortId,
        guidePlaceId: { not: null },
        visibility: Visibility.CLASS,
        status: "ACTIVE",
      },
      select: { id: true, guidePlaceId: true },
    });

    const visible = await listMemoriesForPlace(member, target.guidePlaceId!, ALL);
    expect(visible.map((m) => m.id)).toContain(target.id);
  });

  it("🔴 BAŞQA sinif üzvü həmin CLASS xatirəni məkan üzərindən GÖRMÜR", async () => {
    const target = await prisma.memory.findFirstOrThrow({
      where: {
        cohortId,
        guidePlaceId: { not: null },
        visibility: Visibility.CLASS,
        status: "ACTIVE",
      },
      select: { id: true, guidePlaceId: true },
    });

    const visible = await listMemoriesForPlace(alumni, target.guidePlaceId!, ALL);
    expect(visible.map((m) => m.id)).not.toContain(target.id);
  });
});

// ===========================================================================
// 3. Siyahı — fərqli sinif sızması və filtrlər
// ===========================================================================

describe("listMemories", () => {
  it("🔴 fərqli cohort üzvü başqa sinfin CLASS xatirəsini görmür", async () => {
    const classMemories = await prisma.memory.findMany({
      where: { cohortId, visibility: Visibility.CLASS, status: "ACTIVE" },
      select: { id: true },
    });
    expect(classMemories.length).toBeGreaterThan(0);

    const visible = await listMemories(alumni, { cohortId, take: ALL });
    const visibleIds = new Set(visible.map((m) => m.id));

    for (const row of classMemories) {
      expect(visibleIds.has(row.id), `${row.id} başqa sinfə sızdı`).toBe(false);
    }
  });

  it("`placeOnly` filtri yalnız məkana bağlı xatirələri verir", async () => {
    const result = await listMemories(member, { cohortId, placeOnly: true, take: ALL });

    expect(result.every((memory) => memory.guidePlaceId !== null)).toBe(true);
  });

  it("`countMemories` siyahı ilə EYNİ şərtdən keçir", async () => {
    const [items, total] = await Promise.all([
      listMemories(member, { cohortId, take: ALL }),
      countMemories(member, { cohortId }),
    ]);

    expect(total).toBe(items.length);
  });

  it("tip filtri seçilmiş növü qaytarır", async () => {
    const type = MemoryType.THANKS_TEACHER;
    const result = await listMemories(member, { cohortId, type, take: ALL });

    expect(result.every((memory) => memory.type === type)).toBe(true);
  });
});

// ===========================================================================
// 4. 🔴 TƏLƏ A — səth bayraqları və törəmə sətirlər
// ===========================================================================

describe("TƏLƏ A — showInFeed / showInTimeline", () => {
  it("`showInFeed` + `showInTimeline` açılır → Post VƏ TimelineEntry yaranır", async () => {
    const memoryId = await createFor(member, {
      showInFeed: true,
      showInTimeline: true,
      visibility: Visibility.CLASS,
      title: "Xronologiyaya düşən xatirə",
    });

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { postId: true, visibility: true, occurredAt: true },
    });

    expect(memory.postId).not.toBeNull();

    const post = await prisma.post.findUniqueOrThrow({
      where: { id: memory.postId! },
      select: { kind: true, status: true, visibility: true, occurredAt: true },
    });
    expect(post.kind).toBe("MEMORY");
    expect(post.status).toBe("ACTIVE");
    expect(post.visibility).toBe(memory.visibility);
    expect(post.occurredAt.toISOString()).toBe(memory.occurredAt.toISOString());

    const entry = await prisma.timelineEntry.findUniqueOrThrow({
      where: { postId: memory.postId! },
      select: { visibility: true, sourceType: true, title: true },
    });

    // 🔴 Görünürlük XATİRƏDƏN kopyalanır — törəmə qeyd mənbədən açıq ola bilməz.
    expect(entry.visibility).toBe(memory.visibility);
    // Xatirə üçün AYRI `sourceType` YARADILMADI (bax memory.service başlığı).
    expect(entry.sourceType).toBe("POST");
    expect(entry.title).toBe("Xronologiyaya düşən xatirə");
  });

  it("`showInFeed` söndürülür → Post DELETED, TimelineEntry SİLİNİR", async () => {
    const memoryId = await createFor(member, {
      showInFeed: true,
      showInTimeline: true,
      title: "Lentdən çıxarılacaq xatirə",
    });

    const before = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { postId: true },
    });
    const postId = before.postId!;
    expect(await prisma.timelineEntry.count({ where: { postId } })).toBe(1);

    const result = await updateMemory(member, {
      memoryId,
      type: MemoryType.SHORT_MEMORY,
      title: "Lentdən çıxarılacaq xatirə",
      body: "İnteqrasiya testinin yaratdığı xatirə mətni — kifayət qədər uzundur.",
      dedicatedTo: null,
      imageUrl: null,
      occurredAt: new Date("2026-05-10T10:00:00.000Z"),
      guidePlaceId: null,
      visibility: Visibility.CLASS,
      showInProfile: true,
      showInFeed: false,
      showInTimeline: false,
      showInYearbook: false,
    });
    expect(result.ok).toBe(true);

    const post = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { status: true },
    });
    // Soft delete — sətir QALIR (cascade işə düşmür), status dəyişir.
    expect(post.status).toBe("DELETED");
    expect(await prisma.timelineEntry.count({ where: { postId } })).toBe(0);

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { postId: true, showInFeed: true },
    });
    expect(memory.postId).toBeNull();
    expect(memory.showInFeed).toBe(false);

    // Təmizlik: `Memory.postId` boşaldığı üçün `afterAll` postu tapa bilməz.
    await prisma.timelineEntry.deleteMany({ where: { postId } });
    await prisma.notification.deleteMany({ where: { entityId: postId } });
    await prisma.post.delete({ where: { id: postId } });
  });

  it("🔴 servis `showInTimeline` + `showInFeed = false` kombinasiyasını RƏDD edir", async () => {
    // Zod sxemi eyni qaydanı UI/action qatında tətbiq edir; bu, ikinci qapıdır.
    const result = await createMemory(member, {
      cohortId,
      type: MemoryType.SHORT_MEMORY,
      title: "Qaydanı pozan xatirə",
      body: "Bu xatirə yaradılmamalıdır, çünki timeline feed olmadan seçilib.",
      dedicatedTo: null,
      imageUrl: null,
      occurredAt: new Date("2026-05-10T10:00:00.000Z"),
      guidePlaceId: null,
      visibility: Visibility.CLASS,
      showInProfile: true,
      showInFeed: false,
      showInTimeline: true,
      showInYearbook: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TIMELINE_REQUIRES_FEED");
  });

  it("üzv olmadığın sinifdə xatirə yaradıla bilmir", async () => {
    const result = await createMemory(alumni, {
      cohortId, // `alumni` bu sinifdə üzv DEYİL
      type: MemoryType.SHORT_MEMORY,
      title: "Yad sinifdə xatirə",
      body: "Bu sətir bazaya düşməməlidir — üzvlük DB-dən yoxlanılır.",
      dedicatedTo: null,
      imageUrl: null,
      occurredAt: new Date("2026-05-10T10:00:00.000Z"),
      guidePlaceId: null,
      visibility: Visibility.CLASS,
      showInProfile: true,
      showInFeed: false,
      showInTimeline: false,
      showInYearbook: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_A_MEMBER");
  });

  it("başqasının xatirəsini REDAKTƏ etmək olmur", async () => {
    const memoryId = await createFor(member, { title: "Yalnız sahibinin redaktəsi" });

    const result = await updateMemory(alumni, {
      memoryId,
      type: MemoryType.SHORT_MEMORY,
      title: "Oğurlanmış başlıq",
      body: "Başqasının xatirəsini dəyişmək cəhdi — rədd olunmalıdır.",
      dedicatedTo: null,
      imageUrl: null,
      occurredAt: new Date("2026-05-10T10:00:00.000Z"),
      guidePlaceId: null,
      visibility: Visibility.CLASS,
      showInProfile: true,
      showInFeed: false,
      showInTimeline: false,
      showInYearbook: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("silinmiş xatirə siyahılardan çıxır (soft delete)", async () => {
    const memoryId = await createFor(member, {
      title: "Silinəcək xatirə",
      showInYearbook: true,
    });

    expect((await listYearbook(member, cohortId)).map((m) => m.id)).toContain(memoryId);

    const result = await deleteMemory(member, memoryId);
    expect(result.ok).toBe(true);

    expect((await listYearbook(member, cohortId)).map((m) => m.id)).not.toContain(memoryId);
    expect((await listMemories(member, { cohortId, take: ALL })).map((m) => m.id)).not.toContain(
      memoryId,
    );

    // Sətir QALIR (soft delete) — status dəyişib.
    const row = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { status: true },
    });
    expect(row.status).toBe("DELETED");
  });

  // =========================================================================
  // 🔴 T41 (Blok 12A) — `canModerate()` qapısı AuditLog izi TƏLƏB EDİR
  // =========================================================================
  //
  // `deleteMemory` moderatora BAŞQASININ xatirəsini silmək icazəsi verir.
  // `lib/visibility.ts:147` («Hər çağırışda AuditLog yaz») və
  // `services/report.service.ts:9` bunu qayda kimi yazır; `deletePost` və
  // `deleteComment` artıq tətbiq edir. Buradakı iki test həmin qaydanı
  // xatirə səthində də bərkidir.

  it("🔴 T41 — MODERATOR başqasının xatirəsini silsə AuditLog sətri yaranır", async () => {
    const memoryId = await createFor(member, { title: "Moderasiya olunacaq xatirə" });

    const before = await prisma.auditLog.count({
      where: { entityId: memoryId, action: "MODERATE" },
    });
    expect(before).toBe(0);

    const result = await deleteMemory(moderator, memoryId);
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const rows = await prisma.auditLog.findMany({
      where: { entityId: memoryId, action: "MODERATE" },
      select: { actorId: true, entityType: true, metadata: true },
    });

    expect(rows, "moderasiya izi yazılmayıb — moderator izsiz məzmun silir").toHaveLength(1);
    expect(rows[0].actorId).toBe(moderator.userId);
    expect(rows[0].entityType).toBe("MEMORY");

    // Metadata müəllifi göstərir (kimin məzmunu silinib) — mətn DAŞIMIR.
    const metadata = JSON.parse(rows[0].metadata ?? "{}") as Record<string, unknown>;
    expect(metadata.operation).toBe("deleteMemory");
    expect(metadata.ownerId).toBe(member.userId);
    // 🔴 Ağ siyahı: xatirənin MƏTNİ jurnala düşməməlidir.
    expect(JSON.stringify(metadata)).not.toContain("İnteqrasiya testinin");
  });

  it("SAHİB öz xatirəsini silsə audit sətri YAZILMIR (moderasiya deyil)", async () => {
    const memoryId = await createFor(member, { title: "Sahibin sildiyi xatirə" });

    const result = await deleteMemory(member, memoryId);
    expect(result.ok).toBe(true);

    const count = await prisma.auditLog.count({ where: { entityId: memoryId } });
    expect(count, "adi silmə moderasiya deyil — jurnal şişirdilməməlidir").toBe(0);
  });
});

// ===========================================================================
// 5. Dəstək təklifləri
// ===========================================================================

describe("listCohortSupportOffers", () => {
  it("🔴 `openToSupport = false` istifadəçi ÇIXMIR", async () => {
    // --- SANITY: sinifdə təklifi olan, amma razılıq verməyən istifadəçi var ---
    const closed = await prisma.user.findMany({
      where: {
        openToSupport: false,
        memberships: { some: { cohortId: alumniCohortId } },
        supportOffers: { some: {} },
      },
      select: { id: true },
    });
    expect(closed.length, "razılıq verməyən, təklifi olan istifadəçi").toBeGreaterThan(0);

    const offers = await listCohortSupportOffers(alumni, alumniCohortId);
    const shownIds = new Set(offers.map((offer) => offer.user.id));

    for (const row of closed) {
      expect(shownIds.has(row.id), `${row.id} razılıq vermədən göründü`).toBe(false);
    }
    expect(offers.length).toBeGreaterThan(0);
  });

  it("🔴 cavabda `phone` / `personalEmail` YOXDUR", async () => {
    const offers = await listCohortSupportOffers(alumni, alumniCohortId);
    expect(offers.length).toBeGreaterThan(0);

    for (const offer of offers) {
      const keys = Object.keys(offer.user);
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("personalEmail");
      expect(keys).not.toContain("email");
      expect(JSON.stringify(offer)).not.toContain("@qu.edu.az");
    }
  });

  it("üzv olmayan viewer üçün siyahı BOŞDUR", async () => {
    expect(await listCohortSupportOffers(member, alumniCohortId)).toEqual([]);
    expect(await listCohortSupportOffers(ANONYMOUS, alumniCohortId)).toEqual([]);
  });

  it("hər sətrin növü 7 dəstək növündən biridir", async () => {
    const offers = await listCohortSupportOffers(alumni, alumniCohortId);
    const types = new Set(offers.map((offer) => offer.type));

    for (const type of types) {
      expect([
        "GUEST_LECTURE",
        "CAREER_TALK",
        "INTERNSHIP",
        "JOB_SHARING",
        "MENTORING",
        "STARTUP_COLLAB",
        "EVENT_PARTICIPATION",
      ]).toContain(type);
    }
  });
});

// ===========================================================================
// 6. Başlıq zolağı
// ===========================================================================

describe("getCohortHeadlineStats", () => {
  it("real sinifdə saylar qaytarır", async () => {
    const stats = await getCohortHeadlineStats(member, cohortId);

    expect(stats).not.toBeNull();
    if (!stats) return;

    const memberCount = await prisma.cohortMembership.count({ where: { cohortId } });
    expect(stats.memberCount).toBe(memberCount);
    expect(isHeadlineStatsVisible(stats.memberCount)).toBe(true);
    expect(stats.cityCount).toBeGreaterThanOrEqual(0);
    expect(stats.countryCount).toBeGreaterThanOrEqual(0);
  });

  it("🔴 nailiyyət sayı YALNIZ VERIFIED + FEATURED (SUBMITTED açıqlanmır)", async () => {
    const stats = await getCohortHeadlineStats(member, cohortId);
    expect(stats).not.toBeNull();
    if (!stats) return;

    const [approved, submitted] = await Promise.all([
      prisma.achievement.count({
        where: { cohortId, status: { in: ["VERIFIED", "FEATURED"] } },
      }),
      prisma.achievement.count({ where: { cohortId, status: "SUBMITTED" } }),
    ]);

    expect(submitted, "sinifdə SUBMITTED nailiyyət").toBeGreaterThan(0);
    // Sahibin öz SUBMITTED qeydi `visibleWithStatus` sahib şaxəsindən keçir,
    // ona görə say TAM bərabər olmaya bilər — amma SUBMITTED-lərin HAMISINI
    // əlavə etməməlidir.
    expect(stats.achievementCount).toBeLessThan(approved + submitted);
    expect(stats.achievementCount).toBeGreaterThan(0);
  });

  it("🔴 kiçik sinifdə zolaq TAMAMİLƏ gizlənir (`null`)", async () => {
    // Müvəqqəti 2 nəfərlik sinif yaradılır və testin sonunda tam silinir.
    const cohort = await prisma.cohort.create({
      data: {
        id: "coh-tiny-test",
        slug: "kicik-sinif-testi",
        displayName: "Kiçik sinif — test",
        admissionYear: 2026,
        graduationYear: 2030,
        academicStartsAt: new Date("2026-09-01"),
        graduatesAt: new Date("2030-06-30"),
      },
      select: { id: true },
    });

    try {
      const members = await prisma.user.findMany({ take: 2, select: { id: true } });
      await prisma.cohortMembership.createMany({
        data: members.map((user) => ({ userId: user.id, cohortId: cohort.id })),
      });

      const viewer: UserViewer = {
        ...member,
        cohortIds: [...member.cohortIds, cohort.id],
      };

      expect(await getCohortHeadlineStats(viewer, cohort.id)).toBeNull();
    } finally {
      await prisma.cohortMembership.deleteMany({ where: { cohortId: cohort.id } });
      await prisma.cohort.delete({ where: { id: cohort.id } });
    }
  });
});
