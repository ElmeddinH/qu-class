// ============================================================================
// src/services/moderation.service.ts
// Şikayət növbəsi — UNİVERSİTET SƏVİYYƏSİ (spec §17, Blok 11B).
//
// `report.service.ts` VƏTƏNDAŞ tərəfidir (şikayət göndərmək); bu fayl MODERATOR
// tərəfidir (növbə, baxış, qərar). İkisi qəsdən ayrıdır: birində qapı
// "giriş etmiş istifadəçi", digərində "universitet administratoru"dur və iki
// icazə modeli bir faylda qarışanda sızma yaranır (Blok 8-in dərsi).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ A — NÖVBƏ ŞİKAYƏTİ GÖSTƏRİR, ŞİKAYƏT OLUNAN MƏZMUNU YOX
// ────────────────────────────────────────────────────────────────────────────
// CLAUDE.md: «PRIVATE → yalnız sahibi. Admin belə oxumur (audit log istisna).»
// Yəni admin olmaq məzmunu oxumaq hüququ DEYİL — oxumaq AYRI, İZLƏNİLƏN
// hərəkətdir.
//
// Axın ADDIM-ADDIM:
//   1. `listReportQueue` şikayət sətirlərini qaytarır: səbəb, detal, tarix,
//      şikayətçi, hədəfin NÖVÜ + `id`-si + GÖRÜNÜRLÜK SƏVİYYƏSİ.
//      🔴 Hədəf sorğusunda `title` / `body` / `description` SEÇİLMİR — sahə
//      cavaba düşmür, yəni "səhvən göstərmək" mümkün deyil.
//   2. Moderator «Moderasiya baxışı» düyməsinə basır.
//   3. `openModerationReview`:
//        a. `canModerate(viewer, hədəf)` yoxlanılır (səviyyə deyil, ROL qapısı)
//        b. TƏK TRANSAKSİYADA: ƏVVƏLCƏ AuditLog (`MODERATE`), SONRA məzmun
//           oxunur. Sıra vacibdir — audit sətri yazıla bilmirsə transaksiya
//           geri qayıdır və məzmun HEÇ VAXT oxunmur.
//   4. Məzmun yalnız cavabda qayıdır — DB-də saxlanılmır, jurnala düşmür.
//
// ⚠️ AuditLog `metadata`-sına MƏZMUN YAZILMIR (`safeAuditMetadata` ağ siyahısı):
// jurnal `/admin/audit`-də göstərilir və oraya düşən `PRIVATE` mətn qorumanı
// mənasız edərdi.
// ============================================================================

import type { Prisma } from "@prisma/client";

import {
  MODERATION_PAGE_SIZE,
  type ModerationFilterState,
} from "@/lib/admin-filters";
import { assertFreshAdmin, type AdminViewer } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import {
  AuditAction,
  ContentStatus,
  NotificationType,
  PostStatus,
  ReportEntityType,
  ReportStatus,
  Visibility,
  type ReportEntityType as ReportEntityTypeValue,
  type ReportStatus as ReportStatusValue,
} from "@/lib/enums";
import { canModerate, type Guarded, type Viewer } from "@/lib/visibility";
import { recordAudit } from "@/services/audit.service";

// ---------------------------------------------------------------------------
// Növbə sətri — MƏZMUNSUZ
// ---------------------------------------------------------------------------

/**
 * Şikayət hədəfinin MODERASİYA KONTEKSTİ.
 *
 * 🔴 Bu obyektdə mətn sahəsi YOXDUR və olmamalıdır. `visibility` səviyyəsi
 * moderatora "bu, açıq paylaşımdırmı, yoxsa şəxsi qeyd?" sualının cavabını
 * verir — məzmunu açmadan prioritet qurmaq üçün kifayətdir.
 */
export interface ReportTarget {
  /** Hədəf DB-də hələ mövcuddurmu? (silinmiş sətir üçün `false`) */
  exists: boolean;
  /** `PUBLIC` | `UNIVERSITY` | `CLASS` | `PRIVATE` — modeldə varsa. */
  visibility: string | null;
  cohortId: string | null;
  ownerId: string | null;
  /** Məzmunun cari statusu (`ACTIVE` / `HIDDEN` / `DELETED`) — varsa. */
  status: string | null;
}

