// @vitest-environment node
// ============================================================================
// tests/integration/admin.db.test.ts
// Blok 11B [M17] — admin panelinin REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALLARI (yeddi tələnin ölçülməsi):
//   A. Moderasiya növbəsi məzmunu göstərirmi? Baxış AuditLog yazırmı?
//   B. DB-də rolu endirilmiş istifadəçi admin qapısından keçirmi?
//   C. Admin özünü / sonuncu admini kilidləyə bilirmi?
//   D. `audit.service`-də silmə yolu varmı? (ayrıca `audit.service.test.ts`)
//   E. `previewImport` yazırmı? Səhvli fayl qismən yazırmı?
//   F. Eyni slug ilə ikinci sinif yaradıla bilirmi?
//   G. (dashboard — `admin-series.test.ts`-də saf funksiya kimi)
//
// ⚠️ Bu fayl YAZIR (rol, deaktivasiya, şikayət qərarı, sinif, istifadəçi).
// Mövcud intizam saxlanılır: dəyişdirilən hər sətir `afterAll`-da GERİ
// QAYTARILIR, yaradılan hər sətir SİLİNİR — seed determinizmi pozulmamalıdır.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { emptyAdminUserFilters, emptyAuditFilters, emptyModerationFilters } from "@/lib/admin-filters";
import { AdminForbiddenError } from "@/lib/admin-guard";
import { UNSET_PASSWORD_HASH } from "@/lib/constants";
import {
  AchievementStatus,
  CohortRole,
  ReportEntityType,
  ReportStatus,
  SystemRole,
} from "@/lib/enums";
import { SIS_COLUMNS } from "@/lib/sis-import";
import type { Viewer } from "@/lib/visibility";
import {
  changeSystemRole,
  exportAdminUsers,
  listAdminUsers,
  setUserActivation,
} from "@/services/admin-users.service";
import { createCohort } from "@/services/admin-cohorts.service";
import { getAdminDashboardStats } from "@/services/admin.service";
import { countAuditLog, listAuditLog } from "@/services/audit.service";
import { listUniversityModerationQueue } from "@/services/achievement.service";
import { listFeed } from "@/services/post.service";
import {
  decideReport,
  listReportQueue,
  openModerationReview,
} from "@/services/moderation.service";
import { commitImport, previewImport } from "@/services/sis-import.service";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

const ALL = 1000;

/** Seed hesabları. */
let adminId: string;
let secondAdminId: string;
let plainUserId: string;

/** Viewer qurucuları — `systemRole` sahəsi QƏSDƏN səhv verilə bilər (TƏLƏ B). */
function viewerOf(userId: string, systemRole: "USER" | "UNIVERSITY_ADMIN"): UserViewer {
  return { kind: "USER", userId, cohortIds: [], systemRole, moderatedCohortIds: [] };
}

/** Testin yaratdığı sətirlər — `afterAll`-da təmizlənir. */
const createdUserEmails: string[] = [];
const createdCohortSlugs: string[] = [];
/**
 * Testin dəyişdirdiyi sətirlər — əvvəlki dəyər.
 *
 * 🔴 `updatedAt` DA SAXLANILIR: `User.updatedAt` sxemdə `@updatedAt`-dir, yəni
 * hər Prisma `update` onu AVTOMATİK yeniləyir — bərpa edən `update` də daxil.
 * Adi `prisma.user.update()` ilə geri qaytarsaq sətrin dəyəri düzəlir, amma
 * `updatedAt` təzə damğa alır və seed determinizmi pozulur. Ona görə bərpa XAM
 * SQL ilə aparılır (`$executeRaw` Prisma-nın avtomatik sahə məntiqindən keçmir).
 */
const touchedUsers = new Map<
  string,
  { systemRole: string; deactivatedAt: Date | null; updatedAt: Date }
>();
const touchedReports = new Map<
  string,
  {
    status: string;
    resolvedById: string | null;
    resolvedAt: Date | null;
    resolution: string | null;
  }
>();
/**
 * 🔴 TƏMİZLİK `id` ÇOXLUĞU İLƏ APARILIR, «ƏN YENİ N SƏTRİ SİL» İLƏ YOX.
 *
 * Seed audit və bildiriş sətirlərinin bir hissəsi GƏLƏCƏK tarixlidir
 * (`resolvedAt = createdAt + 1..10 gün` bugünü keçə bilər), yəni `createdAt
 * desc` sıralaması ilə silmək SEED sətirlərini aparır və sayı düz qalsa da
 * MƏZMUN sürüşür — determinizm testi məhz bunu tutdu.
 */
let auditIdsBefore = new Set<string>();
let notificationIdsBefore = new Set<string>();

