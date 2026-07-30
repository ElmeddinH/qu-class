// ============================================================================
// src/services/event.service.ts
// Events & Reunion — oxu VƏ yazı sorğuları (spec §14, §15).
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
//
// ----------------------------------------------------------------------------
// İKİ AYRI İCAZƏ MODELİ — qarışdırma (Blok 8-in TƏLƏ A dərsi)
// ----------------------------------------------------------------------------
// 1. GÖRÜNÜRLÜK — `visibleWithStatus(...)`. Adi oxu yolu: kim hansı tədbiri
//    görür. Bütün siyahı/detal funksiyaları buradan keçir.
// 2. İDARƏETMƏ — `canManageEvent(...)`. Koordinator paneli, check-in, toplu
//    bildiriş, iştirakçı cədvəli. Bu funksiyalarda görünürlük filtri YOXDUR
//    (koordinator öz `DRAFT` tədbirini də idarə edir), əvəzinə ROL qapısı var.
//
// İkisini bir funksiyada bayraqla birləşdirmək cazibədardır və məhz belə
// birləşdirmə Blok 8-də sızmaya səbəb olurdu — AYRI funksiyalar saxlanılır.
//
// 🔴 RSVP QAYDALARI BURADA DEYİL. Tutum, gözləmə siyahısı və son tarix
// hesabları `src/lib/rsvp.ts`-dədir (saf, testlə örtülü); bu qat yalnız
// sətirləri gətirib həmin funksiyaları çağırır.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  AuditAction,
  EVENT_MANAGER_ROLES,
  EventScope,
  EventStatus,
  MediaType,
  NotificationEntityType,
  NotificationType,
  PUBLIC_EVENT_STATUSES,
  RsvpStatus,
  SystemRole,
  Visibility,
  type EventCategory,
  type EventScope as EventScopeType,
  type RsvpStatus as RsvpStatusType,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import {
  ATTENDED_RSVP_STATUSES,
  SEAT_HOLDING_RSVP_STATUSES,
  averageRating,
  canLeaveFeedback,
  resolveRsvpDecision,
  summarizeRsvps,
  type RsvpBreakdown,
  type RsvpIntent,
  type RsvpRejection,
} from "@/lib/rsvp";
import { tokenizedContains } from "@/lib/text-search";
import {
  redactProfile,
  visibleWithStatus,
  type ProfileView,
  type Viewer,
} from "@/lib/visibility";
import { buildEventTimelineEntry } from "@/features/feed/fanout";

/** Giriş etmiş istifadəçi — yazı əməliyyatları anonimə açıq deyil. */
type UserViewer = Extract<Viewer, { kind: "USER" }>;

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
  /**
   * YER TUTAN iştirakçıların sayı — BÜTÜN RSVP sətirləri DEYİL.
   *
   * 🔴 Fərq vacibdir: `createEvent` sinfin HƏR üzvünə `INVITED` sətri yaradır
   * (dəvət mərhələsi), yəni xam `_count.rsvps` 20 nəfərlik sinifdə dərhal 20
   * olardı və 15 yerlik tədbir «tutum dolub» kimi görünərdi. Say
   * `SEAT_HOLDING_RSVP_STATUSES` ilə süzülür (`lib/rsvp.ts`).
   */
  attendingCount: number;
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
  scope?: EventScopeType;
  category?: EventCategory;
  /** `Event.facultyId` — spec §15 «fakültə» filtri. */
  facultyId?: string;
  /** `Event.clubId` — spec §15 «klub» filtri. */
  clubId?: string;
  /** `Event.isOnline` — spec §15 «onlayn / üzbəüz» filtri. */
  isOnline?: boolean;
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
  // ⚠️ SÜZGƏCLİ say: yalnız yer tutan statuslar. Bax `EventItem.attendingCount`.
  _count: {
    select: { rsvps: { where: { status: { in: [...SEAT_HOLDING_RSVP_STATUSES] } } } },
  },
} satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

/**
 * Sətir → kart obyekti.
 *
 * ⚠️ Sahələr AÇIQ SİYAHI ilə köçürülür, `{ ...rest }` ilə YOX. Detal və
 * hesabat sorğuları `EVENT_SELECT`-i GENİŞLƏNDİRİB bu funksiyaya ötürür
 * (`agenda`, `createdById`, `media`…); spread işlədilsəydi həmin sütunlar
 * səssizcə client payload-una düşərdi. Açıq siyahı yeni sütunun sızmasının
 * qarşısını alır.
 */
function toEventItem(row: EventRow): EventItem {
  return {
    id: row.id,
    scope: row.scope,
    category: row.category,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    location: row.location,
    onlineUrl: row.onlineUrl,
    isOnline: row.isOnline,
    capacity: row.capacity,
    registrationDeadline: row.registrationDeadline,
    coverUrl: row.coverUrl,
    visibility: row.visibility,
    status: row.status,
    createdBy: row.createdBy,
    cohort: row.cohort,
    faculty: row.faculty,
    club: row.club,
    attendingCount: row._count.rsvps,
  };
}

/**
 * Siyahı və sayın ORTAQ şərti.
 *
 * ⚠️ Şərt TƏK yerdə qurulur: `listEvents` və `countEvents` ayrılsa səhifə
 * "24 tədbir" yazıb 12 kart göstərə bilərdi (Blok 8-in `achievementWhere`
 * dərsi ilə eyni).
 */
function eventWhere(
  viewer: Viewer,
  filters: EventFilters,
  now: Date,
): Prisma.EventWhereInput {
  return {
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
      ...(filters.facultyId ? [{ facultyId: filters.facultyId }] : []),
      ...(filters.clubId ? [{ clubId: filters.clubId }] : []),
      ...(filters.isOnline === undefined ? [] : [{ isOnline: filters.isOnline }]),
      ...(filters.upcoming === undefined
        ? []
        : [{ startsAt: filters.upcoming ? { gte: now } : { lt: now } }]),
    ],
  };
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
    where: eventWhere(viewer, filters, now),
    orderBy: filters.upcoming === false ? [{ startsAt: "desc" }] : [{ startsAt: "asc" }],
    take: filters.take ?? EVENT_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: EVENT_SELECT,
  });

  return rows.map(toEventItem);
}