export interface ReportQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  /** ŞİKAYƏTÇİNİN öz mətni — şikayət olunan məzmun DEYİL. */
  details: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  reporter: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
  target: ReportTarget;
}

const REPORT_SELECT = {
  id: true,
  entityType: true,
  entityId: true,
  reason: true,
  details: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolution: true,
  reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ReportSelect;

/**
 * 🔴 HƏDƏFİN QORUMA SAHƏLƏRİ — MƏTN SƏHƏLƏRİ SEÇİLMİR.
 *
 * Hər model üçün YALNIZ `visibility` / `cohortId` / sahib / `status` oxunur.
 * `select` açıq siyahıdır: `title` və `body` sadəcə "göstərilmir" deyil,
 * ÜMUMİYYƏTLƏ SORĞULANMIR — yəni cavab obyektində mövcud da deyil
 * (`tests/integration/admin.db.test.ts` bunu rekursiv açar gəzişi ilə ölçür).
 */
const GUARD_SELECT = { visibility: true, cohortId: true, status: true } as const;

const MISSING_TARGET: ReportTarget = {
  exists: false,
  visibility: null,
  cohortId: null,
  ownerId: null,
  status: null,
};

/** Şikayət növü DB sətrinə işarə edirmi? `ACCESSIBILITY` — YOX (11A qərarı). */
export function isAccessibilityReport(entityType: string): boolean {
  return entityType === ReportEntityType.ACCESSIBILITY;
}

/**
 * Hədəflərin qoruma sahələrini NÖVƏ GÖRƏ QRUPLA oxuyur.
 *
 * ⚠️ Sətir başına sorğu YOX: hər növ üçün BİR `findMany`. 20 sətirlik növbə
 * ən çoxu 6 sorğu edir.
 */
async function loadTargets(
  rows: Array<{ entityType: string; entityId: string }>,
): Promise<Map<string, ReportTarget>> {
  const idsByType = new Map<string, string[]>();
  for (const row of rows) {
    const list = idsByType.get(row.entityType) ?? [];
    list.push(row.entityId);
    idsByType.set(row.entityType, list);
  }

  const out = new Map<string, ReportTarget>();
  const key = (type: string, id: string) => `${type}:${id}`;

  const idsOf = (type: ReportEntityTypeValue) => idsByType.get(type) ?? [];

  const [posts, comments, memories, achievements, events, users] = await Promise.all([
    idsOf(ReportEntityType.POST).length === 0
      ? []
      : prisma.post.findMany({
          where: { id: { in: idsOf(ReportEntityType.POST) } },
          select: { id: true, authorId: true, ...GUARD_SELECT },
        }),
    idsOf(ReportEntityType.COMMENT).length === 0
      ? []
      : prisma.comment.findMany({
          where: { id: { in: idsOf(ReportEntityType.COMMENT) } },
          // `Comment`-də `visibility` / `cohortId` YOXDUR — kontekst POST-dandır.
          select: {
            id: true,
            authorId: true,
            status: true,
            post: { select: { visibility: true, cohortId: true } },
          },
        }),
    idsOf(ReportEntityType.MEMORY).length === 0
      ? []
      : prisma.memory.findMany({
          where: { id: { in: idsOf(ReportEntityType.MEMORY) } },
          select: { id: true, authorId: true, ...GUARD_SELECT },
        }),
    idsOf(ReportEntityType.ACHIEVEMENT).length === 0
      ? []
      : prisma.achievement.findMany({
          where: { id: { in: idsOf(ReportEntityType.ACHIEVEMENT) } },
          select: { id: true, ownerId: true, ...GUARD_SELECT },
        }),
    idsOf(ReportEntityType.EVENT).length === 0
      ? []
      : prisma.event.findMany({
          where: { id: { in: idsOf(ReportEntityType.EVENT) } },
          select: { id: true, createdById: true, ...GUARD_SELECT },
        }),
    idsOf(ReportEntityType.USER).length === 0
      ? []
      : prisma.user.findMany({
          where: { id: { in: idsOf(ReportEntityType.USER) } },
          // ⚠️ `User`-də `visibility` sütunu YOXDUR — profil sahə-səviyyə
          // idarə olunur (`FieldVisibility`). Növbədə səviyyə `null` göstərilir.
          select: { id: true, deactivatedAt: true },
        }),
  ]);

  for (const row of posts) {
    out.set(key(ReportEntityType.POST, row.id), {
      exists: true,
      visibility: row.visibility,
      cohortId: row.cohortId,
      ownerId: row.authorId,
      status: row.status,
    });
  }
  for (const row of comments) {
    out.set(key(ReportEntityType.COMMENT, row.id), {
      exists: true,
      visibility: row.post.visibility,
      cohortId: row.post.cohortId,
      ownerId: row.authorId,
      status: row.status,
    });
  }
  for (const row of memories) {
    out.set(key(ReportEntityType.MEMORY, row.id), {
      exists: true,
      visibility: row.visibility,
      cohortId: row.cohortId,
      ownerId: row.authorId,
      status: row.status,
    });
  }
  for (const row of achievements) {
    out.set(key(ReportEntityType.ACHIEVEMENT, row.id), {
      exists: true,
      visibility: row.visibility,
      cohortId: row.cohortId,
      ownerId: row.ownerId,
      status: row.status,
    });
  }
  for (const row of events) {
    out.set(key(ReportEntityType.EVENT, row.id), {
      exists: true,
      visibility: row.visibility,
      cohortId: row.cohortId,
      ownerId: row.createdById,
      status: row.status,
    });
  }
  for (const row of users) {
    out.set(key(ReportEntityType.USER, row.id), {
      exists: true,
      visibility: null,
      cohortId: null,
      ownerId: row.id,
      status: row.deactivatedAt === null ? "ACTIVE" : "DEACTIVATED",
    });
  }

  return out;
}

function reportWhere(filters: ModerationFilterState): Prisma.ReportWhereInput {
  return {
    AND: [
      ...(filters.status !== null ? [{ status: filters.status }] : []),
      ...(filters.entityType !== null ? [{ entityType: filters.entityType }] : []),
      ...(filters.reason !== null ? [{ reason: filters.reason }] : []),
    ],
  };
}

/**
 * Şikayət növbəsi — MƏZMUNSUZ (TƏLƏ A).
 *
 * Sıralama: AÇIQ şikayətlər əvvəl (status əlifba sırası ilə deyil, təyin
 * olunmuş prioritetlə), sonra tarix. SQLite `CASE` ilə çeşidləmə Prisma-da
 * ifadə edilə bilmədiyi üçün əvəzinə `status` filtri + tarix işlədilir və
 * default görünüş `OPEN`-dır (səhifə linki bunu qurur).
 */
export async function listReportQueue(
  viewer: Viewer,
  filters: ModerationFilterState,
  take: number = MODERATION_PAGE_SIZE,
  skip = 0,
): Promise<ReportQueueItem[]> {
  await assertFreshAdmin(viewer);

  const rows = await prisma.report.findMany({
    where: reportWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    skip,
    select: REPORT_SELECT,
  });

  const targets = await loadTargets(rows);

  return rows.map((row) => ({
    ...row,
    target: targets.get(`${row.entityType}:${row.entityId}`) ?? MISSING_TARGET,
  }));
}

export async function countReportQueue(
  viewer: Viewer,
  filters: ModerationFilterState,
): Promise<number> {
  await assertFreshAdmin(viewer);
  return prisma.report.count({ where: reportWhere(filters) });
}

/** Status üzrə saylar — filtr çipləri üçün (hər status neçə şikayət). */
export async function countReportsByStatus(
  viewer: Viewer,
): Promise<Record<string, number>> {
  await assertFreshAdmin(viewer);

  const groups = await prisma.report.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
}

// ---------------------------------------------------------------------------
// 🔴 MODERASİYA BAXIŞI — AUDIT ƏVVƏL, MƏZMUN SONRA
// ---------------------------------------------------------------------------

export interface ModerationContent {
  kind: string;
  title: string | null;
  body: string | null;
  visibility: string | null;
  status: string | null;
  createdAt: Date | null;
  author: { id: string; firstName: string; lastName: string } | null;
}

export type ModerationReviewFailure =
  | "NOT_FOUND"
  | "TARGET_MISSING"
  | "FORBIDDEN"
  | "NOT_CONTENT";

export type ModerationReviewResult =
  | { ok: true; value: ModerationContent }
  | { ok: false; reason: ModerationReviewFailure };

/**
 * Şikayət olunan məzmunu AÇIR — və bunu jurnala yazır.
 *
 * 🔴 SIRA MÜQAVİLƏDİR: `recordAudit` transaksiyanın BİRİNCİ addımıdır. Məzmun
 * ondan SONRA, EYNİ transaksiyada oxunur. Audit yazıla bilmirsə (məs. disk
 * xətası) transaksiya geri qayıdır və funksiya məzmunu QAYTARMIR — "izsiz
 * baxış" halı struktur olaraq mümkün deyil.
 *
 * ⚠️ `ACCESSIBILITY` qeydlərində məzmun YOXDUR (`entityId` səhifə yoludur) —
 * `NOT_CONTENT` qaytarılır və audit sətri də YAZILMIR: baxılacaq şəxsi məlumat
 * olmadığı üçün jurnal sətri yalnız səs-küy olardı.
 */
export async function openModerationReview(
  viewer: Viewer,
  reportId: string,
): Promise<ModerationReviewResult> {
  const admin = await assertFreshAdmin(viewer);

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, entityType: true, entityId: true },
  });
  if (!report) return { ok: false, reason: "NOT_FOUND" };

  if (isAccessibilityReport(report.entityType)) {
    return { ok: false, reason: "NOT_CONTENT" };
  }

  const targets = await loadTargets([report]);
  const target = targets.get(`${report.entityType}:${report.entityId}`);
  if (!target || !target.exists) return { ok: false, reason: "TARGET_MISSING" };

  // Qapı: `canModerate` → `canModerateCohort` (rol), görünürlük DEYİL.
  const guarded: Guarded = {
    ownerId: target.ownerId ?? "",
    cohortId: target.cohortId,
    visibility: target.visibility ?? Visibility.PRIVATE,
  };
  if (!canModerate(admin, guarded)) return { ok: false, reason: "FORBIDDEN" };

  const content = await prisma.$transaction(async (tx) => {
    // 1️⃣ ƏVVƏLCƏ İZ — sonra məzmun.
    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.MODERATE,
      entityType: "Report",
      entityId: report.id,
      metadata: {
        operation: "openModerationReview",
        reportId: report.id,
        entityType: report.entityType,
        entityId: report.entityId,
        // ⚠️ Yalnız SƏVİYYƏ — mətn YOX (bax fayl başlığı).
        visibility: target.visibility,
        ownerId: target.ownerId,
      },
    });

    // 2️⃣ İndi məzmun oxuna bilər.
    return readContent(tx, report.entityType, report.entityId);
  });

  if (content === null) return { ok: false, reason: "TARGET_MISSING" };
  return { ok: true, value: content };
}

