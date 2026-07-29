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
import { ReportStatus, type ReportEntityType, type ReportReason } from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

type UserViewer = Extract<Viewer, { kind: "USER" }>;

export interface CreateReportData {
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
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
