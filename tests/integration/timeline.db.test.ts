// @vitest-environment node
// ============================================================================
// tests/integration/timeline.db.test.ts
// Blok 8 [M8 + M10] — xronologiya, sistem milestone-ları və nailiyyət
// moderasiyasının REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALI — İKİ FUNKSİYANIN FƏRQİ (TƏLƏ A):
//   moderator BAŞQASININ `SUBMITTED` nailiyyətini
//     · `listAchievements` ilə GÖRMÜRmü?        (görməməlidir — adi oxu yolu)
//     · `listModerationQueue` ilə GÖRÜRmü?      (görməlidir — moderasiya yolu)
//   Bu iki cavab ayrılmasa moderasiya bayrağı adi oxu yoluna sızardı.
//
// ⚠️ Fayl YAZIR (`ensureCohortMilestones`, moderasiya qərarları), ona görə
// `profile.db.test.ts` ilə eyni intizam: yaradılan/dəyişdirilən hər sətir
// `finally`-də və ya `afterAll`-da geri qaytarılır — seed determinizmi
// pozulmamalıdır (növbəti icra eyni bazanı görməlidir).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AchievementStatus, Visibility } from "@/lib/enums";
import { buildCohortMilestones, milestoneId } from "@/lib/milestones";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";
import {
  ModerationForbiddenError,
  listAchievements,
  listFeaturedAchievements,
  listModerationQueue,
  getAchievementStats,
  rejectAchievement,
  verifyAchievement,
} from "@/services/achievement.service";
import { ensureCohortMilestones, listTimeline } from "@/services/timeline.service";

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

/** PLAN.md §7 test hesabları — hamısı `sec2023`-dədir (alumni istisna). */
let moderator: UserViewer;
let member: UserViewer;
let admin: UserViewer;
let alumni: UserViewer;
let cohortId: string;

