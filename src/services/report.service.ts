// ============================================================================
// src/services/report.service.ts
// Şikayət (Report) yaradılması — moderasiya növbəsinin girişi (spec §17).
//
// Moderasiya PANELİ Blok 11-dədir; burada yalnız istifadəçinin şikayət
// göndərməsi var, çünki lent kartında "Şikayət et" düyməsi Blok 4-ün tələbidir.
//
// ⚠️ Şikayət qeydi məzmunu AÇMIR — yalnız `entityType` + `entityId` saxlanılır.
// Moderator məzmuna `canModerate` yolu ilə çıxır və o yol AuditLog yazır.
// ============================================================================

import { prisma } from "@/lib/db";
import {
  ReportEntityType,
  ReportReason,
  ReportStatus,
  type ReportEntityType as ReportEntityTypeValue,
  type ReportReason as ReportReasonValue,
} from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

type UserViewer = Extract<Viewer, { kind: "USER" }>;

export interface CreateReportData {
  entityType: ReportEntityTypeValue;
  entityId: string;
  reason: ReportReasonValue;
  details: string | null;
}

export type CreateReportResult =
  | { ok: true; value: { reportId: string; duplicate: boolean } }
  | { ok: false; reason: "NOT_FOUND" };

/**
 * Şikayət yaradır.
 *
 * ⚠️ Eyni istifadəçi eyni obyekti təkrar şikayət edərsə YENİ sətir yaranmır —
 * növbədə eyni adamın on eyni şikayəti moderatoru boğardı. İstifadəçiyə yenə
 * "qəbul edildi" deyilir (`duplicate: true`), çünki "artıq şikayət etmisiniz"
 * mesajı başqasının şikayətini də ifşa edə bilər.
 */
export async function createReport(
  viewer: UserViewer,
  data: CreateReportData,
): Promise<CreateReportResult> {
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: viewer.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] },
    },
    select: { id: true },
  });

  if (existing) return { ok: true, value: { reportId: existing.id, duplicate: true } };

  const report = await prisma.report.create({
    data: {
      reporterId: viewer.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      reason: data.reason,
      details: data.details,
      status: ReportStatus.OPEN,
    },
    select: { id: true },
  });

  return { ok: true, value: { reportId: report.id, duplicate: false } };
}

// ---------------------------------------------------------------------------
// Əlçatanlıq maneəsi (KUDS §21 / WCAG 2.2) — Blok 11A
// ---------------------------------------------------------------------------

/**
 * `/accessibility` səhifəsindəki formanın gövdəsi.
 *
 * ⚠️ `pagePath` sətir ID-si DEYİL, YOLDUR (`/khankendi/gpl-01`). `Report`
 * modelində ayrıca sütun açmadıq: `entityId` onsuz da "hansı obyekt" sualına
 * cavab verir və əlçatanlıq bildirişində həmin obyekt SƏHİFƏDİR
 * (bax `lib/enums.ts` → `REPORT_ENTITY_TYPE_VALUES` şərhi).
 */
export interface CreateAccessibilityReportData {
  /** Maneənin görüldüyü səhifə yolu — sayt daxilində, mütləq. */
  pagePath: string;
  details: string;
}

/**
 * Əlçatanlıq maneəsi bildirişi.
 *
 * 🔴 NİYƏ AYRI FUNKSİYA (dublikat deyil):
 * 1. `createReport` TƏKRARI ƏZİR — eyni istifadəçi + eyni obyekt + açıq status
 *    → yeni sətir yaranmır. Məzmun şikayətində bu doğrudur (moderatoru eyni
 *    postun on eyni şikayəti boğar), əlçatanlıqda isə YANLIŞDIR: bir səhifədə
 *    iki fərqli maneə ola bilər (kontrast + klaviatura tələsi) və ikincisi
 *    səssizcə itərdi.
 * 2. `reason` istifadəçidən SORUŞULMUR — `ReportReason` siyahısı məzmun
 *    şikayəti üçündür (spam, təhqir…) və maneəyə uyğun gələni yoxdur. Sabit
 *    `OTHER` yazılır, əsl məlumat `details`-dədir.
 *
 * ⚠️ `reporterId` MƏCBURİDİR (sxem), yəni forma GİRİŞ TƏLƏB EDİR. Anonim
 * ziyarətçiyə `/accessibility` səhifəsi TAM göstərilir (bəyanat + e-poçt
 * kanalı), forma isə giriş çağırışı ilə əvəzlənir — səbəbi STATE.md-dədir.
 */
export async function createAccessibilityReport(
  viewer: UserViewer,
  data: CreateAccessibilityReportData,
): Promise<{ reportId: string }> {
  const report = await prisma.report.create({
    data: {
      reporterId: viewer.userId,
      entityType: ReportEntityType.ACCESSIBILITY,
      entityId: data.pagePath,
      reason: ReportReason.OTHER,
      details: data.details,
      status: ReportStatus.OPEN,
    },
    select: { id: true },
  });

  return { reportId: report.id };
}
