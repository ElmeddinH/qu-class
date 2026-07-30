// ============================================================================
// src/services/admin.service.ts
// Admin dashboard-un rəqəmləri (spec §17).
//
// 🔴 TƏLƏ G — YALNIZ STRUKTUR SAYLAR VƏ AQREQAT ZAMAN SERİYASI.
// «Ən aktiv istifadəçilər», «kim nə qədər paylaşıb» kimi ŞƏXSƏ BAĞLI SIRALAMA
// BURADA YOXDUR və əlavə edilməməlidir. Səbəb: platformanın bütün məxfilik
// modeli istifadəçinin öz məzmununun ƏHATƏSİNİ seçməsi üzərində qurulub
// (`CLASS` paylaşım sinifdən kənara çıxmır). Universitet miqyaslı lider
// cədvəli həmin seçimi ARXADAN dolanardı: paylaşımın MƏTNİ görünməsə də,
// «Filankəs bu ay 42 paylaşım etdi» sətri onun davranışını ifşa edir.
//
// Zaman seriyası (həftəlik paylaşım / qeydiyyat sayı) məqbuldur — orada fərd
// yoxdur. Aqreqasiya `lib/admin-series.ts`-dədir və o modul `userId` GÖRMÜR.
//
// ⚠️ Səhifə NAZİKDİR: bütün saylar buradan gəlir, `page.tsx` yalnız render edir.
// ============================================================================

import { buildWeeklySeries, seriesRangeStart, type SeriesPoint } from "@/lib/admin-series";
import { assertFreshAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import {
  AchievementStatus,
  EventStatus,
  PostStatus,
  ReportStatus,
} from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

export interface AdminDashboardStats {
  /** Aktiv (deaktiv edilməmiş) istifadəçi sayı. */
  userCount: number;
  /** Deaktiv edilmiş hesablar — ayrıca göstərilir, ümumi saya daxil deyil. */
  deactivatedCount: number;
  /** Dərsləri başlamış və hələ məzun olmamış cohort-lar. */
  activeCohortCount: number;
  cohortCount: number;
  /** Bu təqvim ayında yaradılmış AKTİV paylaşım sayı. */
  postsThisMonth: number;
  /** İndidən sonra başlayan dərc olunmuş tədbirlər. */
  upcomingEventCount: number;
  /** `status = OPEN` şikayətlər. */
  openReportCount: number;
  /** `status = SUBMITTED` nailiyyətlər (universitet miqyasında). */
  pendingAchievementCount: number;
}

/**
 * Dashboard zolağının altı rəqəmi (+ iki köməkçi).
 *
 * ⚠️ Saylar GÖRÜNÜRLÜK SÜZGƏCİNDƏN KEÇMİR və bu, qəsdli fərqdir: sinif
 * səhifəsindəki saylar (`getCohortHeadlineStats`) viewer-in gördüyü məzmunu
 * sayır, çünki onlar İSTİFADƏÇİYƏ göstərilir. Buradakı rəqəmlər isə
 * platformanın İDARƏETMƏ göstəriciləridir — "neçə açıq şikayət var?" sualına
 * "sənin görə bildiyin qədər" cavabı mənasızdır. Fərqin qiyməti: qapı
 * `assertFreshAdmin`-dir və heç bir MƏZMUN qaytarılmır, yalnız SAYLAR.
 */
export async function getAdminDashboardStats(
  viewer: Viewer,
  now: Date = new Date(),
): Promise<AdminDashboardStats> {
  await assertFreshAdmin(viewer);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    userCount,
    deactivatedCount,
    cohortCount,
    activeCohortCount,
    postsThisMonth,
    upcomingEventCount,
    openReportCount,
    pendingAchievementCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deactivatedAt: null } }),
    prisma.user.count({ where: { deactivatedAt: { not: null } } }),
    prisma.cohort.count(),
    // ⚠️ «Aktiv cohort» `User.stage` keşindən DEYİL, cohort TARİXLƏRİNDƏN
    // hesablanır (`resolveStage`-in DB qarşılığı — Blok 6-dakı nümunə).
    prisma.cohort.count({
      where: { academicStartsAt: { lte: now }, graduatesAt: { gte: now } },
    }),
    prisma.post.count({
      where: { status: PostStatus.ACTIVE, createdAt: { gte: monthStart } },
    }),
    prisma.event.count({
      where: { status: EventStatus.PUBLISHED, startsAt: { gte: now } },
    }),
    prisma.report.count({ where: { status: ReportStatus.OPEN } }),
    prisma.achievement.count({ where: { status: AchievementStatus.SUBMITTED } }),
  ]);

  return {
    userCount,
    deactivatedCount,
    cohortCount,
    activeCohortCount,
    postsThisMonth,
    upcomingEventCount,
    openReportCount,
    pendingAchievementCount,
  };
}

/**
 * Son 12 həftənin paylaşım və qeydiyyat sayı.
 *
 * 🔴 SORĞU YALNIZ `createdAt` SEÇİR. `authorId` belə gətirilmir — yəni bu
 * funksiyanın nəticəsindən fərdi davranış çıxarmaq mümkün deyil (TƏLƏ G).
 * Xanalara bölmə saf moduldadır (`lib/admin-series.ts`) və testlə örtülüdür.
 *
 * ⚠️ JS-də bölmə CLAUDE.md §5-in qadağasına düşmür: orada söhbət GÖRÜNÜRLÜK
 * FİLTRİNDƏN gedir (pagination-ı sındırır və sızma yaradır). Burada isə süzgəc
 * DB-dədir (`createdAt >= başlanğıc`), JS yalnız 12 xanaya AQREQASİYA edir.
 */
export async function getAdminActivitySeries(
  viewer: Viewer,
  now: Date = new Date(),
): Promise<SeriesPoint[]> {
  await assertFreshAdmin(viewer);

  const since = seriesRangeStart(now);

  const [posts, members] = await Promise.all([
    prisma.post.findMany({
      where: { status: PostStatus.ACTIVE, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  return buildWeeklySeries(
    posts.map((p) => p.createdAt),
    members.map((m) => m.createdAt),
    now,
  );
}