async function rememberUser(id: string): Promise<void> {
  if (touchedUsers.has(id)) return;
  const row = await prisma.user.findUnique({
    where: { id },
    select: { systemRole: true, deactivatedAt: true, updatedAt: true },
  });
  if (row) touchedUsers.set(id, row);
}

async function rememberReport(id: string): Promise<void> {
  if (touchedReports.has(id)) return;
  const row = await prisma.report.findUnique({
    where: { id },
    select: { status: true, resolvedById: true, resolvedAt: true, resolution: true },
  });
  if (row) touchedReports.set(id, row);
}

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@qu.edu.az" },
    select: { id: true },
  });
  const plain = await prisma.user.findUnique({
    where: { email: "rep@qu.edu.az" },
    select: { id: true },
  });

  expect(admin, "seed-də admin@qu.edu.az olmalıdır").toBeTruthy();
  expect(plain, "seed-də rep@qu.edu.az olmalıdır").toBeTruthy();

  adminId = admin!.id;
  plainUserId = plain!.id;

  // «Sonuncu admin» qaydasını sınamaq üçün İKİNCİ admin lazımdır — seed-də
  // yalnız biri var, ona görə test özü yaradır və sonda geri qaytarır.
  const second = await prisma.user.findUnique({
    where: { email: "alumni@qu.edu.az" },
    select: { id: true },
  });
  secondAdminId = second!.id;

  auditIdsBefore = new Set(
    (await prisma.auditLog.findMany({ select: { id: true } })).map((r) => r.id),
  );
  notificationIdsBefore = new Set(
    (await prisma.notification.findMany({ select: { id: true } })).map((r) => r.id),
  );
});

afterAll(async () => {
  // 1. Dəyişdirilən istifadəçilər — XAM SQL (bax `touchedUsers` şərhi:
  //    `prisma.user.update` `@updatedAt`-i avtomatik yeniləyər və determinizm
  //    pozulardı).
  for (const [id, before] of touchedUsers) {
    await prisma.$executeRaw`
      UPDATE User
         SET systemRole = ${before.systemRole},
             deactivatedAt = ${before.deactivatedAt},
             updatedAt = ${before.updatedAt}
       WHERE id = ${id}
    `;
  }

  // 2. Dəyişdirilən şikayətlər
  for (const [id, before] of touchedReports) {
    await prisma.report.update({ where: { id }, data: before });
  }

  // 3. Yaradılan istifadəçilər (üzvlük və məxfilik sətirləri cascade ilə gedir)
  if (createdUserEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });
  }

  // 4. Yaradılan siniflər — əvvəl törəmə milestone sətirləri
  if (createdCohortSlugs.length > 0) {
    const cohorts = await prisma.cohort.findMany({
      where: { slug: { in: createdCohortSlugs } },
      select: { id: true },
    });
    const ids = cohorts.map((c) => c.id);
    await prisma.timelineEntry.deleteMany({ where: { cohortId: { in: ids } } });
    await prisma.cohort.deleteMany({ where: { id: { in: ids } } });
  }

  // 5. Testin yazdığı audit və bildiriş sətirləri — `id` ÇOXLUĞU ilə (yuxarıya
  //    bax: «ən yeni N» sıralaması seed-in gələcək tarixli sətirlərini aparır).
  const audits = await prisma.auditLog.findMany({ select: { id: true } });
  const extraAudits = audits.filter((row) => !auditIdsBefore.has(row.id));
  if (extraAudits.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { id: { in: extraAudits.map((a) => a.id) } },
    });
  }

  const notifications = await prisma.notification.findMany({ select: { id: true } });
  const extraNotifications = notifications.filter(
    (row) => !notificationIdsBefore.has(row.id),
  );
  if (extraNotifications.length > 0) {
    await prisma.notification.deleteMany({
      where: { id: { in: extraNotifications.map((n) => n.id) } },
    });
  }

  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 🔴 TƏLƏ B — ROL BAZADAN OXUNUR, TOKEN-DƏN YOX
// ---------------------------------------------------------------------------