/** Məzmunun ÖZÜ — yalnız `openModerationReview` transaksiyasından çağırılır. */
async function readContent(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
): Promise<ModerationContent | null> {
  const author = {
    select: { id: true, firstName: true, lastName: true },
  } as const;

  switch (entityType) {
    case ReportEntityType.POST: {
      const row = await tx.post.findUnique({
        where: { id: entityId },
        select: {
          body: true,
          visibility: true,
          status: true,
          createdAt: true,
          category: true,
          author,
        },
      });
      return row === null
        ? null
        : {
            kind: "Paylaşım",
            title: row.category,
            body: row.body,
            visibility: row.visibility,
            status: row.status,
            createdAt: row.createdAt,
            author: row.author,
          };
    }

    case ReportEntityType.COMMENT: {
      const row = await tx.comment.findUnique({
        where: { id: entityId },
        select: {
          body: true,
          status: true,
          createdAt: true,
          author,
          post: { select: { visibility: true } },
        },
      });
      return row === null
        ? null
        : {
            kind: "Şərh",
            title: null,
            body: row.body,
            visibility: row.post.visibility,
            status: row.status,
            createdAt: row.createdAt,
            author: row.author,
          };
    }

    case ReportEntityType.MEMORY: {
      const row = await tx.memory.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          body: true,
          visibility: true,
          status: true,
          createdAt: true,
          author,
        },
      });
      return row === null
        ? null
        : {
            kind: "Xatirə",
            title: row.title,
            body: row.body,
            visibility: row.visibility,
            status: row.status,
            createdAt: row.createdAt,
            author: row.author,
          };
    }

    case ReportEntityType.ACHIEVEMENT: {
      const row = await tx.achievement.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          description: true,
          visibility: true,
          status: true,
          createdAt: true,
          owner: author,
        },
      });
      return row === null
        ? null
        : {
            kind: "Nailiyyət",
            title: row.title,
            body: row.description,
            visibility: row.visibility,
            status: row.status,
            createdAt: row.createdAt,
            author: row.owner,
          };
    }

    case ReportEntityType.EVENT: {
      const row = await tx.event.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          description: true,
          visibility: true,
          status: true,
          createdAt: true,
          createdBy: author,
        },
      });
      return row === null
        ? null
        : {
            kind: "Tədbir",
            title: row.title,
            body: row.description,
            visibility: row.visibility,
            status: row.status,
            createdAt: row.createdAt,
            author: row.createdBy,
          };
    }

    case ReportEntityType.USER: {
      const row = await tx.user.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bio: true,
          createdAt: true,
          deactivatedAt: true,
        },
      });
      return row === null
        ? null
        : {
            kind: "İstifadəçi profili",
            title: `${row.firstName} ${row.lastName}`,
            body: row.bio,
            visibility: null,
            status: row.deactivatedAt === null ? "ACTIVE" : "DEACTIVATED",
            createdAt: row.createdAt,
            author: { id: row.id, firstName: row.firstName, lastName: row.lastName },
          };
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Qərarlar — TƏK TRANSAKSİYA + AuditLog + şikayətçiyə bildiriş
// ---------------------------------------------------------------------------

