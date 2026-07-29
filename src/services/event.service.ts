// ============================================================================
// src/services/event.service.ts
// Events & Reunion oxu sorğuları (spec §14, §15).
//
// Model: `Event` · sahib sütunu: `createdById` · statuslar:
// `PUBLISHED` | `COMPLETED`.
//
// ⚠️ `activeVisibleWhere` İŞLƏTMƏ — `Event`-də `ACTIVE` statusu yoxdur.
//
// ⚠️ `Event.cohortId` NULL ola bilər (UNIVERSITY / FACULTY səviyyəli tədbirlər).
// Nəticə: `visibility = CLASS` + `cohortId = NULL` tədbir HEÇ KİMƏ görünmür
// (yaradıcısından başqa). SQL-də `NULL IN (...)` heç vaxt TRUE olmur, yəni
// `visibilityWhere`-in CLASS şaxəsi belə sətri seçmir; `canView` isə eyni
// nəticəni açıq şəkildə verir (`r.cohortId !== null`). Bu, ARZUOLUNAN
// davranışdır: sinif səviyyəsində elan edilmiş, amma sinfi göstərilməmiş
// tədbir sızmamalıdır. `visibility.test.ts` bunu bərkidir.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { PUBLIC_EVENT_STATUSES, type EventCategory, type EventScope } from "@/lib/enums";
import { tokenizedContains } from "@/lib/text-search";
import { visibleWithStatus, type Viewer } from "@/lib/visibility";

export interface EventItem {
  id: string;
  scope: string;
  category: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  onlineUrl: string | null;
  isOnline: boolean;
  capacity: number | null;
  registrationDeadline: Date | null;
  coverUrl: string | null;
  visibility: string;
  status: string;
  createdBy: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; slug: string; displayName: string } | null;
  faculty: { id: string; name: string } | null;
  club: { id: string; name: string; slug: string } | null;
  rsvpCount: number;
}

export interface EventFilters {
  /**
   * Sinif süzgəci. ⚠️ Yalnız `cohortId` bərabərliyini yoxlayır — universitet
   * və fakültə tədbirlərini (`cohortId = null`) DAXİL ETMİR. Sinfin gördüyü
   * BÜTÜN tədbirlər üçün `audienceCohortId` işlət.
   */
  cohortId?: string;
  /**
   * Sinfin GÖRDÜYÜ tədbirlər: həmin sinfin öz tədbirləri **və** universitet /
   * fakültə / klub səviyyəli tədbirlər (`cohortId = null`).
   *
   * Class Page-dəki "Qarşıdan gələn tədbirlər" widget-i bunu işlədir — sinif
   * səviyyəli tədbir azdır, amma tələbə universitet tədbirlərini də görür.
   *
   * ⚠️ Bu, AUDİTORİYA süzgəcidir, məxfilik süzgəci DEYİL. Görünürlük yenə
   * `visibleWithStatus` tərəfindən ayrıca tətbiq olunur: `cohortId = null` +
   * `visibility = CLASS` tədbir bu şərtdən keçsə belə görünürlük şərtindən
   * keçmir (bax fayl başlığındakı qeyd).
   *
   * `cohortId` ilə birlikdə verilsə hər ikisi AND ilə birləşir — praktikada
   * yalnız biri işlədilir.
   */
  audienceCohortId?: string;
  scope?: EventScope;
  category?: EventCategory;
  /** `true` — yalnız gələcək tədbirlər, `false` — yalnız keçmiş. */
  upcoming?: boolean;
  take?: number;
  skip?: number;
}

const EVENT_PAGE_SIZE = 30;

const EVENT_SELECT = {
  id: true,
  scope: true,
  category: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  location: true,
  onlineUrl: true,
  isOnline: true,
  capacity: true,
  registrationDeadline: true,
  coverUrl: true,
  visibility: true,
  status: true,
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  cohort: { select: { id: true, slug: true, displayName: true } },
  faculty: { select: { id: true, name: true } },
  club: { select: { id: true, name: true, slug: true } },
  _count: { select: { rsvps: true } },
} satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

function toEventItem(row: EventRow): EventItem {
  const { _count, ...rest } = row;
  return { ...rest, rsvpCount: _count.rsvps };
}

/**
 * Tədbir siyahısı.
 *
 * Yaradıcı öz `DRAFT` və `CANCELLED` tədbirlərini də görür —
 * `visibleWithStatus` status filtrini sahib şaxəsinə tətbiq etmir.
 */
export async function listEvents(
  viewer: Viewer,
  filters: EventFilters = {},
  now: Date = new Date(),
): Promise<EventItem[]> {
  const rows = await prisma.event.findMany({
    where: {
      AND: [
        visibleWithStatus<Prisma.EventWhereInput>(
          viewer,
          [...PUBLIC_EVENT_STATUSES],
          "createdById",
        ),
        ...(filters.cohortId ? [{ cohortId: filters.cohortId }] : []),
        ...(filters.audienceCohortId
          ? [{ OR: [{ cohortId: filters.audienceCohortId }, { cohortId: null }] }]
          : []),
        ...(filters.scope ? [{ scope: filters.scope }] : []),
        ...(filters.category ? [{ category: filters.category }] : []),
        ...(filters.upcoming === undefined
          ? []
          : [{ startsAt: filters.upcoming ? { gte: now } : { lt: now } }]),
      ],
    },
    orderBy: filters.upcoming === false ? [{ startsAt: "desc" }] : [{ startsAt: "asc" }],
    take: filters.take ?? EVENT_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: EVENT_SELECT,
  });

  return rows.map(toEventItem);
}

/**
 * Qlobal axtarışın tədbir bölməsi [M16].
 *
 * Görünürlük + status şərti `listEvents` ilə EYNİ köməkçidəndir
 * (`visibleWithStatus`, `PUBLIC_EVENT_STATUSES`) — axtarış yalnız mətn şərtini
 * əlavə edir. `activeVisibleWhere` işlətmə: `Event`-də `ACTIVE` statusu yoxdur.
 */
export async function searchEvents(
  viewer: Viewer,
  term: string,
  take: number,
): Promise<EventItem[]> {
  const textWhere = tokenizedContains<Prisma.EventWhereInput>(
    ["title", "description", "location"],
    term,
  );
  if (textWhere === null) return [];

  const rows = await prisma.event.findMany({
    where: {
      AND: [
        visibleWithStatus<Prisma.EventWhereInput>(
          viewer,
          [...PUBLIC_EVENT_STATUSES],
          "createdById",
        ),
        textWhere,
      ],
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    take,
    select: EVENT_SELECT,
  });

  return rows.map(toEventItem);
}

/** Tək tədbir. Görünmürsə `null`. */
export async function getEvent(viewer: Viewer, eventId: string): Promise<EventItem | null> {
  const row = await prisma.event.findFirst({
    where: {
      AND: [
        { id: eventId },
        visibleWithStatus<Prisma.EventWhereInput>(
          viewer,
          [...PUBLIC_EVENT_STATUSES],
          "createdById",
        ),
      ],
    },
    select: EVENT_SELECT,
  });

  return row ? toEventItem(row) : null;
}
