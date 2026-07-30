// ============================================================================
// src/services/timeline.service.ts
// Class Timeline oxu sorğuları + sistem milestone-larının törədilməsi (spec §10).
//
// Model: `TimelineEntry` · sahib sütunu YOXDUR (qeyd törəmədir) →
// `timelineVisibilityWhere()` işlədilir, sahib şaxəsi mənbə əlaqələrindən
// qurulur. Bax `src/lib/visibility.ts` başındakı cədvəl.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { PostCategory, TimelineSourceType } from "@/lib/enums";
import { buildCohortMilestones, type CohortMilestone } from "@/lib/milestones";
import { timelineVisibilityWhere, type Viewer } from "@/lib/visibility";

export interface TimelineItem {
  id: string;
  sourceType: string;
  title: string;
  summary: string | null;
  category: string;
  occurredAt: Date;
  academicYear: string;
  visibility: string;
  isSystemMilestone: boolean;
  cohort: { id: string; slug: string; displayName: string };
  postId: string | null;
  achievementId: string | null;
  eventId: string | null;
}

export interface TimelineFilters {
  cohortId?: string;
  /** "2026-2027" — sentyabr 1-dən avqust 31-ə (bax `lib/stage.ts`). */
  academicYear?: string;
  category?: PostCategory;
  /** POST | ACHIEVEMENT | EVENT | SYSTEM */
  sourceType?: TimelineSourceType;
  take?: number;
  skip?: number;
}

export interface TimelineResult {
  items: TimelineItem[];
  /** Filtrlə uyğun gələn və viewer-in GÖRDÜYÜ akademik illər (filtr paneli üçün). */
  academicYears: string[];
  /** Səhifələmə üçün ümumi say — filtrlər tətbiq olunmuş, `take/skip` yox. */
  total: number;
}

const TIMELINE_PAGE_SIZE = 50;

function timelineWhere(
  viewer: Viewer,
  filters: TimelineFilters,
): Prisma.TimelineEntryWhereInput {
  return {
    AND: [
      timelineVisibilityWhere<Prisma.TimelineEntryWhereInput>(viewer),
      ...(filters.cohortId ? [{ cohortId: filters.cohortId }] : []),
      ...(filters.academicYear ? [{ academicYear: filters.academicYear }] : []),
      ...(filters.category ? [{ category: filters.category }] : []),
      ...(filters.sourceType ? [{ sourceType: filters.sourceType }] : []),
    ],
  };
}

/**
 * Xronologiya — tədris ili, kateqoriya və mənbə növü filtri ilə.
 *
 * ⚠️ `academicYears` siyahısı DA məxfilik süzgəcindən keçir: kateqoriya və
 * mənbə filtri çıxarılır (illər siyahısı onlardan asılı olmamalıdır), amma
 * görünürlük şərti qalır — əks halda görünməyən qeydin ili filtr panelində
 * peyda olar və "həmin ildə nəsə var" faktını sızdırardı.
 *
 * ⚠️ `total` DA eyni `where`-dən hesablanır (`count`), JS-də sayılmır —
 * səhifələmə süzgəcdən keçmiş sayı göstərməlidir (CLAUDE.md §5).
 */
export async function listTimeline(
  viewer: Viewer,
  filters: TimelineFilters = {},
): Promise<TimelineResult> {
  const where = timelineWhere(viewer, filters);

  const [rows, years, total] = await Promise.all([
    prisma.timelineEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: filters.take ?? TIMELINE_PAGE_SIZE,
      skip: filters.skip ?? 0,
      select: {
        id: true,
        sourceType: true,
        title: true,
        summary: true,
        category: true,
        occurredAt: true,
        academicYear: true,
        visibility: true,
        isSystemMilestone: true,
        postId: true,
        achievementId: true,
        eventId: true,
        cohort: { select: { id: true, slug: true, displayName: true } },
      },
    }),

    prisma.timelineEntry.findMany({
      where: timelineWhere(viewer, {
        ...filters,
        category: undefined,
        sourceType: undefined,
        academicYear: undefined,
      }),
      distinct: ["academicYear"],
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    }),

    prisma.timelineEntry.count({ where }),
  ]);

  return {
    items: rows,
    academicYears: years.map((y) => y.academicYear),
    total,
  };
}

// ---------------------------------------------------------------------------
// Sistem milestone-ları (spec §10)
// ---------------------------------------------------------------------------

/**
 * Cohort tarixlərindən törəyən sistem milestone-larını bazaya YAZIR.
 *
 * ⚠️ `Viewer` ARQUMENTİ YOXDUR və bu, CLAUDE.md §4-ün pozulması deyil: funksiya
 * heç nə OXUMUR/qaytarmır, yalnız cohort-un öz tarixlərindən (məxfiliyə tabe
 * olmayan struktur məlumat) törəmə sətirləri sinxronlaşdırır. Həmin sətirlərin
 * kimə görünəcəyi adi yolla — `listTimeline` → `timelineVisibilityWhere` ilə
 * həll olunur.
 *
 * 🔴 İDEMPOTENTDİR. Timeline səhifəsi hər açılışda bunu çağırır:
 *   · id deterministikdir (`mil-<cohortId>-<açar>`) və `upsert` işlədilir —
 *     ikinci çağırış dublikat yaratmır (`create` işlətsək hər ziyarət yeni
 *     sətir olardı)
 *   · SİYAHIDA OLMAYAN köhnə milestone-lar SİLİNİR: cohort tarixləri admin
 *     tərəfindən dəyişdirilsə köhnə "Dərslər başladı" qeydi yanlış tarixdə
 *     asılı qalardı. Silmə YALNIZ `isSystemMilestone` sətirlərinə toxunur —
 *     post / nailiyyət / tədbir qeydləri bu funksiyanın işi deyil.
 *
 * ⚠️ Gələcək tarixli milestone `buildCohortMilestones`-də süzülür (bax həmin
 * faylın 3-cü qaydası), yəni məzuniyyət hələ olmayıbsa qeyd YARADILMIR.
 */
export async function ensureCohortMilestones(
  cohortId: string,
  now: Date = new Date(),
): Promise<CohortMilestone[]> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { id: true, admissionYear: true, academicStartsAt: true, graduatesAt: true },
  });
  if (!cohort) return [];

  const milestones = buildCohortMilestones(cohort, now);
  const ids = milestones.map((milestone) => milestone.id);

  await prisma.$transaction([
    ...milestones.map((milestone) =>
      prisma.timelineEntry.upsert({
        where: { id: milestone.id },
        create: milestone,
        update: {
          title: milestone.title,
          summary: milestone.summary,
          category: milestone.category,
          occurredAt: milestone.occurredAt,
          academicYear: milestone.academicYear,
          visibility: milestone.visibility,
        },
      }),
    ),
    prisma.timelineEntry.deleteMany({
      where: { cohortId, isSystemMilestone: true, id: { notIn: ids } },
    }),
  ]);

  return milestones;
}
