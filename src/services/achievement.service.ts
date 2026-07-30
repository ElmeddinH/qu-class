// ============================================================================
// src/services/achievement.service.ts
// Class Achievements oxu sorğuları (spec §12).
//
// Model: `Achievement` · sahib sütunu: `ownerId` · statuslar:
// `VERIFIED` | `FEATURED`.
//
// ⚠️ Burada `activeVisibleWhere` İŞLƏTMƏ — o, `"ACTIVE"` sabitini axtarır və
// `Achievement`-də belə status YOXDUR, yəni nəticə həmişə boş olardı (sahibin
// öz qeydlərindən başqa). `visibleWithStatus(viewer, PUBLIC_ACHIEVEMENT_STATUSES,
// "ownerId")` işlədilir.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { assertFreshAdmin } from "@/lib/admin-guard";
import { AUTHOR_SELECT, toAuthorCard, type AuthorCard } from "@/lib/author-card";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/services/audit.service";
import {
  AchievementStatus,
  AuditAction,
  NotificationEntityType,
  NotificationType,
  PUBLIC_ACHIEVEMENT_STATUSES,
  type AchievementCategory,
  type AchievementStatus as AchievementStatusType,
  type PostCategory,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { tokenizedContains } from "@/lib/text-search";
import {
  canModerateCohort,
  visibleWithStatus,
  type Viewer,
} from "@/lib/visibility";
import { buildAchievementTimelineEntry } from "@/features/feed/fanout";

export interface AchievementItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  organization: string | null;
  proofUrl: string | null;
  imageUrl: string | null;
  awardedAt: Date;
  status: string;
  visibility: string;
  /** ⚠️ `avatarUrl` redaksiyadan keçir — `toAchievementItem()` (TƏLƏ T40). */
  owner: AuthorCard;
  cohort: { id: string; slug: string; displayName: string };
}

export interface AchievementFilters {
  cohortId?: string;
  ownerId?: string;
  category?: AchievementCategory;
  take?: number;
  skip?: number;
}

export const ACHIEVEMENT_PAGE_SIZE = 30;

const ACHIEVEMENT_SELECT = {
  id: true,
  category: true,
  title: true,
  description: true,
  organization: true,
  proofUrl: true,
  imageUrl: true,
  awardedAt: true,
  status: true,
  visibility: true,
  // ⚠️ TƏLƏ T40 — xam `avatarUrl: true` YAZMA.
  owner: { select: AUTHOR_SELECT },
  cohort: { select: { id: true, slug: true, displayName: true } },
} satisfies Prisma.AchievementSelect;

/**
 * Sətir → nailiyyət kartı.
 *
 * ⚠️ TƏK VƏZİFƏSİ sahibin kartını `redactProfile`-dan keçirməkdir (TƏLƏ T40).
 * Moderasiya növbələrində də tətbiq olunur: moderator nailiyyəti təsdiqləmək
 * üçün MƏZMUNA baxır, sahibin profil şəklinə yox.
 */
function toAchievementItem<R extends { owner: Parameters<typeof toAuthorCard>[0] }>(
  row: R,
  viewer: Viewer,
): Omit<R, "owner"> & { owner: AuthorCard } {
  return { ...row, owner: toAuthorCard(row.owner, viewer) };
}

/** Siyahı və sayın ORTAQ şərti — ikisi ayrılsa nəticə ilə rəqəm uyğunsuz olar. */
function achievementWhere(
  viewer: Viewer,
  filters: AchievementFilters,
): Prisma.AchievementWhereInput {
  return {
    AND: [
      visibleWithStatus<Prisma.AchievementWhereInput>(
        viewer,
        [...PUBLIC_ACHIEVEMENT_STATUSES],
        "ownerId",
      ),
      ...(filters.cohortId ? [{ cohortId: filters.cohortId }] : []),
      ...(filters.ownerId ? [{ ownerId: filters.ownerId }] : []),
      ...(filters.category ? [{ category: filters.category }] : []),
    ],
  };
}

