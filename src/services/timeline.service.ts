// ============================================================================
// src/services/timeline.service.ts
// Class Timeline oxu sorğuları (spec §10).
//
// Model: `TimelineEntry` · sahib sütunu YOXDUR (qeyd törəmədir) →
// `timelineVisibilityWhere()` işlədilir, sahib şaxəsi mənbə əlaqələrindən
// qurulur. Bax `src/lib/visibility.ts` başındakı cədvəl.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { PostCategory } from "@/lib/enums";
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
  take?: number;
  skip?: number;
}

export interface TimelineResult {
  items: TimelineItem[];
  /** Filtrlə uyğun gələn və viewer-in GÖRDÜYÜ akademik illər (filtr paneli üçün). */
  academicYears: string[];
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
    ],
  };
}

/**
 * Xronologiya — tədris ili və kateqoriya filtri ilə.
 *
 * ⚠️ `academicYears` siyahısı DA məxfilik süzgəcindən keçir: kateqoriya filtri
 * çıxarılır (illər siyahısı kateqoriyadan asılı olmamalıdır), amma görünürlük
 * şərti qalır — əks halda görünməyən qeydin ili filtr panelində peyda olar və
 * "həmin ildə nəsə var" faktını sızdırardı.
 */
export async function listTimeline(
  viewer: Viewer,
  filters: TimelineFilters = {},
): Promise<TimelineResult> {
  const [rows, years] = await Promise.all([
    prisma.timelineEntry.findMany({
      where: timelineWhere(viewer, filters),
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
      where: timelineWhere(viewer, { ...filters, category: undefined, academicYear: undefined }),
      distinct: ["academicYear"],
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    }),
  ]);

  return {
    items: rows,
    academicYears: years.map((y) => y.academicYear),
  };
}