describe("TƏLƏ B — köhnə token admin qapısından keçmir", () => {
  it("🔴 `systemRole: UNIVERSITY_ADMIN` YAZILMIŞ viewer, DB-də USER-dirsə RƏDD olunur", async () => {
    // Bu, MƏHZ köhnəlmiş JWT ssenarisidir: token-in içindəki rol adminidir,
    // baza isə artıq başqa şey deyir.
    const staleToken = viewerOf(plainUserId, SystemRole.UNIVERSITY_ADMIN);

    await expect(getAdminDashboardStats(staleToken)).rejects.toThrow(AdminForbiddenError);
    await expect(listAuditLog(staleToken, emptyAuditFilters())).rejects.toThrow(
      AdminForbiddenError,
    );
    await expect(
      listReportQueue(staleToken, emptyModerationFilters()),
    ).rejects.toThrow(AdminForbiddenError);
  });

  it("🔴 DB-də rol ENDİRİLƏNDƏ qapı DƏRHAL bağlanır", async () => {
    await rememberUser(secondAdminId);

    // (1) əvvəlcə admin edirik — qapı açılır
    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.UNIVERSITY_ADMIN },
    });
    const viewer = viewerOf(secondAdminId, SystemRole.UNIVERSITY_ADMIN);
    await expect(getAdminDashboardStats(viewer)).resolves.toBeTruthy();

    // (2) DB-də endiririk — TOKEN DƏYİŞMİR (viewer obyekti eynidir)
    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.USER },
    });
    await expect(getAdminDashboardStats(viewer)).rejects.toThrow(AdminForbiddenError);
  });

  it("🔴 DEAKTİV admin də rədd olunur", async () => {
    await rememberUser(secondAdminId);
    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.UNIVERSITY_ADMIN, deactivatedAt: new Date() },
    });

    const viewer = viewerOf(secondAdminId, SystemRole.UNIVERSITY_ADMIN);
    await expect(getAdminDashboardStats(viewer)).rejects.toThrow(AdminForbiddenError);

    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.USER, deactivatedAt: null },
    });
  });

  it("adi istifadəçi BÜTÜN admin funksiyalarında icazə xətası alır", async () => {
    const viewer = viewerOf(plainUserId, SystemRole.USER);

    await expect(getAdminDashboardStats(viewer)).rejects.toThrow(AdminForbiddenError);
    await expect(listAdminUsers(viewer, emptyAdminUserFilters())).rejects.toThrow(
      AdminForbiddenError,
    );
    await expect(listAuditLog(viewer, emptyAuditFilters())).rejects.toThrow(
      AdminForbiddenError,
    );
    await expect(listReportQueue(viewer, emptyModerationFilters())).rejects.toThrow(
      AdminForbiddenError,
    );
    await expect(listUniversityModerationQueue(viewer)).rejects.toThrow(
      AdminForbiddenError,
    );
    await expect(previewImport(viewer, "x")).rejects.toThrow(AdminForbiddenError);
    await expect(
      createCohort(viewer, {
        programId: "x",
        admissionYear: 2026,
        graduationYear: 2030,
        academicStartsAt: new Date("2026-09-01"),
        graduatesAt: new Date("2030-06-30"),
        welcomeMessage: null,
      }),
    ).rejects.toThrow(AdminForbiddenError);
  });

  it("anonim viewer də rədd olunur", async () => {
    await expect(getAdminDashboardStats({ kind: "ANONYMOUS" })).rejects.toThrow(
      AdminForbiddenError,
    );
  });
});

// ---------------------------------------------------------------------------
// 🔴 TƏLƏ A — NÖVBƏ MƏZMUNU GÖSTƏRMİR, BAXIŞ AUDIT YAZIR
// ---------------------------------------------------------------------------

/** Obyekt qrafında MƏTN sahəsi axtarır — rekursiv açar gəzişi. */
function findForbiddenKeys(value: unknown, forbidden: readonly string[]): string[] {
  const found: string[] = [];

  const walk = (node: unknown, path: string) => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (forbidden.includes(key)) found.push(`${path}.${key}`);
      walk(child, `${path}.${key}`);
    }
  };

  walk(value, "$");
  return found;
}