/** `listEvents` ilə EYNİ şərtin sayı — səhifələmə üçün. */
export async function countEvents(
  viewer: Viewer,
  filters: EventFilters = {},
  now: Date = new Date(),
): Promise<number> {
  return prisma.event.count({ where: eventWhere(viewer, filters, now) });
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

// ---------------------------------------------------------------------------
// Filtr seçimləri (facet) — spec §15-in «fakültə» və «klub» süzgəcləri
// ---------------------------------------------------------------------------

export interface EventFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface EventFacets {
  faculty: EventFacetOption[];
  club: EventFacetOption[];
}

/**
 * Filtr panelinin açılan siyahıları.
 *
 * ⚠️ Siyahı BÜTÜN fakültə/klublardan deyil, VIEWER-İN GÖRDÜYÜ tədbirlərdən
 * qurulur. Səbəb kataloq filtrləri ilə eynidir (`listDirectoryFacets`): boş
 * seçim istifadəçini yalan yerə "burada tədbir var" fikrinə salır, üstəlik
 * say göstəricisi (12) görünməyən tədbirləri sayarsa məxfilik sızar.
 *
 * ⚠️ `when` / `format` süzgəcləri BURADA tətbiq olunmur — açılan siyahı
 * özünü boşaltmamalıdır ("keçmiş" seçəndə fakültə siyahısı itməsin).
 */
export async function listEventFacets(
  viewer: Viewer,
  filters: Pick<EventFilters, "cohortId" | "audienceCohortId"> = {},
  now: Date = new Date(),
): Promise<EventFacets> {
  const where = eventWhere(viewer, filters, now);

  const [facultyGroups, clubGroups] = await Promise.all([
    prisma.event.groupBy({
      by: ["facultyId"],
      where: { AND: [where, { facultyId: { not: null } }] },
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["clubId"],
      where: { AND: [where, { clubId: { not: null } }] },
      _count: { _all: true },
    }),
  ]);

  const facultyIds = facultyGroups.map((group) => group.facultyId).filter(isNonNull);
  const clubIds = clubGroups.map((group) => group.clubId).filter(isNonNull);

  const [faculties, clubs] = await Promise.all([
    facultyIds.length === 0
      ? []
      : prisma.faculty.findMany({
          where: { id: { in: facultyIds } },
          select: { id: true, name: true },
        }),
    clubIds.length === 0
      ? []
      : prisma.club.findMany({
          where: { id: { in: clubIds } },
          select: { id: true, name: true },
        }),
  ]);

  const collator = new Intl.Collator("az");

  const toOptions = (
    groups: Array<{ id: string | null; count: number }>,
    names: Map<string, string>,
  ): EventFacetOption[] =>
    groups
      .filter((group): group is { id: string; count: number } => group.id !== null)
      .map((group) => ({
        value: group.id,
        label: names.get(group.id) ?? group.id,
        count: group.count,
      }))
      .sort((a, b) => collator.compare(a.label, b.label));

  return {
    faculty: toOptions(
      facultyGroups.map((group) => ({ id: group.facultyId, count: group._count._all })),
      new Map(faculties.map((faculty) => [faculty.id, faculty.name])),
    ),
    club: toOptions(
      clubGroups.map((group) => ({ id: group.clubId, count: group._count._all })),
      new Map(clubs.map((club) => [club.id, club.name])),
    ),
  };
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

// ---------------------------------------------------------------------------
// Tədbir detalı — /events/[id]
// ---------------------------------------------------------------------------

/** İştirakçı kartı — `redactProfile`-dan KEÇMİŞ forma. */
export interface EventAttendee {
  id: string;
  firstName: string;
  lastName: string;
  /** İdarə olunan sahədir: gizlədilibsə `null` (baş hərflər göstərilir). */
  avatarUrl: string | null;
  status: string;
  checkedInAt: Date | null;
  registeredAt: Date | null;
}

export interface EventPhoto {
  id: string;
  url: string;
  thumbUrl: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export interface EventDetail extends EventItem {
  /** Markdown proqram (spec §14 sahə 8). */
  agenda: string | null;
  /** Əlaqələndirici şəxs (spec §14 sahə 9). */
  contact: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  /** Tədbirdən sonrakı yekun mətni. */
  summary: string | null;
  addedToTimeline: boolean;
  /** Foto albom (`MediaAsset.eventId`). */
  photos: EventPhoto[];
  /** Statuslara görə RSVP xülasəsi — tutum və diaqram üçün. */
  breakdown: RsvpBreakdown;
  /** Viewer-in öz RSVP-si; heç bir sətir yoxdursa `null`. */
  viewerRsvp: { status: string; rating: number | null; feedback: string | null } | null;
  /** Avatarları göstərilən iştirakçılar (yer tutanlar). */
  attendees: EventAttendee[];
  /** Viewer bu tədbiri idarə edə bilirmi (koordinator paneli keçidi). */
  viewerCanManage: boolean;
  /** Rəy sorğusunun ortalaması — `null` = hələ rəy yoxdur. */
  averageRating: number | null;
  /** Viewer rəy yaza bilərmi (tədbir bitib + yer tutmuş statusda). */
  viewerCanReview: boolean;
}

/** Detal səhifəsində göstərilən avatar sayı — qalanı "+N" kimi yığılır. */
export const ATTENDEE_AVATAR_LIMIT = 24;

/**
 * Tədbir detalı — bir sorğu paketi.
 *
 * ⚠️ İŞTİRAKÇI SİYAHISI GÖRÜNÜRLÜKDƏN ASILIDIR, tədbirin özündən deyil:
 * hər sətir `redactProfile`-dan keçir, yəni avatarını gizlədən adam kartda
 * baş hərfləri ilə görünür. Ad-soyad həmişə açıqdır (platformanın minimumu).
 *
 * ⚠️ `INVITED` və `DECLINED` sətirlər avatar zolağında GÖSTƏRİLMİR — "kim
 * dəvət olunub" və "kim rədd edib" məlumatı iştirakçı siyahısı deyil, idarəetmə
 * məlumatıdır və koordinator panelində qalır.
 */
export async function getEventDetail(
  viewer: Viewer,
  eventId: string,
  now: Date = new Date(),
): Promise<EventDetail | null> {
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
    select: {
      ...EVENT_SELECT,
      agenda: true,
      summary: true,
      addedToTimeline: true,
      createdById: true,
      cohortId: true,
      contact: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      media: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          url: true,
          thumbUrl: true,
          caption: true,
          width: true,
          height: true,
        },
      },
    },
  });

  if (!row) return null;

  const [statusGroups, ratings, viewerRsvp, attendeeRows, viewerCanManage] =
    await Promise.all([
      prisma.eventRSVP.groupBy({
        by: ["status"],
        where: { eventId },
        _count: { _all: true },
      }),
      prisma.eventRSVP.findMany({
        where: { eventId, rating: { not: null } },
        select: { rating: true },
      }),
      viewer.kind === "USER"
        ? prisma.eventRSVP.findUnique({
            where: { eventId_userId: { eventId, userId: viewer.userId } },
            select: { status: true, rating: true, feedback: true },
          })
        : null,
      prisma.eventRSVP.findMany({
        where: { eventId, status: { in: [...SEAT_HOLDING_RSVP_STATUSES] } },
        orderBy: [{ registeredAt: "asc" }, { id: "asc" }],
        take: ATTENDEE_AVATAR_LIMIT,
        select: {
          status: true,
          checkedInAt: true,
          registeredAt: true,
          user: { select: ATTENDEE_USER_SELECT },
        },
      }),
      canManageEvent(viewer, { createdById: row.createdById, cohortId: row.cohortId }),
    ]);

  const breakdown = summarizeRsvps(
    statusGroups.map((group) => ({ status: group.status, count: group._count._all })),
  );

  const finished = row.startsAt.getTime() < now.getTime();

  return {
    ...toEventItem(row),
    agenda: row.agenda,
    summary: row.summary,
    addedToTimeline: row.addedToTimeline,
    contact: row.contact,
    photos: row.media,
    breakdown,
    viewerRsvp,
    attendees: attendeeRows.map((rsvp) => toAttendee(rsvp, viewer)),
    viewerCanManage,
    averageRating: averageRating(
      ratings.map((row) => row.rating).filter(isNonNull),
    ),
    viewerCanReview: canLeaveFeedback(viewerRsvp?.status ?? null, finished),
  };
}