/**
 * Nailiyyət siyahısı.
 *
 * Sahib öz `SUBMITTED` (təsdiq gözləyən) və `ARCHIVED` nailiyyətlərini də
 * görür — `visibleWithStatus` status filtrini sahib şaxəsinə tətbiq etmir.
 * Başqaları yalnız `VERIFIED` / `FEATURED` görür.
 *
 * 🔴 Bu funksiya MODERASİYA NÖVBƏSİ DEYİL (TƏLƏ A): moderator başqasının
 * `SUBMITTED` nailiyyətini burada GÖRMÜR. Növbə üçün `listModerationQueue`.
 */
export async function listAchievements(
  viewer: Viewer,
  filters: AchievementFilters = {},
): Promise<AchievementItem[]> {
  const rows = await prisma.achievement.findMany({
    where: achievementWhere(viewer, filters),
    orderBy: [{ awardedAt: "desc" }, { id: "desc" }],
    take: filters.take ?? ACHIEVEMENT_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: ACHIEVEMENT_SELECT,
  });

  return rows.map((row) => toAchievementItem(row, viewer));
}

/**
 * `listAchievements` ilə EYNİ şərtin sayı — səhifələmə üçün.
 *
 * ⚠️ Şərt təkrar YAZILMIR, `achievementWhere` ikisində də işlədilir: say ilə
 * siyahı ayrılsa "12 nəticə" yazıb 9 kart göstərmək mümkün olardı.
 */
export async function countAchievements(
  viewer: Viewer,
  filters: AchievementFilters = {},
): Promise<number> {
  return prisma.achievement.count({ where: achievementWhere(viewer, filters) });
}

/**
 * Qlobal axtarışın nailiyyət bölməsi [M16].
 *
 * `listAchievements` ilə eyni görünürlük + status köməkçisi
 * (`visibleWithStatus`, `PUBLIC_ACHIEVEMENT_STATUSES`) — başqası yalnız
 * `VERIFIED` / `FEATURED` nailiyyəti tapır, sahib özü təsdiq gözləyəni də.
 */
export async function searchAchievements(
  viewer: Viewer,
  term: string,
  take: number,
): Promise<AchievementItem[]> {
  const textWhere = tokenizedContains<Prisma.AchievementWhereInput>(
    ["title", "description", "organization"],
    term,
  );
  if (textWhere === null) return [];

  const rows = await prisma.achievement.findMany({
    where: {
      AND: [
        visibleWithStatus<Prisma.AchievementWhereInput>(
          viewer,
          [...PUBLIC_ACHIEVEMENT_STATUSES],
          "ownerId",
        ),
        textWhere,
      ],
    },
    orderBy: [{ awardedAt: "desc" }, { id: "desc" }],
    take,
    select: ACHIEVEMENT_SELECT,
  });

  return rows.map((row) => toAchievementItem(row, viewer));
}

/** Tək nailiyyət. Görünmürsə `null` — "yoxdur" və "icazə yoxdur" ayırd edilmir. */
export async function getAchievement(
  viewer: Viewer,
  achievementId: string,
): Promise<AchievementItem | null> {
  const row = await prisma.achievement.findFirst({
    where: {
      AND: [
        { id: achievementId },
        visibleWithStatus<Prisma.AchievementWhereInput>(
          viewer,
          [...PUBLIC_ACHIEVEMENT_STATUSES],
          "ownerId",
        ),
      ],
    },
    select: ACHIEVEMENT_SELECT,
  });

  return row === null ? null : toAchievementItem(row, viewer);
}

// ---------------------------------------------------------------------------
// Seçilmiş nailiyyətlər + statistika (Blok 8 — M10 səhifəsinin başı)
// ---------------------------------------------------------------------------

/** Səhifənin başındakı vurğu qrid-i — 3-5 kart (karusel DEYİL, KUDS §21). */
export const FEATURED_ACHIEVEMENT_LIMIT = 3;

/**
 * `status = FEATURED` nailiyyətlər.
 *
 * ⚠️ Status şərti görünürlük köməkçisinin ƏVƏZİNƏ deyil, ONUNLA BİRLİKDƏ
 * qurulur: `visibleWithStatus` sahib şaxəsinə status filtri tətbiq etmir, yəni
 * tək başına işlədilsəydi sahib öz SUBMITTED nailiyyətini də «seçilmiş»
 * bölməsində görərdi.
 */
