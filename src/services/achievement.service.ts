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

import { prisma } from "@/lib/db";
import { PUBLIC_ACHIEVEMENT_STATUSES, type AchievementCategory } from "@/lib/enums";
import { tokenizedContains } from "@/lib/text-search";
import { visibleWithStatus, type Viewer } from "@/lib/visibility";

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
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; slug: string; displayName: string };
}

export interface AchievementFilters {
  cohortId?: string;
  ownerId?: string;
  category?: AchievementCategory;
  take?: number;
  skip?: number;
}

const ACHIEVEMENT_PAGE_SIZE = 30;

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
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  cohort: { select: { id: true, slug: true, displayName: true } },
} satisfies Prisma.AchievementSelect;

/**
 * Nailiyyət siyahısı.
 *
 * Sahib öz `SUBMITTED` (təsdiq gözləyən) və `ARCHIVED` nailiyyətlərini də
 * görür — `visibleWithStatus` status filtrini sahib şaxəsinə tətbiq etmir.
 * Başqaları yalnız `VERIFIED` / `FEATURED` görür.
 */
export async function listAchievements(
  viewer: Viewer,
  filters: AchievementFilters = {},
): Promise<AchievementItem[]> {
  return prisma.achievement.findMany({
    where: {
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
    },
    orderBy: [{ awardedAt: "desc" }, { id: "desc" }],
    take: filters.take ?? ACHIEVEMENT_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: ACHIEVEMENT_SELECT,
  });
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

  return prisma.achievement.findMany({
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
}

/** Tək nailiyyət. Görünmürsə `null` — "yoxdur" və "icazə yoxdur" ayırd edilmir. */
export async function getAchievement(
  viewer: Viewer,
  achievementId: string,
): Promise<AchievementItem | null> {
  return prisma.achievement.findFirst({
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
}