const ATTENDEE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  memberships: { select: { cohortId: true } },
  fieldVisibility: { select: { field: true, level: true } },
} satisfies Prisma.UserSelect;

type AttendeeUserRow = Prisma.UserGetPayload<{ select: typeof ATTENDEE_USER_SELECT }>;

/**
 * RSVP sətri → iştirakçı kartı.
 *
 * ⚠️ `avatarUrl` İDARƏ OLUNAN sahədir (`CONTROLLED_PROFILE_FIELDS`), ona görə
 * `redactProfile`-dan keçir. Ad-soyad keçmir: mühərrik onu həmişə buraxır.
 */
function toAttendee(
  rsvp: {
    status: string;
    checkedInAt: Date | null;
    registeredAt: Date | null;
    user: AttendeeUserRow;
  },
  viewer: Viewer,
): EventAttendee {
  const view: ProfileView = {
    id: rsvp.user.id,
    firstName: rsvp.user.firstName,
    lastName: rsvp.user.lastName,
    cohortIds: rsvp.user.memberships.map((membership) => membership.cohortId),
    avatarUrl: rsvp.user.avatarUrl,
  };

  const redacted = redactProfile(view, viewer, rsvp.user.fieldVisibility);

  return {
    id: rsvp.user.id,
    firstName: rsvp.user.firstName,
    lastName: rsvp.user.lastName,
    avatarUrl: (redacted.avatarUrl as string | null | undefined) ?? null,
    status: rsvp.status,
    checkedInAt: rsvp.checkedInAt,
    registeredAt: rsvp.registeredAt,
  };
}

// ---------------------------------------------------------------------------
// İdarəetmə icazəsi
// ---------------------------------------------------------------------------

/**
 * Viewer bu tədbiri idarə edə bilirmi?
 *
 * ÜÇ YOL:
 *   1. `UNIVERSITY_ADMIN` — universitet miqyaslı rol, hər tədbirdə keçir.
 *   2. Tədbiri YARADAN — öz elanının siyahısını görməlidir.
 *   3. Tədbirin sinfində `EVENT_MANAGER_ROLES` rollarından biri.
 *
 * ⚠️ (3) DB sorğusu tələb edir: `Viewer` yalnız `moderatedCohortIds` daşıyır
 * (CLASS_MODERATOR), tədbir rolları isə orada yoxdur — JWT-yə də yazılmır
 * (CLAUDE.md §11: dəyişkən məlumat token-də köhnəlir).
 *
 * ⚠️ `cohortId = null` (universitet / fakültə tədbiri) olduqda (3) şaxəsi
 * bağlıdır: "hansı sinif?" sualının cavabı yoxdur, yəni belə tədbiri yalnız
 * yaradıcı və admin idarə edir.
 */
export async function canManageEvent(
  viewer: Viewer,
  event: { createdById: string; cohortId: string | null },
): Promise<boolean> {
  if (viewer.kind !== "USER") return false;
  if (viewer.systemRole === SystemRole.UNIVERSITY_ADMIN) return true;
  if (viewer.userId === event.createdById) return true;
  if (event.cohortId === null) return false;

  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: viewer.userId, cohortId: event.cohortId } },
    select: { role: true },
  });

  return (
    membership !== null &&
    (EVENT_MANAGER_ROLES as readonly string[]).includes(membership.role)
  );
}

// ---------------------------------------------------------------------------
// Nəticə tipləri — action qatı bunları azərbaycanca mesaja çevirir
// ---------------------------------------------------------------------------

export type EventMutationFailure =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_A_MEMBER"
  | "COHORT_REQUIRED"
  | "FACULTY_REQUIRED"
  | "INVALID_DATES"
  | RsvpRejection;