beforeAll(async () => {
  [moderator, member, admin, alumni] = await Promise.all([
    viewerOf("moderator@qu.edu.az"),
    viewerOf("rep@qu.edu.az"),
    viewerOf("admin@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  // Sanity: moderator MƏHZ moderatordur, `rep` isə DEYİL — testlərin mənası
  // bundan asılıdır.
  expect(moderator.moderatedCohortIds.length).toBeGreaterThan(0);
  expect(member.moderatedCohortIds).toEqual([]);
  expect(admin.systemRole).toBe("UNIVERSITY_ADMIN");

  cohortId = moderator.moderatedCohortIds[0];
  expect(member.cohortIds).toContain(cohortId);
  // Məzun BAŞQA sinifdədir — "fərqli cohort" testləri üçün.
  expect(alumni.cohortIds).not.toContain(cohortId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===========================================================================
// 1. 🔴 TƏLƏ A — `listAchievements` ≠ `listModerationQueue`
// ===========================================================================

describe("moderasiya növbəsi vs adi oxu", () => {
  it("moderator BAŞQASININ SUBMITTED nailiyyətini `listAchievements`-də GÖRMÜR", async () => {
    // --- SANITY: belə nailiyyət bazada var (boş nəticə ilə yaşıl olma tələsi) ---
    const submitted = await prisma.achievement.findMany({
      where: {
        cohortId,
        status: AchievementStatus.SUBMITTED,
        ownerId: { not: moderator.userId },
      },
      select: { id: true },
    });
    expect(submitted.length, "sinifdə başqasının SUBMITTED nailiyyəti").toBeGreaterThan(0);

    const visible = await listAchievements(moderator, { cohortId, take: ALL });
    const visibleIds = new Set(visible.map((item) => item.id));

    for (const row of submitted) {
      expect(visibleIds.has(row.id), `${row.id} adi oxu yolunda göründü`).toBe(false);
    }

    // Adi yol yalnız VERIFIED / FEATURED (və sahibin öz qeydləri) verir.
    for (const item of visible) {
      if (item.owner.id === moderator.userId) continue;
      expect([AchievementStatus.VERIFIED, AchievementStatus.FEATURED]).toContain(
        item.status,
      );
    }
  });

  it("moderator EYNİ nailiyyətləri `listModerationQueue` ilə GÖRÜR", async () => {
    const queue = await listModerationQueue(moderator, cohortId, ALL);
    const queueIds = new Set(queue.map((item) => item.id));

    const submitted = await prisma.achievement.findMany({
      where: { cohortId, status: AchievementStatus.SUBMITTED },
      select: { id: true },
    });

    expect(submitted.length).toBeGreaterThan(0);
    for (const row of submitted) {
      expect(queueIds.has(row.id), `${row.id} növbədə yoxdur`).toBe(true);
    }

    // Növbədə YALNIZ SUBMITTED olur.
    for (const item of queue) expect(item.status).toBe(AchievementStatus.SUBMITTED);
  });

  it("növbədə görünürlük filtri YOXDUR — PRIVATE / CLASS nailiyyət də gəlir", async () => {
    const queue = await listModerationQueue(moderator, cohortId, ALL);
    const levels = new Set(queue.map((item) => item.visibility));

    // Moderasiya ayrı axındır: səviyyə növbəni kəsmir.
    const restricted = await prisma.achievement.count({
      where: {
        cohortId,
        status: AchievementStatus.SUBMITTED,
        visibility: { in: [Visibility.CLASS, Visibility.PRIVATE] },
      },
    });

    if (restricted > 0) {
      expect(
        [...levels].some((level) =>
          ([Visibility.CLASS, Visibility.PRIVATE] as string[]).includes(level),
        ),
      ).toBe(true);
    }

    expect(queue.length).toBe(
      await prisma.achievement.count({
        where: { cohortId, status: AchievementStatus.SUBMITTED },
      }),
    );
  });

  it("🔴 adi üzv (CLASS_REPRESENTATIVE) növbəni AÇA BİLMİR", async () => {
    await expect(listModerationQueue(member, cohortId, ALL)).rejects.toThrow(
      ModerationForbiddenError,
    );
  });

  it("moderator BAŞQA sinfin növbəsini aça bilmir", async () => {
    const otherCohortId = alumni.cohortIds[0];
    await expect(listModerationQueue(moderator, otherCohortId, ALL)).rejects.toThrow(
      ModerationForbiddenError,
    );
  });

  it("UNIVERSITY_ADMIN bütün siniflərin növbəsini aça bilir", async () => {
    const queue = await listModerationQueue(admin, cohortId, ALL);
    expect(Array.isArray(queue)).toBe(true);
  });

  it("anonim viewer növbəni aça bilmir", async () => {
    await expect(listModerationQueue(ANONYMOUS, cohortId, ALL)).rejects.toThrow(
      ModerationForbiddenError,
    );
  });
});

// ===========================================================================
// 2. Sahib öz SUBMITTED nailiyyətini adi siyahıda görür
// ===========================================================================

describe("sahib şaxəsi", () => {
  it("sahib öz SUBMITTED nailiyyətini `listAchievements`-də görür", async () => {
    const own = await prisma.achievement.findFirst({
      where: { cohortId, status: AchievementStatus.SUBMITTED },
      select: { id: true, ownerId: true },
      orderBy: { id: "asc" },
    });
    expect(own, "SUBMITTED nailiyyəti olan seed istifadəçisi").not.toBeNull();

    const owner = await viewerOfUser(own!.ownerId);
    const items = await listAchievements(owner, { cohortId, take: ALL });

    expect(items.map((item) => item.id)).toContain(own!.id);
  });

  it("seçilmiş siyahı sahibin SUBMITTED qeydini GƏTİRMİR (status şərti ayrıca qurulur)", async () => {
    const own = await prisma.achievement.findFirstOrThrow({
      where: { cohortId, status: AchievementStatus.SUBMITTED },
      select: { id: true, ownerId: true },
      orderBy: { id: "asc" },
    });

    const owner = await viewerOfUser(own.ownerId);
    const featured = await listFeaturedAchievements(owner, cohortId, ALL);

    expect(featured.map((item) => item.id)).not.toContain(own.id);
    for (const item of featured) expect(item.status).toBe(AchievementStatus.FEATURED);
  });

  it("fərqli cohort üzvü CLASS nailiyyətini görmür", async () => {
    // --- SANITY: sinifdə CLASS səviyyəli təsdiqlənmiş nailiyyət var ---
    const classLevel = await prisma.achievement.findMany({
      where: {
        cohortId,
        visibility: Visibility.CLASS,
        status: { in: [AchievementStatus.VERIFIED, AchievementStatus.FEATURED] },
      },
      select: { id: true },
    });
    expect(classLevel.length, "CLASS səviyyəli təsdiqlənmiş nailiyyət").toBeGreaterThan(0);

    const outsiderView = await listAchievements(alumni, { cohortId, take: ALL });
    const outsiderIds = new Set(outsiderView.map((item) => item.id));

    for (const row of classLevel) {
      expect(outsiderIds.has(row.id), `${row.id} kənar sinfə göründü`).toBe(false);
    }
  });

  it("statistika sayları da görünürlükdən keçir", async () => {
    const memberStats = await getAchievementStats(member, cohortId);
    const outsiderStats = await getAchievementStats(alumni, cohortId);

    expect(memberStats.verifiedCount).toBeGreaterThan(0);
    // Kənar viewer CLASS qeydlərini saymır → rəqəm kiçikdir.
    expect(outsiderStats.verifiedCount).toBeLessThan(memberStats.verifiedCount);
  });
});

// ===========================================================================
// 3. Sistem milestone-ları (TƏLƏ B + idempotentlik)
// ===========================================================================

describe("ensureCohortMilestones", () => {
  it("iki dəfə çağırıldıqda DUBLİKAT yaranmır", async () => {
    const before = await prisma.timelineEntry.count({
      where: { cohortId, isSystemMilestone: true },
    });

    await ensureCohortMilestones(cohortId);
    const afterFirst = await prisma.timelineEntry.count({
      where: { cohortId, isSystemMilestone: true },
    });

    await ensureCohortMilestones(cohortId);
    const afterSecond = await prisma.timelineEntry.count({
      where: { cohortId, isSystemMilestone: true },
    });

    expect(afterFirst).toBe(afterSecond);
    // Seed EYNİ saf funksiyadan istifadə edir → say ilk çağırışdan sonra da
    // dəyişmir (əks halda seed determinizmi pozulardı).
    expect(afterFirst).toBe(before);
    expect(afterSecond).toBeGreaterThan(0);
  });

  it("id-lər deterministikdir — `mil-<cohortId>-<açar>`", async () => {
    const cohort = await prisma.cohort.findUniqueOrThrow({
      where: { id: cohortId },
      select: { id: true, admissionYear: true, academicStartsAt: true, graduatesAt: true },
    });

    const expected = buildCohortMilestones(cohort).map((milestone) => milestone.id);
    const rows = await prisma.timelineEntry.findMany({
      where: { cohortId, isSystemMilestone: true },
      select: { id: true },
    });

    expect(rows.map((row) => row.id).sort()).toEqual([...expected].sort());
    expect(expected).toContain(milestoneId(cohortId, "start"));
  });

  it("🔴 HEÇ BİR milestone PRIVATE deyil (TƏLƏ B — belə qeyd heç kimə görünməzdi)", async () => {
    const rows = await prisma.timelineEntry.findMany({
      where: { isSystemMilestone: true },
      select: { id: true, visibility: true, postId: true, achievementId: true, eventId: true },
    });

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.visibility, row.id).not.toBe(Visibility.PRIVATE);
      // Mənbə əlaqələri boşdur — sahib şaxəsi ona görə işləmir.
      expect(row.postId).toBeNull();
      expect(row.achievementId).toBeNull();
      expect(row.eventId).toBeNull();
    }
  });

  it("milestone-lar xronologiyada GÖRÜNÜR (sinif üzvü üçün)", async () => {
    const { items } = await listTimeline(member, { cohortId, take: ALL });
    const milestones = items.filter((item) => item.isSystemMilestone);

    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones.map((item) => item.id)).toContain(milestoneId(cohortId, "start"));
  });

  it("gələcək tarixli milestone bazada YOXDUR", async () => {
    const now = new Date();
    const future = await prisma.timelineEntry.count({
      where: { isSystemMilestone: true, occurredAt: { gt: now } },
    });

    expect(future).toBe(0);
  });
});

// ===========================================================================
// 4. Xronologiya filtrləri
// ===========================================================================

describe("listTimeline", () => {
  it("mənbə növü filtri yalnız həmin növü qaytarır", async () => {
    const { items, total } = await listTimeline(member, {
      cohortId,
      sourceType: "SYSTEM",
      take: ALL,
    });

    expect(items.length).toBeGreaterThan(0);
    expect(total).toBe(items.length);
    for (const item of items) expect(item.sourceType).toBe("SYSTEM");
  });

  it("tədris ili siyahısı kateqoriya filtrindən ASILI DEYİL", async () => {
    const base = await listTimeline(member, { cohortId, take: ALL });
    const filtered = await listTimeline(member, {
      cohortId,
      category: "FIRST_DAY",
      take: ALL,
    });

    expect(filtered.academicYears).toEqual(base.academicYears);
    expect(filtered.total).toBeLessThanOrEqual(base.total);
  });

  it("`total` səhifələmədən ASILI DEYİL", async () => {
    const first = await listTimeline(member, { cohortId, take: 5, skip: 0 });
    const second = await listTimeline(member, { cohortId, take: 5, skip: 5 });

    expect(first.total).toBe(second.total);
    expect(first.items).toHaveLength(5);

    const overlap = first.items
      .map((item) => item.id)
      .filter((id) => second.items.some((item) => item.id === id));
    expect(overlap).toEqual([]);
  });

  it("anonim viewer yalnız PUBLIC qeyd görür", async () => {
    const { items } = await listTimeline(ANONYMOUS, { cohortId, take: ALL });
    for (const item of items) expect(item.visibility).toBe(Visibility.PUBLIC);
  });
});

// ===========================================================================
// 5. Moderasiya qərarı — TimelineEntry + AuditLog (TƏLƏ C)
// ===========================================================================

describe("moderasiya qərarı", () => {
  it("təsdiq TimelineEntry yaradır, arxivləmə SİLİR (TƏLƏ C)", async () => {
    const target = await prisma.achievement.findFirstOrThrow({
      where: { cohortId, status: AchievementStatus.SUBMITTED },
      select: {
        id: true,
        status: true,
        visibility: true,
        verifiedById: true,
        verifiedAt: true,
        verifyNote: true,
        awardedAt: true,
      },
      orderBy: { id: "asc" },
    });

    try {
      const verified = await verifyAchievement(moderator, target.id, "Test təsdiqi");
      expect(verified.ok).toBe(true);

      const entry = await prisma.timelineEntry.findUnique({
        where: { achievementId: target.id },
        select: { id: true, visibility: true, occurredAt: true, sourceType: true },
      });

      expect(entry, "təsdiqdən sonra TimelineEntry").not.toBeNull();
      expect(entry!.sourceType).toBe("ACHIEVEMENT");
      // Görünürlük nailiyyətdən KOPYALANIR, ondan açıq ola bilməz.
      expect(entry!.visibility).toBe(target.visibility);
      // Xronologiya `awardedAt`-a görə düzülür, təsdiq tarixinə görə yox.
      expect(entry!.occurredAt.getTime()).toBe(target.awardedAt.getTime());

      // AuditLog MƏCBURİDİR.
      const audit = await prisma.auditLog.findMany({
        where: { entityId: target.id, actorId: moderator.userId },
        select: { action: true, metadata: true },
      });
      expect(audit.length).toBeGreaterThan(0);
      expect(JSON.parse(audit[0].metadata!)).toMatchObject({
        from: AchievementStatus.SUBMITTED,
        to: AchievementStatus.VERIFIED,
      });

      // Sahibə bildiriş getdi.
      const notifications = await prisma.notification.count({
        where: { entityId: target.id, actorId: moderator.userId },
      });
      expect(notifications).toBeGreaterThan(0);

      // --- TƏLƏ C: arxivləmə sətri saxlayır, qeyd isə silinməlidir ---
      const rejected = await rejectAchievement(moderator, target.id, "Test rədd");
      expect(rejected.ok).toBe(true);

      const afterReject = await prisma.timelineEntry.findUnique({
        where: { achievementId: target.id },
        select: { id: true },
      });
      expect(afterReject, "arxivləmədən sonra TimelineEntry qaldı").toBeNull();

      const row = await prisma.achievement.findUniqueOrThrow({
        where: { id: target.id },
        select: { status: true },
      });
      expect(row.status).toBe(AchievementStatus.ARCHIVED);
    } finally {
      // --- TƏMİZLİK: seed vəziyyəti bayt-bayt geri qaytarılır ---
      await prisma.timelineEntry.deleteMany({ where: { achievementId: target.id } });
      await prisma.auditLog.deleteMany({
        where: { entityId: target.id, actorId: moderator.userId },
      });
      await prisma.notification.deleteMany({
        where: { entityId: target.id, actorId: moderator.userId },
      });
      await prisma.achievement.update({
        where: { id: target.id },
        data: {
          status: target.status,
          verifiedById: target.verifiedById,
          verifiedAt: target.verifiedAt,
          verifyNote: target.verifyNote,
        },
      });
    }
  });

  it("adi üzv qərar verə bilmir (FORBIDDEN) və heç nə dəyişmir", async () => {
    const target = await prisma.achievement.findFirstOrThrow({
      where: { cohortId, status: AchievementStatus.SUBMITTED },
      select: { id: true, status: true },
      orderBy: { id: "asc" },
    });

    const result = await verifyAchievement(member, target.id, "icazəsiz");
    expect(result).toEqual({ ok: false, reason: "FORBIDDEN" });

    const row = await prisma.achievement.findUniqueOrThrow({
      where: { id: target.id },
      select: { status: true },
    });
    expect(row.status).toBe(target.status);

    const audit = await prisma.auditLog.count({
      where: { entityId: target.id, actorId: member.userId },
    });
    expect(audit).toBe(0);
  });

  it("mövcud olmayan nailiyyət NOT_FOUND verir", async () => {
    const result = await verifyAchievement(moderator, "ach-yoxdur", null);
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// Köməkçi
// ---------------------------------------------------------------------------

async function viewerOfUser(userId: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
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
