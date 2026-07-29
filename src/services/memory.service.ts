// ============================================================================
// src/services/memory.service.ts
// Share Memories oxu sorğuları (spec §11).
//
// Model: `Memory` · sahib sütunu: `authorId` · status: `ACTIVE` →
// `activeVisibleWhere` (Post ilə eyni ailə).
//
// ⚠️ `Memory`-nin DÖRD AYRICA göstərilmə seçimi var (`showInProfile`,
// `showInFeed`, `showInTimeline`, `showInYearbook`) və bunlar görünürlük
// SƏVİYYƏSİNDƏN fərqlidir: səviyyə "kim görə bilər", bu bayraqlar isə "harada
// göstərilir" sualına cavab verir. İkisi birlikdə tətbiq olunur.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { MemoryType } from "@/lib/enums";
import { activeVisibleWhere, type Viewer } from "@/lib/visibility";

export interface MemoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  dedicatedTo: string | null;
  imageUrl: string | null;
  visibility: string;
  occurredAt: Date;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; slug: string; displayName: string };
}

export interface MemoryFilters {
  cohortId?: string;
  authorId?: string;
  type?: MemoryType;
  /** Yerləşdirmə yerinə görə süzgəc — Memory-nin 4 göstərilmə seçimi. */
  surface?: "profile" | "feed" | "timeline" | "yearbook";
  take?: number;
  skip?: number;
}

const MEMORY_PAGE_SIZE = 30;

const SURFACE_FIELD = {
  profile: "showInProfile",
  feed: "showInFeed",
  timeline: "showInTimeline",
  yearbook: "showInYearbook",
} as const satisfies Record<NonNullable<MemoryFilters["surface"]>, keyof Prisma.MemoryWhereInput>;

const MEMORY_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  dedicatedTo: true,
  imageUrl: true,
  visibility: true,
  occurredAt: true,
  createdAt: true,
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  cohort: { select: { id: true, slug: true, displayName: true } },
} satisfies Prisma.MemorySelect;

export async function listMemories(
  viewer: Viewer,
  filters: MemoryFilters = {},
): Promise<MemoryItem[]> {
  return prisma.memory.findMany({
    where: {
      AND: [
        activeVisibleWhere<Prisma.MemoryWhereInput>(viewer, "authorId"),
        ...(filters.cohortId ? [{ cohortId: filters.cohortId }] : []),
        ...(filters.authorId ? [{ authorId: filters.authorId }] : []),
        ...(filters.type ? [{ type: filters.type }] : []),
        ...(filters.surface ? [{ [SURFACE_FIELD[filters.surface]]: true }] : []),
      ],
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: filters.take ?? MEMORY_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: MEMORY_SELECT,
  });
}

/** Tək xatirə. Görünmürsə `null`. */
export async function getMemory(viewer: Viewer, memoryId: string): Promise<MemoryItem | null> {
  return prisma.memory.findFirst({
    where: {
      AND: [{ id: memoryId }, activeVisibleWhere<Prisma.MemoryWhereInput>(viewer, "authorId")],
    },
    select: MEMORY_SELECT,
  });
}