export type EventMutationResult<T = null> =
  | { ok: true; value: T }
  | { ok: false; reason: EventMutationFailure };

// ---------------------------------------------------------------------------
// createEvent — spec §14-ün 10 sahəsi + bizim 3 əlavəmiz
// ---------------------------------------------------------------------------

export interface CreateEventData {
  /** ⚠️ Müştəridən gəlir, amma üzvlük + rol DB-dən yenidən yoxlanılır. */
  cohortId: string;
  /** Təşkilatçı səviyyəsi. `FACULTY` olduqda `facultyId` MƏCBURİDİR. */
  scope: EventScopeType;
  category: EventCategory;
  facultyId: string | null;
  clubId: string | null;

  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  onlineUrl: string | null;
  isOnline: boolean;
  capacity: number | null;
  registrationDeadline: Date | null;
  agenda: string | null;
  contactId: string | null;
  visibility: VisibilityType;
  coverUrl: string | null;
}

/**
 * Tədbir yaradır (spec §14).
 *
 * TƏK TRANSAKSİYA:
 *   1. `Event` (status: `PUBLISHED`)
 *   2. `EventRSVP` — sinif üzvlərinə `INVITED` sətirləri (dəvət mərhələsi)
 *   3. `Notification` — eyni adamlara `EVENT_INVITE`
 *   4. `AuditLog` — kim, nə vaxt, hansı səviyyədə elan etdi
 *
 * ⚠️ (2) və (3) `visibility = PRIVATE` olduqda BURAXILIR: tədbiri görməyən
 * adama "sizi dəvət etdik" bildirişi göndərmək özü sızmadır (eyni qayda
 * `buildPostNotifications`-dadır).
 *
 * ⚠️ `Event.cohortId` sxemdə nullable-dır, amma BURADA həmişə doldurulur:
 * tədbir sinif səhifəsindən yaradılır və rol yoxlaması cohort tələb edir.
 * `cohortId = null` tədbirlər seed-dən / admin panelindən gəlir.
 */
export async function createEvent(
  viewer: UserViewer,
  data: CreateEventData,
): Promise<EventMutationResult<{ eventId: string }>> {
  if (data.scope === EventScope.FACULTY && !data.facultyId) {
    return { ok: false, reason: "FACULTY_REQUIRED" };
  }
  if (data.endsAt !== null && data.endsAt.getTime() <= data.startsAt.getTime()) {
    return { ok: false, reason: "INVALID_DATES" };
  }

  // Rol qapısı — səhifədəki `requireCohortRole` ilə İKİNCİ qat.
  // Server action birbaşa çağırıla bilər, ona görə səhifə qapısı tək sayılmır.
  const allowed = await canManageEvent(viewer, {
    createdById: viewer.userId,
    cohortId: data.cohortId,
  });
  // `canManageEvent` yaradıcını avtomatik buraxır (`createdById === userId`),
  // yəni burada rolu AYRICA yoxlamaq lazımdır — əks halda hər üzv özünü
  // "yaradıcı" elan edib tədbir aça bilərdi.
  const hasRole = await hasEventManagerRole(viewer, data.cohortId);
  if (!allowed || !hasRole) return { ok: false, reason: "FORBIDDEN" };

  const eventId = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        cohortId: data.cohortId,
        clubId: data.clubId,
        facultyId: data.scope === EventScope.FACULTY ? data.facultyId : null,
        scope: data.scope,
        category: data.category,
        title: data.title,
        description: data.description,
        agenda: data.agenda,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        location: data.location,
        onlineUrl: data.onlineUrl,
        isOnline: data.isOnline,
        capacity: data.capacity,
        registrationDeadline: data.registrationDeadline,
        coverUrl: data.coverUrl,
        createdById: viewer.userId,
        contactId: data.contactId,
        visibility: data.visibility,
        status: EventStatus.PUBLISHED,
      },
      select: { id: true, cohort: { select: { slug: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorId: viewer.userId,
        action: AuditAction.CREATE,
        entityType: NotificationEntityType.EVENT,
        entityId: event.id,
        metadata: JSON.stringify({
          operation: "createEvent",
          cohortId: data.cohortId,
          scope: data.scope,
          category: data.category,
          visibility: data.visibility,
        }),
      },
    });

    if (data.visibility !== Visibility.PRIVATE) {
      const members = await tx.cohortMembership.findMany({
        where: { cohortId: data.cohortId, userId: { not: viewer.userId } },
        select: { userId: true },
      });

      if (members.length > 0) {
        await tx.eventRSVP.createMany({
          data: members.map((member) => ({
            eventId: event.id,
            userId: member.userId,
            status: RsvpStatus.INVITED,
          })),
        });

        await tx.notification.createMany({
          data: members.map((member) => ({
            recipientId: member.userId,
            actorId: viewer.userId,
            type: NotificationType.EVENT_INVITE,
            entityType: NotificationEntityType.EVENT,
            entityId: event.id,
            title: "Yeni tədbir elan olundu",
            body: data.title,
            url: `/events/${event.id}`,
          })),
        });
      }
    }

    return event.id;
  });

  return { ok: true, value: { eventId } };
}

/** `EVENT_MANAGER_ROLES` yoxlaması — admin istisnadır. */
async function hasEventManagerRole(
  viewer: UserViewer,
  cohortId: string,
): Promise<boolean> {
  if (viewer.systemRole === SystemRole.UNIVERSITY_ADMIN) return true;

  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: viewer.userId, cohortId } },
    select: { role: true },
  });

  return (
    membership !== null &&
    (EVENT_MANAGER_ROLES as readonly string[]).includes(membership.role)
  );
}

// ---------------------------------------------------------------------------
// RSVP — Qəbul et / Rədd et / Qeydiyyatdan keç
// ---------------------------------------------------------------------------

export interface RsvpOutcome {
  status: RsvpStatusType;
  /** Tutum dolu olduğu üçün gözləmə siyahısına düşdümü? */
  waitlisted: boolean;
}