export async function listFeaturedAchievements(
  viewer: Viewer,
  cohortId: string,
  take: number = FEATURED_ACHIEVEMENT_LIMIT,
): Promise<AchievementItem[]> {
  const rows = await prisma.achievement.findMany({
    where: {
      AND: [
        { cohortId },
        { status: AchievementStatus.FEATURED },
        visibleWithStatus<Prisma.AchievementWhereInput>(
          viewer,
          [...PUBLIC_ACHIEVEMENT_STATUSES],
          "ownerId",
        ),
      ],
    },
    orderBy: [{ awardedAt: "desc" }, { id: "desc" }],
    take,
    select: ACHIEVEMENT_SELECT,
  });

  return rows.map((row) => toAchievementItem(row, viewer));
}

export interface AchievementStats {
  /** Təsdiqlənmiş (VERIFIED + FEATURED) və viewer-ə GÖRÜNƏN nailiyyət sayı. */
  verifiedCount: number;
  /** Neçə fərqli kateqoriyada nailiyyət var. */
  categoryCount: number;
  /** Ən çox nailiyyət olan kateqoriya — heç nə yoxdursa `null`. */
  topCategory: { category: string; count: number } | null;
}

/**
 * Statistika zolağı.
 *
 * ⚠️ Saylar DA görünürlükdən keçir. "24 nailiyyət" yazısı süzgəcsiz sayılsaydı,
 * viewer görmədiyi `CLASS` nailiyyətlərin mövcudluğunu rəqəmdən oxuyardı.
 */