export type ReportDecision = Extract<
  ReportStatusValue,
  "IN_REVIEW" | "RESOLVED" | "REJECTED"
>;

export type ReportDecisionFailure =
  | "NOT_FOUND"
  | "RESOLUTION_REQUIRED"
  | "ALREADY_CLOSED";

export type ReportDecisionResult =
  | { ok: true; value: { reportId: string; status: string } }
  | { ok: false; reason: ReportDecisionFailure };

/** Qərar → şikayətçiyə gedən bildiriş mətni. */
const DECISION_NOTICE: Record<ReportDecision, { title: string; body: string }> = {
  IN_REVIEW: {
    title: "Şikayətiniz baxışa götürüldü",
    body: "Moderasiya komandası şikayətinizi araşdırır.",
  },
  RESOLVED: {
    title: "Şikayətiniz həll edildi",
    body: "Şikayətiniz üzrə qərar verildi.",
  },
  REJECTED: {
    title: "Şikayətiniz qəbul edilmədi",
    body: "Şikayətiniz araşdırıldı, qayda pozuntusu aşkarlanmadı.",
  },
};

const CLOSED_STATUSES: readonly string[] = [ReportStatus.RESOLVED, ReportStatus.REJECTED];

/**
 * Şikayət üzrə qərar.
 *
 * TƏK TRANSAKSİYA:
 *   1. `Report.status` + `resolvedById` / `resolvedAt` / `resolution`
 *   2. AuditLog (MƏCBURİ)
 *   3. Şikayətçiyə Notification
 *
 * ⚠️ `RESOLVED` və `REJECTED` üçün `resolution` MƏCBURİDİR: şikayətçiyə
 * səbəbsiz "qəbul edilmədi" getməməlidir və üç ay sonra jurnalı oxuyan adam
 * qərarın niyəsini görməlidir.
 *
 * ⚠️ Bağlanmış şikayət YENİDƏN AÇILMIR (`ALREADY_CLOSED`): status tarixçəsi
 * yalnız bir istiqamətdə gedir, əks halda audit sətirləri arasında hansının
 * son olduğu qeyri-müəyyən olardı.
 */