/**
 * Viewer-in RSVP-sini yazır.
 *
 * ⚠️ GÖRÜNÜRLÜK QAPISI BİRİNCİDİR: `getEvent` ilə tədbir gətirilir, yəni
 * görünməyən tədbirə RSVP vermək mümkün deyil (id-ni təxmin etmək kifayət
 * etmir). Bu, `NOT_FOUND` verir — "yoxdur" və "icazə yoxdur" ayırd edilmir.
 *
 * ⚠️ TUTUM SAYI VIEWER-İN ÖZ SƏTRİ ÇIXILMIŞ hesablanır: artıq qeydiyyatda
 * olan adam düyməni ikinci dəfə basanda özünü gözləmə siyahısına salmamalıdır
 * (bax `lib/rsvp.ts` → `resolveRsvpDecision`).
 *
 * ⚠️ `upsert` işlədilir — `@@unique([eventId, userId])`. `INVITED` sətri
 * seed-dən və ya `createEvent`-dən onsuz da mövcud ola bilər.
 */
export async function rsvpToEvent(
  viewer: UserViewer,
  eventId: string,
  intent: RsvpIntent,
  now: Date = new Date(),
): Promise<EventMutationResult<RsvpOutcome>> {
  const event = await prisma.event.findFirst({
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
    select: {
      id: true,
      status: true,
      capacity: true,
      registrationDeadline: true,
      startsAt: true,
    },
  });

  if (!event) return { ok: false, reason: "NOT_FOUND" };

  const [seatsTakenByOthers, current] = await Promise.all([
    prisma.eventRSVP.count({
      where: {
        eventId,
        userId: { not: viewer.userId },
        status: { in: [...SEAT_HOLDING_RSVP_STATUSES] },
      },
    }),
    prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId: viewer.userId } },
      select: { status: true, registeredAt: true },
    }),
  ]);

  const decision = resolveRsvpDecision(intent, {
    eventStatus: event.status,
    capacity: event.capacity,
    seatsTaken: seatsTakenByOthers,
    registrationDeadline: event.registrationDeadline,
    startsAt: event.startsAt,
    now,
  });

  if (!decision.ok) return { ok: false, reason: decision.reason };

  // `registeredAt` yalnız QEYDİYYAT anında yazılır və sonra saxlanılır —
  // gözləmə siyahısındakı sıralama bu sütuna görə qurulur.
  const registeredAt =
    decision.status === RsvpStatus.REGISTERED || decision.status === RsvpStatus.WAITLISTED
      ? now
      : undefined;

  await prisma.eventRSVP.upsert({
    where: { eventId_userId: { eventId, userId: viewer.userId } },
    create: {
      eventId,
      userId: viewer.userId,
      status: decision.status,
      registeredAt: registeredAt ?? null,
    },
    update: {
      status: decision.status,
      ...(registeredAt && current?.registeredAt == null ? { registeredAt } : {}),
    },
  });

  return { ok: true, value: { status: decision.status, waitlisted: decision.waitlisted } };
}

// ---------------------------------------------------------------------------
// Rəy sorğusu — 1-5 ulduz + mətn (spec §14)
// ---------------------------------------------------------------------------

/**
 * Rəy yazır.
 *
 * ⚠️ Rəy YENİ RSVP sətri YARATMIR: tədbirdə olmayan adam onu
 * qiymətləndirməməlidir. Sətir yoxdursa `FORBIDDEN`.
 */