describe("TƏLƏ A — moderasiya növbəsi", () => {
  it("🔴 növbə cavabında hədəfin `body` / `title` SAHƏLƏRİ YOXDUR", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const items = await listReportQueue(viewer, emptyModerationFilters(), ALL);

    expect(items.length, "seed-də şikayət olmalıdır").toBeGreaterThan(0);

    // ⚠️ `details` İSTİSNADIR — o, ŞİKAYƏTÇİNİN öz mətnidir, şikayət olunan
    // məzmun deyil. `resolution` da moderatorun öz qeydidir.
    const offenders = findForbiddenKeys(items, [
      "body",
      "title",
      "description",
      "answer",
      "question",
      "summary",
      "bio",
    ]);

    expect(
      offenders,
      `növbə cavabında MƏZMUN sahəsi tapıldı: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("hədəfin GÖRÜNÜRLÜK SƏVİYYƏSİ göstərilir (məzmun olmadan prioritet üçün)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const items = await listReportQueue(
      viewer,
      { ...emptyModerationFilters(), entityType: ReportEntityType.POST },
      ALL,
    );

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.target.exists).toBe(true);
      expect(item.target.visibility).toBeTruthy();
    }
  });

  it("🔴 «baxış» çağırıldıqda AuditLog sətri YARANIR və məzmun QAYIDIR", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const [report] = await listReportQueue(
      viewer,
      { ...emptyModerationFilters(), entityType: ReportEntityType.POST },
      1,
    );
    expect(report).toBeTruthy();

    const before = await prisma.auditLog.count({
      where: { action: "MODERATE", entityType: "Report", entityId: report.id },
    });

    const result = await openModerationReview(viewer, report.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // İndi məzmun VAR — baxışdan SONRA.
      expect(result.value.kind).toBeTruthy();
      expect(result.value.body ?? result.value.title).toBeTruthy();
    }

    const after = await prisma.auditLog.count({
      where: { action: "MODERATE", entityType: "Report", entityId: report.id },
    });
    expect(after, "baxış audit sətri yaratmadı").toBe(before + 1);
  });

  it("🔴 audit `metadata`-sında MƏZMUN YOXDUR (yalnız səviyyə və id-lər)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const [report] = await listReportQueue(
      viewer,
      { ...emptyModerationFilters(), entityType: ReportEntityType.POST },
      1,
    );

    const result = await openModerationReview(viewer, report.id);
    expect(result.ok).toBe(true);

    const entry = await prisma.auditLog.findFirst({
      where: { action: "MODERATE", entityType: "Report", entityId: report.id },
      orderBy: { createdAt: "desc" },
    });

    const metadata = JSON.parse(entry?.metadata ?? "{}") as Record<string, unknown>;
    for (const forbidden of ["body", "title", "description", "content"]) {
      expect(Object.keys(metadata)).not.toContain(forbidden);
    }

    // Məzmunun ÖZÜ də sətir kimi düşməməlidir.
    if (result.ok && result.value.body) {
      expect(entry?.metadata ?? "").not.toContain(result.value.body.slice(0, 20));
    }
  });

  it("🔴 admin üçün PRIVATE paylaşım ADİ OXU yolunda (listFeed) GÖRÜNMÜR", async () => {
    // Moderasiya AYRI axındır. Admin olmaq adi lenti genişləndirmir.
    const privatePost = await prisma.post.findFirst({
      where: { visibility: "PRIVATE", status: "ACTIVE", authorId: { not: adminId } },
      select: { id: true, cohortId: true },
    });

    if (!privatePost) {
      // Seed-də PRIVATE paylaşım yoxdursa test mənasızdır — açıq deyilir.
      expect(privatePost).toBeNull();
      return;
    }

    const viewer: UserViewer = {
      kind: "USER",
      userId: adminId,
      cohortIds: [privatePost.cohortId],
      systemRole: SystemRole.UNIVERSITY_ADMIN,
      moderatedCohortIds: [privatePost.cohortId],
    };

    const feed = await listFeed(viewer, { cohortId: privatePost.cohortId, take: ALL });
    expect(feed.items.map((item) => item.id)).not.toContain(privatePost.id);
  });

  it("`ACCESSIBILITY` qeydi «baxış» ilə açılmır (məzmunu yoxdur)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);

    const report = await prisma.report.create({
      data: {
        reporterId: plainUserId,
        entityType: ReportEntityType.ACCESSIBILITY,
        entityId: "/khankendi",
        reason: "OTHER",
        details: "Kontrast azdır (test).",
        status: ReportStatus.OPEN,
      },
      select: { id: true },
    });

    try {
      const result = await openModerationReview(viewer, report.id);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("NOT_CONTENT");

      // Audit sətri də YAZILMIR — baxılacaq şəxsi məlumat yoxdur.
      const audits = await prisma.auditLog.count({
        where: { entityType: "Report", entityId: report.id },
      });
      expect(audits).toBe(0);
    } finally {
      await prisma.report.delete({ where: { id: report.id } });
    }
  });
});

describe("şikayət qərarları", () => {
  it("hər qərar üçün AuditLog sətri var (say müqayisəsi)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const open = await prisma.report.findFirst({
      where: { status: ReportStatus.OPEN },
      select: { id: true },
    });
    expect(open).toBeTruthy();

    await rememberReport(open!.id);

    const auditBefore = await countAuditLog(viewer, emptyAuditFilters());
    const result = await decideReport(viewer, {
      reportId: open!.id,
      decision: ReportStatus.RESOLVED,
      resolution: "Test qərarı — məzmun yoxlanıldı.",
    });
    const auditAfter = await countAuditLog(viewer, emptyAuditFilters());

    expect(result.ok).toBe(true);
    expect(auditAfter).toBe(auditBefore + 1);

    const row = await prisma.report.findUnique({ where: { id: open!.id } });
    expect(row?.status).toBe(ReportStatus.RESOLVED);
    expect(row?.resolvedById).toBe(adminId);
  });

  it("`RESOLVED` üçün izah MƏCBURİDİR", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const open = await prisma.report.findFirst({
      where: { status: ReportStatus.OPEN },
      select: { id: true },
    });

    if (!open) return;

    const result = await decideReport(viewer, {
      reportId: open.id,
      decision: ReportStatus.RESOLVED,
      resolution: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("RESOLUTION_REQUIRED");
  });

  it("bağlanmış şikayət YENİDƏN açılmır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const closed = await prisma.report.findFirst({
      where: { status: ReportStatus.RESOLVED },
      select: { id: true },
    });
    expect(closed).toBeTruthy();

    const result = await decideReport(viewer, {
      reportId: closed!.id,
      decision: ReportStatus.IN_REVIEW,
      resolution: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ALREADY_CLOSED");
  });
});

// ---------------------------------------------------------------------------
// 🔴 TƏLƏ C — ADMİN ÖZÜNÜ KİLİDLƏYƏ BİLMİR
// ---------------------------------------------------------------------------

describe("TƏLƏ C — üç qoruma", () => {
  it("🔴 admin ÖZ sistem rolunu endirə bilmir", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);

    const result = await changeSystemRole(viewer, {
      targetId: adminId,
      nextRole: SystemRole.USER,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("SELF_DEMOTE");

    // Rol DƏYİŞMƏYİB.
    const row = await prisma.user.findUnique({
      where: { id: adminId },
      select: { systemRole: true },
    });
    expect(row?.systemRole).toBe(SystemRole.UNIVERSITY_ADMIN);
  });

  it("admin BAŞQA admini endirə bilir — və sistemdə admin qalır", async () => {
    // 🔴 «SONUNCU ADMİN» QAYDASI PRAKTİKADA YALNIZ YARIŞ HALINDA İŞƏ DÜŞÜR və
    // bu, zəiflik deyil, məqsəddir: əməliyyatı edən özü aktiv admindir, yəni
    // hədəfdən BAŞQA ən azı bir admin var (say ≥ 2). Say 1 YALNIZ iki eyni
    // anlı endirmə sorğusunda görünür — ona görə servis sayı transaksiya
    // İÇİNDƏ oxuyur (TOCTOU). Qaydanın özü `admin-rules.test.ts`-də saf
    // funksiya kimi HƏR kombinasiya üçün ölçülüb.
    //
    // Burada ölçülən: real axında endirmə işləyir və sistem adminsiz qalmır.
    await rememberUser(secondAdminId);
    await rememberUser(adminId);

    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.UNIVERSITY_ADMIN },
    });

    const second = viewerOf(secondAdminId, SystemRole.UNIVERSITY_ADMIN);
    const result = await changeSystemRole(second, {
      targetId: adminId,
      nextRole: SystemRole.USER,
    });

    expect(result.ok).toBe(true);

    const remaining = await prisma.user.count({
      where: { systemRole: SystemRole.UNIVERSITY_ADMIN, deactivatedAt: null },
    });
    expect(remaining, "sistem adminsiz qaldı").toBeGreaterThanOrEqual(1);

    // Qalan TƏK admin özünü endirə bilmir — real kilidlənmə yolu budur.
    const selfDemote = await changeSystemRole(second, {
      targetId: secondAdminId,
      nextRole: SystemRole.USER,
    });
    expect(selfDemote.ok).toBe(false);
    if (!selfDemote.ok) expect(selfDemote.reason).toBe("SELF_DEMOTE");

    // ⚠️ VƏZİYYƏT DƏRHAL BƏRPA OLUNUR: `afterAll` faylın SONUNDA işləyir və
    // bu testdən sonrakı bloklar `adminId`-nin admin olduğunu gözləyir.
    await prisma.user.update({
      where: { id: adminId },
      data: { systemRole: SystemRole.UNIVERSITY_ADMIN },
    });
    await prisma.user.update({
      where: { id: secondAdminId },
      data: { systemRole: SystemRole.USER },
    });
  });

  it("🔴 admin ÖZ hesabını deaktiv edə bilmir", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);

    const result = await setUserActivation(viewer, {
      targetId: adminId,
      deactivate: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("SELF_DEACTIVATE");

    const row = await prisma.user.findUnique({
      where: { id: adminId },
      select: { deactivatedAt: true },
    });
    expect(row?.deactivatedAt).toBeNull();
  });

  it("adi istifadəçi deaktiv edilir və BƏRPA olunur (məzmun silinmir)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    await rememberUser(plainUserId);

    const postsBefore = await prisma.post.count({ where: { authorId: plainUserId } });

    const off = await setUserActivation(viewer, {
      targetId: plainUserId,
      deactivate: true,
    });
    expect(off.ok).toBe(true);

    const deactivated = await prisma.user.findUnique({
      where: { id: plainUserId },
      select: { deactivatedAt: true },
    });
    expect(deactivated?.deactivatedAt).not.toBeNull();

    // 🔴 MƏZMUN QALIR — silmə deyil, deaktivasiya.
    expect(await prisma.post.count({ where: { authorId: plainUserId } })).toBe(postsBefore);

    const on = await setUserActivation(viewer, {
      targetId: plainUserId,
      deactivate: false,
    });
    expect(on.ok).toBe(true);
  });

  it("rol dəyişikliyi hədəfə BİLDİRİŞ göndərir və AuditLog yazır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    await rememberUser(plainUserId);

    const notificationsBefore = await prisma.notification.count({
      where: { recipientId: plainUserId },
    });
    const auditsBefore = await prisma.auditLog.count({
      where: { action: "ROLE_CHANGE", entityId: plainUserId },
    });

    const result = await changeSystemRole(viewer, {
      targetId: plainUserId,
      nextRole: SystemRole.UNIVERSITY_ADMIN,
    });
    expect(result.ok).toBe(true);

    expect(
      await prisma.notification.count({ where: { recipientId: plainUserId } }),
    ).toBe(notificationsBefore + 1);
    expect(
      await prisma.auditLog.count({
        where: { action: "ROLE_CHANGE", entityId: plainUserId },
      }),
    ).toBe(auditsBefore + 1);

    // Geri qaytar.
    await changeSystemRole(viewer, {
      targetId: plainUserId,
      nextRole: SystemRole.USER,
    });
  });
});

// ---------------------------------------------------------------------------
// CSV export — `redactProfile` qapısı
// ---------------------------------------------------------------------------

describe("CSV export", () => {
  it("🔴 ixracda PRIVATE sahə (telefon / şəxsi e-poçt) YOXDUR", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);

    // Telefonu olan istifadəçi seçilir — dəyər ixracda GÖRÜNMƏMƏLİDİR.
    const withPhone = await prisma.user.findFirst({
      where: { phone: { not: null }, id: { not: adminId } },
      select: { id: true, phone: true, personalEmail: true },
    });

    const { headers, rows } = await exportAdminUsers(viewer, emptyAdminUserFilters());

    expect(headers).not.toContain("Telefon");
    expect(headers).not.toContain("Şəxsi e-poçt");

    if (withPhone?.phone) {
      const flat = rows.flat().join("|");
      expect(flat, "telefon ixraca düşüb").not.toContain(withPhone.phone);
    }
    if (withPhone?.personalEmail) {
      const flat = rows.flat().join("|");
      expect(flat, "şəxsi e-poçt ixraca düşüb").not.toContain(withPhone.personalEmail);
    }
  });

  it("ixrac sətirləri cədvəllə eyni sayda sütun daşıyır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const { headers, rows } = await exportAdminUsers(viewer, emptyAdminUserFilters());

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveLength(headers.length);
  });
});

// ---------------------------------------------------------------------------
// 🔴 TƏLƏ F — COHORT SLUG-U TƏKRARLANA BİLMİR
// ---------------------------------------------------------------------------

describe("TƏLƏ F — cohort yaratma", () => {
  it("🔴 eyni ixtisas + eyni məzuniyyət ili İKİNCİ dəfə yaradıla bilmir", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const program = await prisma.program.findFirst({ select: { id: true, slug: true } });
    expect(program).toBeTruthy();

    const input = {
      programId: program!.id,
      admissionYear: 2041,
      graduationYear: 2045,
      academicStartsAt: new Date("2041-09-01T00:00:00.000Z"),
      graduatesAt: new Date("2045-06-30T00:00:00.000Z"),
      welcomeMessage: null,
    };

    const first = await createCohort(viewer, input);
    expect(first.ok).toBe(true);
    if (first.ok) createdCohortSlugs.push(first.value.slug);

    // İKİNCİ cəhd — slug deterministik olduğu üçün eyni dəyər çıxır.
    const second = await createCohort(viewer, input);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("SLUG_TAKEN");

    const count = await prisma.cohort.count({
      where: { slug: first.ok ? first.value.slug : "" },
    });
    expect(count).toBe(1);
  });

  it("tərs sıralı tarixlər rədd olunur (yazı getmir)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const program = await prisma.program.findFirst({ select: { id: true } });
    const before = await prisma.cohort.count();

    const result = await createCohort(viewer, {
      programId: program!.id,
      admissionYear: 2042,
      graduationYear: 2046,
      academicStartsAt: new Date("2046-09-01"),
      graduatesAt: new Date("2042-06-30"),
      welcomeMessage: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("ORDER");
    expect(await prisma.cohort.count()).toBe(before);
  });

  it("yaradılan sinif üçün milestone-lar qurulur (ensureCohortMilestones)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const program = await prisma.program.findFirst({ select: { id: true } });

    const result = await createCohort(viewer, {
      programId: program!.id,
      admissionYear: 2021,
      graduationYear: 2025,
      academicStartsAt: new Date("2021-09-01T00:00:00.000Z"),
      graduatesAt: new Date("2025-06-30T00:00:00.000Z"),
      welcomeMessage: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdCohortSlugs.push(result.value.slug);

    const milestones = await prisma.timelineEntry.count({
      where: { cohortId: result.value.id, isSystemMilestone: true },
    });
    // Keçmiş tarixli sinif olduğu üçün milestone-lar yaradılmalıdır.
    expect(milestones).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 🔴 TƏLƏ E — CSV IMPORT: QURU İCRA ƏVVƏL, YAZI SONRA
// ---------------------------------------------------------------------------

const IMPORT_HEADER = SIS_COLUMNS.join(",");

describe("TƏLƏ E — SIS importu", () => {
  it("🔴 `previewImport` BAZAYA YAZMIR", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const program = await prisma.program.findFirst({
      where: { cohorts: { some: {} } },
      select: { slug: true, faculty: { select: { slug: true } }, cohorts: { select: { admissionYear: true } } },
    });
    expect(program).toBeTruthy();

    const csv = [
      IMPORT_HEADER,
      `preview.test@qu.edu.az,Önizləmə,Testov,${program!.faculty.slug},${program!.slug},${program!.cohorts[0].admissionYear}`,
    ].join("\n");

    const before = await prisma.user.count();
    const result = await previewImport(viewer, csv);
    const after = await prisma.user.count();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(1);
      expect(result.value.rejected).toBe(0);
      expect(result.value.rows[0].outcome).toBe("CREATE");
    }
    expect(after, "önizləmə bazaya yazdı").toBe(before);
  });

  it("önizləmə hər rədd edilmiş sətir üçün SƏTİR NÖMRƏSİ + SƏBƏB verir", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const csv = [
      IMPORT_HEADER,
      "a@qu.edu.az,A,B,naməlum-fakulte,naməlum,2026",
      "kimse@gmail.com,C,D,eng,cs,2026",
    ].join("\n");

    const result = await previewImport(viewer, csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.rejected).toBe(2);
    for (const row of result.value.rows) {
      expect(row.outcome).toBe("REJECT");
      expect(row.line).toBeGreaterThan(1);
      expect(row.message).toBeTruthy();
    }
  });

  it("🔴 `commitImport` SƏHVLİ sətirdə HEÇ NƏ yazmır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const program = await prisma.program.findFirst({
      where: { cohorts: { some: {} } },
      select: { slug: true, faculty: { select: { slug: true } }, cohorts: { select: { admissionYear: true } } },
    });

    // Birinci sətir DÜZGÜNDÜR, ikinci sətir SƏHVDİR.
    const csv = [
      IMPORT_HEADER,
      `partial.ok@qu.edu.az,Yaxşı,Sətir,${program!.faculty.slug},${program!.slug},${program!.cohorts[0].admissionYear}`,
      "partial.bad@qu.edu.az,Pis,Sətir,naməlum,naməlum,2026",
    ].join("\n");

    const preview = await previewImport(viewer, csv);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const before = await prisma.user.count();
    const result = await commitImport(viewer, csv, preview.value.token);
    const after = await prisma.user.count();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("HAS_REJECTED_ROWS");
    expect(after, "qismən yazı baş verdi").toBe(before);

    // Düzgün sətir də yazılmayıb.
    expect(
      await prisma.user.count({ where: { email: "partial.ok@qu.edu.az" } }),
    ).toBe(0);
  });

  it("jeton uyğun gəlmirsə yazı getmir (önizləmədən sonra fayl dəyişib)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const before = await prisma.user.count();

    const result = await commitImport(viewer, `${IMPORT_HEADER}\n`, "deadbeef");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TOKEN_MISMATCH");
    expect(await prisma.user.count()).toBe(before);
  });

  it("🔴 uğurlu import: hesab ŞİFRƏSİZ yaradılır, BİR audit sətri yazılır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const cohort = await prisma.cohort.findFirst({
      where: { programId: { not: null } },
      select: {
        id: true,
        admissionYear: true,
        program: { select: { slug: true, faculty: { select: { slug: true } } } },
      },
    });
    expect(cohort?.program).toBeTruthy();

    const email = "import.test@qu.edu.az";
    createdUserEmails.push(email);

    const csv = [
      IMPORT_HEADER,
      `${email},İmport,Testov,${cohort!.program!.faculty.slug},${cohort!.program!.slug},${cohort!.admissionYear}`,
    ].join("\n");

    const preview = await previewImport(viewer, csv);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const auditsBefore = await prisma.auditLog.count({ where: { entityType: "SisImport" } });
    const result = await commitImport(viewer, csv, preview.value.token);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ created: 1, updated: 0 });

    const created = await prisma.user.findUnique({
      where: { email },
      select: {
        passwordHash: true,
        firstName: true,
        memberships: { select: { cohortId: true, role: true } },
        fieldVisibility: { select: { field: true, level: true } },
      },
    });

    // 🔴 ŞİFRƏSİZ — istifadəçi onu bərpa axını ilə təyin edir.
    expect(created?.passwordHash).toBe(UNSET_PASSWORD_HASH);
    expect(created?.memberships[0]?.cohortId).toBe(cohort!.id);
    expect(created?.memberships[0]?.role).toBe(CohortRole.MEMBER);

    // Məxfilik defoltları da eyni transaksiyada yaradılıb.
    const phone = created?.fieldVisibility.find((f) => f.field === "phone");
    expect(phone?.level).toBe("PRIVATE");

    // 🔴 BÜTÜN İMPORT → BİR audit sətri.
    const auditsAfter = await prisma.auditLog.count({ where: { entityType: "SisImport" } });
    expect(auditsAfter).toBe(auditsBefore + 1);
  });

  it("TƏKRAR e-poçt YENİLƏMƏDİR — yeni sətir yaranmır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const cohort = await prisma.cohort.findFirst({
      where: { programId: { not: null } },
      select: {
        admissionYear: true,
        program: { select: { slug: true, faculty: { select: { slug: true } } } },
      },
    });

    const email = "import.test@qu.edu.az";
    const csv = [
      IMPORT_HEADER,
      `${email},Yenilənmiş,Soyad,${cohort!.program!.faculty.slug},${cohort!.program!.slug},${cohort!.admissionYear}`,
    ].join("\n");

    const preview = await previewImport(viewer, csv);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.updated).toBe(1);
    expect(preview.value.created).toBe(0);

    const before = await prisma.user.count();
    const result = await commitImport(viewer, csv, preview.value.token);
    expect(result.ok).toBe(true);
    expect(await prisma.user.count(), "yeni sətir yarandı").toBe(before);

    const updated = await prisma.user.findUnique({
      where: { email },
      select: { firstName: true },
    });
    expect(updated?.firstName).toBe("Yenilənmiş");
  });
});

// ---------------------------------------------------------------------------
// Universitet səviyyəli nailiyyət növbəsi
// ---------------------------------------------------------------------------

describe("listUniversityModerationQueue", () => {
  it("bütün siniflərin təsdiq gözləyən nailiyyətlərini qaytarır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const items = await listUniversityModerationQueue(viewer, {}, ALL);

    const expected = await prisma.achievement.count({
      where: { status: AchievementStatus.SUBMITTED },
    });

    expect(items.length).toBe(Math.min(expected, ALL));
    for (const item of items) expect(item.status).toBe(AchievementStatus.SUBMITTED);
  });

  it("cohort filtri işləyir", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const all = await listUniversityModerationQueue(viewer, {}, ALL);
    if (all.length === 0) return;

    const cohortId = all[0].cohortId;
    const filtered = await listUniversityModerationQueue(viewer, { cohortId }, ALL);

    expect(filtered.length).toBeGreaterThan(0);
    for (const item of filtered) expect(item.cohortId).toBe(cohortId);
  });
});

// ---------------------------------------------------------------------------
// Dashboard rəqəmləri
// ---------------------------------------------------------------------------

describe("getAdminDashboardStats", () => {
  it("saylar DB ilə uzlaşır", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const stats = await getAdminDashboardStats(viewer);

    expect(stats.userCount).toBe(
      await prisma.user.count({ where: { deactivatedAt: null } }),
    );
    expect(stats.cohortCount).toBe(await prisma.cohort.count());
    expect(stats.openReportCount).toBe(
      await prisma.report.count({ where: { status: ReportStatus.OPEN } }),
    );
    expect(stats.pendingAchievementCount).toBe(
      await prisma.achievement.count({ where: { status: AchievementStatus.SUBMITTED } }),
    );
  });

  it("🔴 çıxışda ŞƏXSƏ BAĞLI sıralama YOXDUR (TƏLƏ G)", async () => {
    const viewer = viewerOf(adminId, SystemRole.UNIVERSITY_ADMIN);
    const stats = await getAdminDashboardStats(viewer);

    // Açarların hamısı SAY-dır; ad, id və ya siyahı yoxdur.
    for (const [key, value] of Object.entries(stats)) {
      expect(typeof value, `${key} say deyil`).toBe("number");
    }
  });
});