export async function decideReport(
  viewer: Viewer,
  input: { reportId: string; decision: ReportDecision; resolution: string | null },
): Promise<ReportDecisionResult> {
  const admin = await assertFreshAdmin(viewer);

  const resolution = input.resolution?.trim() ?? "";
  if (input.decision !== ReportStatus.IN_REVIEW && resolution === "") {
    return { ok: false, reason: "RESOLUTION_REQUIRED" };
  }

  const report = await prisma.report.findUnique({
    where: { id: input.reportId },
    select: { id: true, status: true, reporterId: true, entityType: true },
  });
  if (!report) return { ok: false, reason: "NOT_FOUND" };
  if (CLOSED_STATUSES.includes(report.status)) {
    return { ok: false, reason: "ALREADY_CLOSED" };
  }

  const closing = CLOSED_STATUSES.includes(input.decision);
  const notice = DECISION_NOTICE[input.decision];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: report.id },
      data: {
        status: input.decision,
        resolvedById: closing ? admin.userId : null,
        resolvedAt: closing ? now : null,
        resolution: resolution === "" ? null : resolution,
      },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "Report",
      entityId: report.id,
      metadata: {
        operation: "decideReport",
        from: report.status,
        to: input.decision,
        entityType: report.entityType,
      },
    });

    // Moderator öz şikayətinə qərar veribsə özünə bildiriş göndərilmir.
    if (report.reporterId !== admin.userId) {
      await tx.notification.create({
        data: {
          recipientId: report.reporterId,
          actorId: admin.userId,
          type: NotificationType.MODERATION_RESULT,
          title: notice.title,
          body: resolution === "" ? notice.body : resolution,
          // ⚠️ `url` YOXDUR: şikayət səhifəsi istifadəçi üçün mövcud deyil və
          // `lib/notification-links.ts` ağ siyahısı tanımayan formanı onsuz da
          // linkə çevirmir (Blok 11A).
        },
      });
    }
  });

  return { ok: true, value: { reportId: report.id, status: input.decision } };
}