export async function submitEventFeedback(
  viewer: UserViewer,
  eventId: string,
  rating: number,
  feedback: string | null,
  now: Date = new Date(),
): Promise<EventMutationResult> {
  const event = await getEvent(viewer, eventId);
  if (!event) return { ok: false, reason: "NOT_FOUND" };

  const rsvp = await prisma.eventRSVP.findUnique({
    where: { eventId_userId: { eventId, userId: viewer.userId } },
    select: { status: true },
  });

  const finished = event.startsAt.getTime() < now.getTime();
  if (!canLeaveFeedback(rsvp?.status ?? null, finished)) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  await prisma.eventRSVP.update({
    where: { eventId_userId: { eventId, userId: viewer.userId } },
    data: { rating, feedback },
  });

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Foto albom — MediaAsset(eventId)
// ---------------------------------------------------------------------------

export interface EventPhotoInput {
  url: string;
  thumbUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  width: number;
  height: number;
  caption: string | null;
}

/**
 * Tədbir albomuna şəkil əlavə edir.
 *
 * İcazə: tədbiri İDARƏ EDƏNLƏR. Albomu hər iştirakçıya açmaq cazibədardır,
 * amma o zaman moderasiya növbəsi lazım olardı (şikayət axını hələ yalnız
 * `Post` üçün qurulub) — v1-də albom koordinatorun məsuliyyətindədir.
 *
 * ⚠️ `order` massivin ARDICILLIĞINDAN + mövcud şəkil sayından hesablanır;
 * müştərinin göndərdiyi sıraya güvənilmir (lentdəki `toMediaData` ilə eyni).
 */
export async function addEventPhotos(
  viewer: UserViewer,
  eventId: string,
  photos: EventPhotoInput[],
): Promise<EventMutationResult<{ added: number }>> {
  const event = await loadManageableEvent(viewer, eventId);
  if (!event.ok) return event;
  if (photos.length === 0) return { ok: true, value: { added: 0 } };

  const existing = await prisma.mediaAsset.count({ where: { eventId } });

  await prisma.mediaAsset.createMany({
    data: photos.map((photo, index) => ({
      eventId,
      url: photo.url,
      thumbUrl: photo.thumbUrl,
      type: MediaType.IMAGE,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes,
      width: photo.width,
      height: photo.height,
      caption: photo.caption,
      order: existing + index,
    })),
  });

  return { ok: true, value: { added: photos.length } };
}

export async function removeEventPhoto(
  viewer: UserViewer,
  eventId: string,
  mediaId: string,
): Promise<EventMutationResult> {
  const event = await loadManageableEvent(viewer, eventId);
  if (!event.ok) return event;

  // `eventId` şərti QƏSDƏNDİR: yalnız id bilməklə başqa tədbirin (və ya
  // paylaşımın) şəklini silmək mümkün olmasın.
  await prisma.mediaAsset.deleteMany({ where: { id: mediaId, eventId } });

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// «Class Timeline-a əlavə et» (spec §14)
// ---------------------------------------------------------------------------

/**
 * Keçmiş tədbiri sinif xronologiyasına yazır.
 *
 * TƏK TRANSAKSİYA: `TimelineEntry` upsert + `Event.addedToTimeline` + AuditLog.
 *
 * ⚠️ `visibility` TƏDBİRDƏN KOPYALANIR (`buildEventTimelineEntry` →
 * `derivedVisibility` yalnız daraldır). Törəmə qeyd mənbədən açıq ola bilməz.
 *
 * ⚠️ `TimelineEntry.eventId` `@unique`-dir → `create` DEYİL, `upsert`
 * (düymə iki dəfə basıla bilər; T11-in analoqu).
 *
 * ⚠️ `TimelineEntry.cohortId` NULLABLE DEYİL, `Event.cohortId` isə nullable —
 * universitet səviyyəli tədbir hansı sinfin xronologiyasına düşəcəyini bilmir,
 * ona görə `COHORT_REQUIRED` qaytarılır.
 */
export async function addEventToTimeline(
  viewer: UserViewer,
  eventId: string,
): Promise<EventMutationResult<{ cohortSlug: string }>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      cohortId: true,
      title: true,
      description: true,
      summary: true,
      location: true,
      category: true,
      startsAt: true,
      visibility: true,
      cohort: { select: { slug: true } },
    },
  });

  if (!event) return { ok: false, reason: "NOT_FOUND" };
  if (event.cohortId === null || !event.cohort) {
    return { ok: false, reason: "COHORT_REQUIRED" };
  }

  const entry = buildEventTimelineEntry({
    eventId: event.id,
    cohortId: event.cohortId,
    title: event.title,
    description: event.description,
    summary: event.summary,
    location: event.location,
    category: event.category,
    startsAt: event.startsAt,
    visibility: event.visibility as VisibilityType,
  });

  await prisma.$transaction(async (tx) => {
    await tx.timelineEntry.upsert({
      where: { eventId: event.id },
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

    await tx.event.update({
      where: { id: event.id },
      data: { addedToTimeline: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: viewer.userId,
        action: AuditAction.UPDATE,
        entityType: NotificationEntityType.EVENT,
        entityId: event.id,
        metadata: JSON.stringify({
          operation: "addEventToTimeline",
          cohortId: event.cohortId,
          visibility: entry.visibility,
        }),
      },
    });
  });

  return { ok: true, value: { cohortSlug: event.cohort.slug } };
}

/**
 * Xronologiyadan çıxarır.
 *
 * ⚠️ `Event` SİLİNMİR, yalnız bayraq düşür — `onDelete: Cascade` işə düşmür,
 * ona görə `TimelineEntry` AÇIQ şəkildə silinir (Blok 8-in TƏLƏ C dərsi).
 */
export async function removeEventFromTimeline(
  viewer: UserViewer,
  eventId: string,
): Promise<EventMutationResult> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  await prisma.$transaction([
    prisma.timelineEntry.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { addedToTimeline: false } }),
  ]);

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Koordinator paneli — /events/[id]/manage
// ---------------------------------------------------------------------------

/**
 * İdarəetmə funksiyalarının ORTAQ qapısı.
 *
 * ⚠️ Burada GÖRÜNÜRLÜK filtri YOXDUR (`findUnique`, `visibleWithStatus`
 * deyil): koordinator öz `DRAFT` və `CANCELLED` tədbirini də idarə etməlidir.
 * Qapı ROL-adır — bax fayl başlığındakı «iki icazə modeli» qeydi.
 */
async function loadManageableEvent(
  viewer: UserViewer,
  eventId: string,
): Promise<EventMutationResult<{ cohortId: string | null }>> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, createdById: true, cohortId: true },
  });

  if (!event) return { ok: false, reason: "NOT_FOUND" };
  if (!(await canManageEvent(viewer, event))) return { ok: false, reason: "FORBIDDEN" };

  return { ok: true, value: { cohortId: event.cohortId } };
}

/** Koordinator cədvəlinin sətri — burada REDAKSİYA YOXDUR (aşağıdakı qeyd). */
export interface AttendeeRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  /** Cohort daxilindəki rol — struktur məlumat, məxfilikdən asılı deyil. */
  cohortRole: string | null;
  status: string;
  registeredAt: Date | null;
  checkedInAt: Date | null;
  rating: number | null;
  feedback: string | null;
}

export interface AttendeeTable {
  rows: AttendeeRow[];
  total: number;
  breakdown: RsvpBreakdown;
}

export interface AttendeeQuery {
  status?: RsvpStatusType;
  /** Ad / soyad / e-poçt üzrə axtarış (KUDS §14). */
  search?: string;
  take?: number;
  skip?: number;
}

export const ATTENDEE_PAGE_SIZE = 25;

/**
 * İştirakçı cədvəli — YALNIZ idarə edənlər üçün (KUDS §14: sort, filter,
 * pagination, search, export, responsive).
 *
 * 🔴 NİYƏ BURADA `redactProfile` YOXDUR: bu, adi oxu yolu deyil, İDARƏETMƏ
 * axınıdır — eynilə `listModerationQueue` kimi (Blok 8, TƏLƏ A). Koordinator
 * qeydiyyatı təsdiqləmək və check-in etmək üçün iştirakçının e-poçtunu
 * görməlidir; profil məxfiliyi «kim mənim nömrəmi görsün» sualına cavab verir,
 * «tədbirə yazılan adam kimdir» sualına yox.
 *
 * ⚠️ Buna görə funksiya YALNIZ rol qapısından keçəndən sonra çağırılır və
 * çıxışı heç bir ictimai səhifədə İŞLƏDİLMİR — yalnız `/events/[id]/manage`
 * və CSV ixracı.
 */
