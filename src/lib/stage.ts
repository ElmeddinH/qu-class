// ============================================================================
// src/lib/stage.ts
// QU CLASS — həyat dövrü mərhələsi (INCOMING → STUDENT → ALUMNI) və
// akademik il hesablamaları.
//
// ⚠️ VAHİD HƏQİQƏT MƏNBƏYİ `resolveStage(cohort, now)`-dur (PLAN.md §4.6).
// `User.stage` yalnız keşdir — girişdə `syncUserStage()` ilə yenilənir.
// UI-da mərhələ lazımdırsa cohort tarixlərindən hesabla, `User.stage`-ə
// güvənmə.
//
// `Cohort.admissionYear` / `graduationYear` yalnız ETİKETDİR (filtr, ad).
// Keçidi `academicStartsAt` / `graduatesAt` müəyyən edir.
// ============================================================================

import { prisma } from "@/lib/db";
import { UserStage, type UserStage as UserStageType } from "@/lib/enums";

/** `resolveStage` üçün lazım olan minimal cohort forması. */
export interface StageWindow {
  academicStartsAt: Date;
  graduatesAt: Date;
}

/**
 * Cohort-un tarix pəncərəsinə görə mərhələni hesablayır.
 *
 *   now < academicStartsAt          → INCOMING  (qəbul olunub, dərslər başlamayıb)
 *   academicStartsAt ≤ now < graduatesAt → STUDENT
 *   now ≥ graduatesAt               → ALUMNI
 */
export function resolveStage(cohort: StageWindow, now: Date = new Date()): UserStageType {
  if (now < cohort.academicStartsAt) return UserStage.INCOMING;
  if (now < cohort.graduatesAt) return UserStage.STUDENT;
  return UserStage.ALUMNI;
}

/** Akademik il sentyabrın 1-də başlayır (0-əsaslı ay indeksi: 8). */
const ACADEMIC_YEAR_START_MONTH = 8;

/**
 * Tarixi akademik ilə çevirir: sentyabr 1 – avqust 31.
 *
 *   2026-11-05 → "2026-2027"
 *   2027-03-14 → "2026-2027"
 *   2027-09-01 → "2027-2028"
 */
export function academicYearOf(date: Date): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= ACADEMIC_YEAR_START_MONTH ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** Akademik ilin başlanğıc və bitmə anları — Timeline filtrləri üçün. */
export function academicYearRange(academicYear: string): { start: Date; end: Date } {
  const startYear = Number.parseInt(academicYear.slice(0, 4), 10);
  return {
    start: new Date(Date.UTC(startYear, ACADEMIC_YEAR_START_MONTH, 1)),
    end: new Date(Date.UTC(startYear + 1, ACADEMIC_YEAR_START_MONTH, 1)),
  };
}

/**
 * İstifadəçinin bütün cohort üzvlüklərindən mərhələni seçir.
 * Bir neçə cohort varsa ƏSAS (`isPrimary`) olan üstündür; yoxdursa ən son
 * qoşulduğu cohort götürülür — belə ki, məzun olub magistraturaya girən
 * istifadəçi yenidən STUDENT olur.
 */
export function stageFromMemberships(
  memberships: Array<{ isPrimary: boolean; joinedAt: Date; cohort: StageWindow }>,
  now: Date = new Date(),
): UserStageType | null {
  if (memberships.length === 0) return null;

  const sorted = [...memberships].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return b.joinedAt.getTime() - a.joinedAt.getTime();
  });

  return resolveStage(sorted[0].cohort, now);
}

/**
 * `User.stage` keşini cohort tarixlərinə görə yeniləyir.
 * Girişdə (Blok 2) və gecə cron-unda çağırılır.
 *
 * @returns yenilənmiş mərhələ, cohort üzvlüyü yoxdursa `null`.
 */
export async function syncUserStage(
  userId: string,
  now: Date = new Date(),
): Promise<UserStageType | null> {
  const memberships = await prisma.cohortMembership.findMany({
    where: { userId },
    select: {
      isPrimary: true,
      joinedAt: true,
      cohort: { select: { academicStartsAt: true, graduatesAt: true } },
    },
  });

  const stage = stageFromMemberships(memberships, now);
  if (stage === null) return null;

  await prisma.user.updateMany({
    where: { id: userId, stage: { not: stage } },
    data: { stage },
  });

  return stage;
}