// ---------------------------------------------------------------------------
// Məzmuna tədbir — GİZLƏT (soft delete)
// ---------------------------------------------------------------------------

export type HideContentFailure = "NOT_FOUND" | "TARGET_MISSING" | "NOT_HIDEABLE";

export type HideContentResult =
  | { ok: true; value: { entityType: string; entityId: string } }
  | { ok: false; reason: HideContentFailure };

/**
 * Şikayət olunan məzmunu gizlədir.
 *
 * 🔴 T4 (Blok 4) — SOFT DELETE CASCADE İŞƏ SALMIR: sətir qalır, yəni
 * `onDelete: Cascade` törəmə `TimelineEntry`-ni SİLMİR. Buna görə xronologiya
 * qeydi EYNİ transaksiyada AÇIQ ŞƏKİLDƏ silinir — əks halda gizlədilmiş
 * paylaşım xronologiyada başlığı ilə qalardı.
 *
 * ⚠️ `USER` və `ACCESSIBILITY` gizlədilə bilməz: birincisi üçün doğru alət
 * hesabın deaktivasiyasıdır (`/admin/users`), ikincisi isə texniki nasazlıq
 * biletidir — məzmunu yoxdur.
 */
export async function hideReportedContent(
  viewer: Viewer,
  reportId: string,
): Promise<HideContentResult> {
  const admin = await assertFreshAdmin(viewer);

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, entityType: true, entityId: true },
  });
  if (!report) return { ok: false, reason: "NOT_FOUND" };

  const hideable: readonly string[] = [
    ReportEntityType.POST,
    ReportEntityType.COMMENT,
    ReportEntityType.MEMORY,
  ];
  if (!hideable.includes(report.entityType)) {
    return { ok: false, reason: "NOT_HIDEABLE" };
  }

  const targets = await loadTargets([report]);
  const target = targets.get(`${report.entityType}:${report.entityId}`);
  if (!target || !target.exists) return { ok: false, reason: "TARGET_MISSING" };

  await prisma.$transaction(async (tx) => {
    if (report.entityType === ReportEntityType.POST) {
      await tx.post.update({
        where: { id: report.entityId },
        data: { status: PostStatus.HIDDEN },
      });
      // T4 — törəmə sətirlər əl ilə təmizlənir.
      await tx.timelineEntry.deleteMany({ where: { postId: report.entityId } });
    } else if (report.entityType === ReportEntityType.MEMORY) {
      await tx.memory.update({
        where: { id: report.entityId },
        data: { status: ContentStatus.HIDDEN },
      });
    } else {
      await tx.comment.update({
        where: { id: report.entityId },
        data: { status: ContentStatus.HIDDEN },
      });
    }

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.MODERATE,
      entityType: report.entityType,
      entityId: report.entityId,
      metadata: {
        operation: "hideReportedContent",
        reportId: report.id,
        from: target.status,
        to: ContentStatus.HIDDEN,
        ownerId: target.ownerId,
      },
    });
  });

  return { ok: true, value: { entityType: report.entityType, entityId: report.entityId } };
}

/** Növbənin başındakı say — dashboard rozeti. */
export async function countOpenReports(viewer: Viewer): Promise<number> {
  await assertFreshAdmin(viewer);
  return prisma.report.count({ where: { status: ReportStatus.OPEN } });
}

export type { AdminViewer };