export async function listEventAttendees(
  viewer: UserViewer,
  eventId: string,
  query: AttendeeQuery = {},
): Promise<EventMutationResult<AttendeeTable>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const cohortId = loaded.value.cohortId;

  // ⚠️ `tokenizedContains` DÜZ sahə adları qurur (`{ field: { contains } }`),
  // ona görə şərt `User` üzərində tikilib `user:` altına yerləşdirilir —
  // `"user.firstName"` kimi nöqtəli ad Prisma-da işləmir.
  const userSearch =
    query.search === undefined || query.search.trim() === ""
      ? null
      : tokenizedContains<Prisma.UserWhereInput>(
          ["firstName", "lastName", "email"],
          query.search,
        );

  const where: Prisma.EventRSVPWhereInput = {
    AND: [
      { eventId },
      ...(query.status ? [{ status: query.status }] : []),
      ...(userSearch ? [{ user: userSearch }] : []),
    ],
  };

  const [rows, total, statusGroups] = await Promise.all([
    prisma.eventRSVP.findMany({
      where,
      // Sıralama: əvvəlcə status (qeydiyyatlar yuxarıda), sonra qeydiyyat vaxtı.
      orderBy: [{ status: "asc" }, { registeredAt: "asc" }, { id: "asc" }],
      take: query.take ?? ATTENDEE_PAGE_SIZE,
      skip: query.skip ?? 0,
      select: {
        status: true,
        registeredAt: true,
        checkedInAt: true,
        rating: true,
        feedback: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            // Universitet səviyyəli tədbirdə (`cohortId = null`) "sinifdəki
            // rol" sualının cavabı yoxdur → uyğun gəlməyən şərt (eyni nümunə
            // `cohort.service.ts` → `getCohortHeader`).
            memberships: {
              where: { cohortId: { in: cohortId === null ? [] : [cohortId] } },
              select: { role: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.eventRSVP.count({ where }),
    prisma.eventRSVP.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),
  ]);

  return {
    ok: true,
    value: {
      rows: rows.map((row) => ({
        userId: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
        avatarUrl: row.user.avatarUrl,
        cohortRole: row.user.memberships[0]?.role ?? null,
        status: row.status,
        registeredAt: row.registeredAt,
        checkedInAt: row.checkedInAt,
        rating: row.rating,
        feedback: row.feedback,
      })),
      total,
      breakdown: summarizeRsvps(
        statusGroups.map((group) => ({ status: group.status, count: group._count._all })),
      ),
    },
  };
}

/** CSV ixracı üçün — səhifələnməmiş TAM siyahı (limit ilə). */
export const ATTENDEE_EXPORT_LIMIT = 2000;

export async function exportEventAttendees(
  viewer: UserViewer,
  eventId: string,
): Promise<EventMutationResult<{ title: string; rows: AttendeeRow[] }>> {
  const table = await listEventAttendees(viewer, eventId, { take: ATTENDEE_EXPORT_LIMIT });
  if (!table.ok) return table;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true },
  });

  return {
    ok: true,
    value: { title: event?.title ?? "tedbir", rows: table.value.rows },
  };
}

/**
 * Qeydiyyatın təsdiqi — gözləmə siyahısından irəli keçirmə.
 *
 * ⚠️ TUTUM YENİDƏN YOXLANILIR: koordinator gözləmə siyahısındakı beş nəfəri
 * ardıcıl təsdiqləsə tutum aşılmalı deyil. Yer yoxdursa `EVENT_CLOSED` yox,
 * açıq şəkildə `FORBIDDEN` qaytarılır və UI "tutum doludur" deyir.
 */
export async function confirmRegistration(
  viewer: UserViewer,
  eventId: string,
  userId: string,
  now: Date = new Date(),
): Promise<EventMutationResult<{ status: RsvpStatusType }>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { capacity: true, title: true },
  });
  if (!event) return { ok: false, reason: "NOT_FOUND" };

  const seatsTaken = await prisma.eventRSVP.count({
    where: {
      eventId,
      userId: { not: userId },
      status: { in: [...SEAT_HOLDING_RSVP_STATUSES] },
    },
  });

  if (event.capacity !== null && seatsTaken >= event.capacity) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  await prisma.$transaction([
    prisma.eventRSVP.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status: RsvpStatus.REGISTERED, registeredAt: now },
    }),
    prisma.notification.create({
      data: {
        recipientId: userId,
        actorId: viewer.userId,
        type: NotificationType.EVENT_REMINDER,
        entityType: NotificationEntityType.EVENT,
        entityId: eventId,
        title: "Qeydiyyatınız təsdiqləndi",
        body: event.title,
        url: `/events/${eventId}`,
      },
    }),
  ]);

  return { ok: true, value: { status: RsvpStatus.REGISTERED } };
}

/**
 * Check-in / gəlmədi işarəsi.
 *
 * `attended = true` → `ATTENDED` + `checkedInAt`.
 * `attended = false` → `NO_SHOW`, `checkedInAt` təmizlənir (səhv basılan
 * düymə geri qaytarıla bilməlidir).
 */
export async function checkInAttendee(
  viewer: UserViewer,
  eventId: string,
  userId: string,
  attended: boolean,
  now: Date = new Date(),
): Promise<EventMutationResult<{ status: RsvpStatusType }>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const status = attended ? RsvpStatus.ATTENDED : RsvpStatus.NO_SHOW;

  await prisma.eventRSVP.update({
    where: { eventId_userId: { eventId, userId } },
    data: { status, checkedInAt: attended ? now : null },
  });

  return { ok: true, value: { status } };
}

/**
 * Toplu bildiriş — seçilmiş statuslardakı iştirakçılara.
 *
 * ⚠️ Alıcılar RSVP sətirlərindən gəlir, cohort üzvlüyündən YOX: koordinator
 * "qeydiyyatdan keçənlərə" yazanda sinfin qalan hissəsi mesaj almamalıdır.
 */