export async function getAchievementStats(
  viewer: Viewer,
  cohortId: string,
): Promise<AchievementStats> {
  const groups = await prisma.achievement.groupBy({
    by: ["category"],
    where: {
      AND: [
        { cohortId },
        { status: { in: [...PUBLIC_ACHIEVEMENT_STATUSES] } },
        visibleWithStatus<Prisma.AchievementWhereInput>(
          viewer,
          [...PUBLIC_ACHIEVEMENT_STATUSES],
          "ownerId",
        ),
      ],
    },
    _count: { _all: true },
  });

  const buckets = groups
    .map((group) => ({ category: group.category, count: group._count._all }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return {
    verifiedCount: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    categoryCount: buckets.length,
    topCategory: buckets[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// 🔴 MODERASİYA NÖVBƏSİ — `listAchievements` İLƏ QURULA BİLMƏZ (TƏLƏ A)
// ---------------------------------------------------------------------------

/**
 * Moderasiya icazəsi olmayan çağırış.
 *
 * Servis `forbidden()` (next/navigation) ÇAĞIRMIR: bu qat HTTP-dən asılı
 * olmamalıdır və vahid/inteqrasiya testində sınana bilməlidir. 403 sərhədi
 * səhifədə qurulur (`requireCohortRole`), bu isə ikinci qatdır.
 */
export class ModerationForbiddenError extends Error {
  constructor(cohortId: string) {
    super(`Moderasiya icazəsi yoxdur (cohort ${cohortId})`);
    this.name = "ModerationForbiddenError";
  }
}

export interface ModerationQueueItem extends AchievementItem {
  description: string | null;
  createdAt: Date;
}

const MODERATION_QUEUE_LIMIT = 50;

/**
 * Təsdiq gözləyən nailiyyətlər — SİNİF MODERATORU üçün (spec §17).
 *
 * 🔴 NİYƏ AYRI FUNKSİYADIR (TƏLƏ A):
 * `listAchievements` → `visibleWithStatus(viewer, [VERIFIED, FEATURED],
 * "ownerId")` status filtrini YALNIZ SAHİBƏ tətbiq etmir. Yəni moderator
 * BAŞQASININ `SUBMITTED` nailiyyətini o funksiya ilə GÖRMÜR — və görməməlidir,
 * çünki o, adi oxu yoludur. Növbəni ora bayraq kimi əlavə etsək iki fərqli
 * icazə modeli (görünürlük ↔ moderasiya) bir funksiyada qarışar və bayraq
 * səhvən `true` ötürüləndə sızma olar.
 *
 * Bu funksiyada:
 *   · giriş qapısı ROL-a görədir (`canModerateCohort`), görünürlüyə görə YOX
 *   · `status = SUBMITTED` sabitdir
 *   · görünürlük filtri YOXDUR — moderasiya ayrı axındır (CLAUDE.md).
 *     `PRIVATE` nailiyyət də növbəyə düşür, çünki onu təsdiqləmək lazımdır.
 *   · hər açılış AuditLog tələb ETMİR (oxu), amma hər QƏRAR tələb EDİR
 *     (aşağıdakı `applyModeration`).
 */
export async function listModerationQueue(
  viewer: Viewer,
  cohortId: string,
  take: number = MODERATION_QUEUE_LIMIT,
): Promise<ModerationQueueItem[]> {
  if (!canModerateCohort(viewer, cohortId)) throw new ModerationForbiddenError(cohortId);

  const rows = await prisma.achievement.findMany({
    where: { cohortId, status: AchievementStatus.SUBMITTED },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
    select: { ...ACHIEVEMENT_SELECT, createdAt: true },
  });

  return rows.map((row) => toAchievementItem(row, viewer));
}

// ---------------------------------------------------------------------------
// 🔴 UNİVERSİTET SƏVİYYƏLİ NÖVBƏ — `listModerationQueue`-ya BAYRAQ ƏLAVƏ EDİLMİR
// ---------------------------------------------------------------------------

export interface UniversityQueueItem extends ModerationQueueItem {
  cohortId: string;
}

/**
 * Bütün siniflərin təsdiq gözləyən nailiyyətləri — UNİVERSİTET ADMİNİ üçün
 * (Blok 11B, `/admin/achievements`).
 *
 * 🔴 NİYƏ AYRI FUNKSİYADIR (yuxarıdakı `listModerationQueue`-ya
 * `cohortId?: string` bayrağı ƏLAVƏ ETMƏK ƏVƏZİNƏ):
 * iki funksiyanın İCAZƏ MODELİ FƏRQLİDİR.
 *   · `listModerationQueue` → `canModerateCohort(viewer, cohortId)` — SİNİF
 *     səviyyəli rol (`CLASS_MODERATOR`), konkret sinifə bağlıdır;
 *   · bu funksiya → `assertFreshAdmin(viewer)` — SİSTEM rolu, bütün siniflər.
 *
 * Bayraq kimi birləşdirsək, `cohortId` verilmədikdə qapı hansı olmalıdır?
 * `canModerateCohort(viewer, null)` sinif moderatoru üçün `false` qaytarır,
 * amma bu, susmaqla verilmiş qərardır — kimsə sonra "boş cohort = hamısı"
 * yazsa BİR SİNFİN moderatoru BÜTÜN universitetin təsdiq gözləyən
 * nailiyyətlərini görərdi. Blok 8-in öz dərsi: iki icazə modeli bir funksiyada
 * qarışanda sızma bayraq dəyərindən asılı olur.
 *
 * ⚠️ QƏRAR funksiyaları (`verify` / `feature` / `reject`) TƏKRAR İŞLƏDİLİR —
 * kopyalanmır. Onların qapısı `canModerateCohort`-dur və `UNIVERSITY_ADMIN`
 * orada onsuz da bütün siniflərdə keçir.
 */
export async function listUniversityModerationQueue(
  viewer: Viewer,
  filters: { cohortId?: string } = {},
  take: number = MODERATION_QUEUE_LIMIT,
): Promise<UniversityQueueItem[]> {
  await assertFreshAdmin(viewer);

  const rows = await prisma.achievement.findMany({
    where: {
      status: AchievementStatus.SUBMITTED,
      ...(filters.cohortId ? { cohortId: filters.cohortId } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
    select: { ...ACHIEVEMENT_SELECT, createdAt: true, cohortId: true },
  });

  return rows.map((row) => toAchievementItem(row, viewer));
}

/** Universitet miqyasında təsdiq gözləyən nailiyyət sayı. */
export async function countUniversityModerationQueue(viewer: Viewer): Promise<number> {
  await assertFreshAdmin(viewer);
  return prisma.achievement.count({ where: { status: AchievementStatus.SUBMITTED } });
}

// ---------------------------------------------------------------------------
// Moderasiya qərarları — TƏK TRANSAKSİYA + MƏCBURİ AuditLog
// ---------------------------------------------------------------------------

export type AchievementModerationFailure = "NOT_FOUND" | "FORBIDDEN";

export type AchievementModerationResult =
  | { ok: true; value: { achievementId: string; status: string; cohortSlug: string } }
  | { ok: false; reason: AchievementModerationFailure };

/** Giriş etmiş istifadəçi — moderasiya anonimə açıq deyil. */
type UserViewer = Extract<Viewer, { kind: "USER" }>;

/** Qərar → bildiriş mətni. Sahibə HƏMİŞƏ məlumat verilir (spec §12). */
const DECISION_NOTICE: Record<
  "VERIFIED" | "FEATURED" | "ARCHIVED",
  { type: string; title: string; audit: string }
> = {
  VERIFIED: {
    type: NotificationType.ACHIEVEMENT_VERIFIED,
    title: "Nailiyyətiniz təsdiqləndi",
    audit: "verifyAchievement",
  },
  FEATURED: {
    type: NotificationType.ACHIEVEMENT_VERIFIED,
    title: "Nailiyyətiniz seçilmişlərə əlavə olundu",
    audit: "featureAchievement",
  },
  ARCHIVED: {
    type: NotificationType.MODERATION_RESULT,
    title: "Nailiyyətiniz arxivləndi",
    audit: "rejectAchievement",
  },
};

/**
 * Moderasiya qərarının VAHİD icrası.
 *
 * Üç ixrac (`verify` / `feature` / `reject`) yalnız hədəf statusla fərqlənir;
 * transaksiyanın gövdəsi eynidir və məhz buna görə bir yerdə saxlanılır —
 * AuditLog və ya timeline təmizliyi bir şaxədə unudulmasın.
 *
 * TƏK TRANSAKSİYA:
 *   1. Achievement.status + verifiedById / verifiedAt / verifyNote
 *   2. AuditLog (MƏCBURİ — moderasiya konteksti, CLAUDE.md)
 *   3. Sahibə Notification
 *   4. VERIFIED / FEATURED → TimelineEntry UPSERT (T11: `achievementId` @unique)
 *      ARCHIVED        → TimelineEntry deleteMany (TƏLƏ C — status dəyişməsi
 *      SOFT-dur, sətir qalır, cascade İŞƏ DÜŞMÜR)
 */
async function applyModeration(
  viewer: UserViewer,
  achievementId: string,
  decision: "VERIFIED" | "FEATURED" | "ARCHIVED",
  note: string | null,
): Promise<AchievementModerationResult> {
  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: {
      id: true,
      ownerId: true,
      cohortId: true,
      title: true,
      description: true,
      organization: true,
      awardedAt: true,
      visibility: true,
      status: true,
      cohort: { select: { slug: true } },
      post: { select: { category: true } },
    },
  });

  if (!achievement) return { ok: false, reason: "NOT_FOUND" };
  if (!canModerateCohort(viewer, achievement.cohortId)) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  const notice = DECISION_NOTICE[decision];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.achievement.update({
      where: { id: achievement.id },
      data: {
        status: decision,
        verifiedById: viewer.userId,
        verifiedAt: now,
        verifyNote: note,
      },
    });

    // ⚠️ TƏLƏ T42 — `recordAudit()` yeganə yazma yoludur: ağ siyahı
    // (`safeAuditMetadata`) yalnız orada tətbiq olunur.
    //
    // ⚠️ Moderatorun qeydi `note` yox, `reason` açarı ilə yazılır — ağ siyahıda
    // sərbəst mətn üçün MƏHZ o slot var (`AUDIT_METADATA_KEYS`). Ad dəyişikliyi
    // məlumat itkisi deyil: qeyd sahibə onsuz da bildirişlə çatdırılır (aşağı).
    await recordAudit(tx, {
      actorId: viewer.userId,
      // Təsdiq / seçilmiş → VERIFY; rədd → MODERATE (enum-da "REJECT" yoxdur).
      action: decision === "ARCHIVED" ? AuditAction.MODERATE : AuditAction.VERIFY,
      entityType: NotificationEntityType.ACHIEVEMENT,
      entityId: achievement.id,
      metadata: {
        operation: notice.audit,
        from: achievement.status,
        to: decision,
        cohortId: achievement.cohortId,
        ownerId: achievement.ownerId,
        reason: note,
      },
    });

    // Moderator öz nailiyyətinə qərar veribsə özünə bildiriş göndərilmir.
    if (achievement.ownerId !== viewer.userId) {
      await tx.notification.create({
        data: {
          recipientId: achievement.ownerId,
          actorId: viewer.userId,
          type: notice.type,
          entityType: NotificationEntityType.ACHIEVEMENT,
          entityId: achievement.id,
          title: notice.title,
          body: note ?? achievement.title,
          url: `/class/${achievement.cohort.slug}/achievements`,
        },
      });
    }

    if (decision === AchievementStatus.ARCHIVED) {
      // TƏLƏ C: `status = ARCHIVED` sətri SAXLAYIR (təsdiq tarixçəsi lazımdır),
      // yəni `onDelete: Cascade` işə düşmür — xronologiya qeydi əl ilə silinir.
      await tx.timelineEntry.deleteMany({ where: { achievementId: achievement.id } });
      return;
    }

    const entry = buildAchievementTimelineEntry({
      achievementId: achievement.id,
      cohortId: achievement.cohortId,
      title: achievement.title,
      description: achievement.description,
      organization: achievement.organization,
      awardedAt: achievement.awardedAt,
      visibility: achievement.visibility as VisibilityType,
      postCategory: (achievement.post?.category as PostCategory | undefined) ?? null,
    });

    // T11 — `achievementId` @unique: ikinci qərar (VERIFIED → FEATURED) `create`
    // ilə `P2002` verərdi.
    await tx.timelineEntry.upsert({
      where: { achievementId: achievement.id },
      create: entry,
      update: {
        title: entry.title,
        summary: entry.summary,
        category: entry.category,
        occurredAt: entry.occurredAt,
        academicYear: entry.academicYear,
        visibility: entry.visibility,
      },
    });
  });

  return {
    ok: true,
    value: {
      achievementId: achievement.id,
      status: decision,
      cohortSlug: achievement.cohort.slug,
    },
  };
}

/** Nailiyyəti təsdiqləyir → `VERIFIED` + TimelineEntry. */
export function verifyAchievement(
  viewer: UserViewer,
  achievementId: string,
  note: string | null = null,
): Promise<AchievementModerationResult> {
  return applyModeration(viewer, achievementId, AchievementStatus.VERIFIED, note);
}

/** Nailiyyəti seçilmişlərə çıxarır → `FEATURED` (səhifənin başındakı vurğu qridi). */
export function featureAchievement(
  viewer: UserViewer,
  achievementId: string,
  note: string | null = null,
): Promise<AchievementModerationResult> {
  return applyModeration(viewer, achievementId, AchievementStatus.FEATURED, note);
}

/** Nailiyyəti rədd edir → `ARCHIVED` + TimelineEntry SİLİNİR (TƏLƏ C). */
export function rejectAchievement(
  viewer: UserViewer,
  achievementId: string,
  note: string,
): Promise<AchievementModerationResult> {
  return applyModeration(viewer, achievementId, AchievementStatus.ARCHIVED, note);
}

/** Növbə sayı — moderasiya səhifəsinin rozeti. İcazə eyni qapıdan keçir. */
export async function countModerationQueue(
  viewer: Viewer,
  cohortId: string,
): Promise<number> {
  if (!canModerateCohort(viewer, cohortId)) throw new ModerationForbiddenError(cohortId);
  return prisma.achievement.count({
    where: { cohortId, status: AchievementStatus.SUBMITTED },
  });
}

/** Statuslar `AchievementStatus` enum-undandır — UI sətir literal yazmır. */
export type AchievementDecision = Extract<
  AchievementStatusType,
  "VERIFIED" | "FEATURED" | "ARCHIVED"
>;