export async function notifyAttendees(
  viewer: UserViewer,
  eventId: string,
  statuses: RsvpStatusType[],
  title: string,
  body: string,
): Promise<EventMutationResult<{ sent: number }>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const recipients = await prisma.eventRSVP.findMany({
    where: { eventId, status: { in: statuses }, userId: { not: viewer.userId } },
    select: { userId: true },
  });

  if (recipients.length === 0) return { ok: true, value: { sent: 0 } };

  await prisma.$transaction([
    prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        recipientId: recipient.userId,
        actorId: viewer.userId,
        type: NotificationType.EVENT_REMINDER,
        entityType: NotificationEntityType.EVENT,
        entityId: eventId,
        title,
        body,
        url: `/events/${eventId}`,
      })),
    }),
    prisma.auditLog.create({
      data: {
        actorId: viewer.userId,
        action: AuditAction.UPDATE,
        entityType: NotificationEntityType.EVENT,
        entityId: eventId,
        metadata: JSON.stringify({
          operation: "notifyAttendees",
          statuses,
          recipients: recipients.length,
        }),
      },
    }),
  ]);

  return { ok: true, value: { sent: recipients.length } };
}

/**
 * Tədbiri tamamlanmış elan edir və yekun mətnini yazır.
 *
 * `status = COMPLETED` ictimai siyahıda qalır (`PUBLIC_EVENT_STATUSES`),
 * yəni keçmiş tədbir yoxa çıxmır — arxivə düşür.
 */
export async function completeEvent(
  viewer: UserViewer,
  eventId: string,
  summary: string | null,
): Promise<EventMutationResult> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const attendeeCount = await prisma.eventRSVP.count({
    where: { eventId, status: { in: [...ATTENDED_RSVP_STATUSES] } },
  });

  await prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.COMPLETED, summary, attendeeCount },
  });

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Yekun hesabat — /events/[id]/report (çap üçün)
// ---------------------------------------------------------------------------

export interface EventReport {
  event: EventItem;
  agenda: string | null;
  summary: string | null;
  breakdown: RsvpBreakdown;
  attendanceRate: number | null;
  averageRating: number | null;
  ratingCount: number;
  /** Mətnli rəylər — hesabatın son bölməsi. */
  comments: Array<{ rating: number | null; feedback: string }>;
  photoCount: number;
  addedToTimeline: boolean;
}

/**
 * Yekun hesabat məlumatı.
 *
 * ⚠️ RƏYLƏR ANONİMDİR — müəllif adı QAYTARILMIR. Rəy sorğusu düzgün işləsin
 * deyə iştirakçı «koordinator kimin nə yazdığını görəcək» qorxusu ilə
 * yazmamalıdır. Ad `EventRSVP` sətrində var, amma hesabat onu OXUMUR.
 */
export async function getEventReport(
  viewer: UserViewer,
  eventId: string,
): Promise<EventMutationResult<EventReport>> {
  const loaded = await loadManageableEvent(viewer, eventId);
  if (!loaded.ok) return loaded;

  const row = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      ...EVENT_SELECT,
      agenda: true,
      summary: true,
      addedToTimeline: true,
      _count: { select: { rsvps: true, media: true } },
    },
  });

  if (!row) return { ok: false, reason: "NOT_FOUND" };

  const [statusGroups, feedbackRows] = await Promise.all([
    prisma.eventRSVP.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { _all: true },
    }),
    prisma.eventRSVP.findMany({
      where: { eventId, OR: [{ rating: { not: null } }, { feedback: { not: null } }] },
      orderBy: [{ rating: "desc" }, { id: "asc" }],
      select: { rating: true, feedback: true },
    }),
  ]);

  const breakdown = summarizeRsvps(
    statusGroups.map((group) => ({ status: group.status, count: group._count._all })),
  );

  const ratings = feedbackRows.map((row) => row.rating).filter(isNonNull);

  return {
    ok: true,
    value: {
      event: toEventItem({ ...row, _count: { rsvps: row._count.rsvps } }),
      agenda: row.agenda,
      summary: row.summary,
      breakdown,
      attendanceRate:
        breakdown.seatsTaken === 0
          ? null
          : Math.round((breakdown.attended / breakdown.seatsTaken) * 100),
      averageRating: averageRating(ratings),
      ratingCount: ratings.length,
      comments: feedbackRows
        .filter((row) => row.feedback !== null && row.feedback.trim() !== "")
        .map((row) => ({ rating: row.rating, feedback: row.feedback as string })),
      photoCount: row._count.media,
      addedToTimeline: row.addedToTimeline,
    },
  };
}

// ---------------------------------------------------------------------------
// .ics — /api/events/[id]/ics
// ---------------------------------------------------------------------------

/**
 * Təqvim faylı üçün minimal tədbir məlumatı.
 *
 * ⚠️ Görünürlük eyni köməkçidən keçir: `.ics` ünvanı auth arxasındadır, amma
 * route handler-in ÖZ yoxlaması olmalıdır — id-ni bilən istifadəçi görmədiyi
 * tədbirin adını və yerini fayl kimi endirə bilməməlidir.
 */
export async function getEventForCalendar(
  viewer: Viewer,
  eventId: string,
): Promise<{
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  onlineUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
} | null> {
  return prisma.event.findFirst({
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
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      onlineUrl: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Əlaqələndirici şəxs seçimi — tədbir formasının 9-cu sahəsi
// ---------------------------------------------------------------------------

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Əlaqələndirici namizədləri — YALNIZ həmin sinfin üzvləri.
 *
 * ⚠️ Bu, üzv siyahısıdır və sinif üzvünə açıqdır (`cohort.service.ts`-dəki
 * `canSeeRoster` ilə eyni qayda). Funksiya onsuz da yalnız tədbir yaratma
 * formasında çağırılır, yəni çağıran artıq `EVENT_MANAGER_ROLES` rolundadır.
 */
export async function listContactOptions(
  viewer: UserViewer,
  cohortId: string,
): Promise<ContactOption[]> {
  if (!viewer.cohortIds.includes(cohortId) && viewer.systemRole !== SystemRole.UNIVERSITY_ADMIN) {
    return [];
  }

  const members = await prisma.cohortMembership.findMany({
    where: { cohortId },
    orderBy: [{ user: { firstName: "asc" } }, { userId: "asc" }],
    select: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  return members.map((member) => member.user);
}
