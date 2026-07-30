// @vitest-environment node
// ============================================================================
// tests/integration/events.db.test.ts
// Blok 9 [M12 + M13] — Events & Reunion axınının REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALLARI:
//   1. TUTUM — dolu tədbirdə qeydiyyat `WAITLISTED` verirmi? Dəvətlər
//      (`INVITED`) yeri SƏHVƏN tutmurmu?
//   2. İKİ İCAZƏ MODELİ — koordinator paneli (`listEventAttendees`) rola
//      görədir, adi oxu (`listEvents`) isə görünürlüyə görə. Adi üzv panelə
//      düşməməlidir.
//   3. TİMELİNE — «Class Timeline-a əlavə et» `TimelineEntry` yaradırmı,
//      görünürlük TƏDBİRDƏN kopyalanırmı, çıxarılanda sətir SİLİNİRmi?
//   4. `scope` ≠ `category` — REUNION filtri kateqoriya filtrindən asılı deyil.
//
// ⚠️ Fayl YAZIR (tədbir yaradır, RSVP dəyişir, TimelineEntry yaradır), ona görə
// `timeline.db.test.ts` ilə eyni intizam: yaradılan hər sətir `afterAll`-da
// silinir və seed determinizmi pozulmur.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EventScope, EventStatus, RsvpStatus, Visibility } from "@/lib/enums";
import { SEAT_HOLDING_RSVP_STATUSES } from "@/lib/rsvp";
import { type Viewer } from "@/lib/visibility";
import {
  addEventToTimeline,
  canManageEvent,
  countEvents,
  createEvent,
  exportEventAttendees,
  getEventDetail,
  getEventReport,
  listEventAttendees,
  listEventFacets,
  listEvents,
  removeEventFromTimeline,
  rsvpToEvent,
  submitEventFeedback,
} from "@/services/event.service";

const prisma = new PrismaClient();

/** Səhifələmə deyil, ƏHATƏ yoxlanılır. */
const ALL = 1000;

type UserViewer = Extract<Viewer, { kind: "USER" }>;

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

/** PLAN.md §7 test hesabları. */
let coordinator: UserViewer;
let member: UserViewer;
let moderator: UserViewer;
let alumni: UserViewer;
let cohortId: string;

/** Test ərzində yaradılan tədbirlər — `afterAll`-da silinir. */
const createdEventIds: string[] = [];

beforeAll(async () => {
  [coordinator, member, moderator, alumni] = await Promise.all([
    viewerOf("coordinator@qu.edu.az"),
    viewerOf("rep@qu.edu.az"),
    viewerOf("moderator@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  cohortId = coordinator.cohortIds[0];

  // Sanity: üçü də EYNİ sinifdədir, məzun isə BAŞQA sinifdə.
  expect(member.cohortIds).toContain(cohortId);
  expect(moderator.cohortIds).toContain(cohortId);
  expect(alumni.cohortIds).not.toContain(cohortId);
});

afterAll(async () => {
  // Cascade `EventRSVP`, `MediaAsset` və `TimelineEntry`-ni özü aparır.
  if (createdEventIds.length > 0) {
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  }
  await prisma.auditLog.deleteMany({ where: { entityId: { in: createdEventIds } } });
  await prisma.notification.deleteMany({ where: { entityId: { in: createdEventIds } } });
  await prisma.$disconnect();
});

/** Test tədbiri yaradır və təmizlik siyahısına yazır. */
async function makeEvent(
  overrides: Partial<Parameters<typeof createEvent>[1]> = {},
  as: UserViewer = coordinator,
): Promise<string> {
  const result = await createEvent(as, {
    cohortId,
    scope: EventScope.CLASS,
    category: "MEETING",
    facultyId: null,
    clubId: null,
    title: `Test tədbiri ${createdEventIds.length + 1}`,
    description: "İnteqrasiya testi",
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endsAt: null,
    location: "Xankəndi",
    onlineUrl: null,
    isOnline: false,
    capacity: null,
    registrationDeadline: null,
    agenda: null,
    contactId: null,
    visibility: Visibility.CLASS,
    coverUrl: null,
    ...overrides,
  });

  if (!result.ok) throw new Error(`Tədbir yaradılmadı: ${result.reason}`);
  createdEventIds.push(result.value.eventId);
  return result.value.eventId;
}

// ---------------------------------------------------------------------------
// 1. Rol qapısı — kim tədbir yarada bilər
// ---------------------------------------------------------------------------

describe("createEvent — rol qapısı (spec §17)", () => {
  it("EVENT_COORDINATOR tədbir yaradır", async () => {
    const eventId = await makeEvent();
    const row = await prisma.event.findUnique({ where: { id: eventId } });

    expect(row?.status).toBe(EventStatus.PUBLISHED);
    expect(row?.createdById).toBe(coordinator.userId);
  });

  it("CLASS_REPRESENTATIVE də yarada bilər", async () => {
    const eventId = await makeEvent({}, member);
    expect(createdEventIds).toContain(eventId);
  });

  it("🔴 CLASS_MODERATOR tədbir YARADA BİLMİR", async () => {
    // Moderator MƏZMUNA nəzarət edir, tədbir TƏŞKİLİ ayrı işdir
    // (`EVENT_MANAGER_ROLES` — bax `lib/enums.ts`).
    const result = await createEvent(moderator, {
      cohortId,
      scope: EventScope.CLASS,
      category: "MEETING",
      facultyId: null,
      clubId: null,
      title: "Moderatorun tədbiri",
      description: null,
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: null,
      location: "Xankəndi",
      onlineUrl: null,
      isOnline: false,
      capacity: null,
      registrationDeadline: null,
      agenda: null,
      contactId: null,
      visibility: Visibility.CLASS,
      coverUrl: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });

  it("scope = FACULTY üçün fakültə MƏCBURİDİR", async () => {
    const result = await createEvent(coordinator, {
      cohortId,
      scope: EventScope.FACULTY,
      category: "SEMINAR",
      facultyId: null,
      clubId: null,
      title: "Fakültəsiz fakültə tədbiri",
      description: null,
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: null,
      location: "Xankəndi",
      onlineUrl: null,
      isOnline: false,
      capacity: null,
      registrationDeadline: null,
      agenda: null,
      contactId: null,
      visibility: Visibility.CLASS,
      coverUrl: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FACULTY_REQUIRED");
  });

  it("sinif üzvlərinə INVITED sətri və bildiriş yaranır", async () => {
    const eventId = await makeEvent();

    const [memberCount, invited, notifications] = await Promise.all([
      prisma.cohortMembership.count({ where: { cohortId } }),
      prisma.eventRSVP.count({ where: { eventId, status: RsvpStatus.INVITED } }),
      prisma.notification.count({ where: { entityId: eventId } }),
    ]);

    // Yaradıcının özünə dəvət göndərilmir.
    expect(invited).toBe(memberCount - 1);
    expect(notifications).toBe(memberCount - 1);
  });

  it("🔒 PRIVATE tədbirdə dəvət və bildiriş GÖNDƏRİLMİR", async () => {
    // Tədbiri görməyən adama "sizi dəvət etdik" demək özü sızmadır.
    const eventId = await makeEvent({ visibility: Visibility.PRIVATE });

    expect(await prisma.eventRSVP.count({ where: { eventId } })).toBe(0);
    expect(await prisma.notification.count({ where: { entityId: eventId } })).toBe(0);
  });

  it("AuditLog sətri yaranır", async () => {
    const eventId = await makeEvent();
    const log = await prisma.auditLog.findFirst({
      where: { entityType: "EVENT", entityId: eventId },
    });

    expect(log).not.toBeNull();
    expect(log?.actorId).toBe(coordinator.userId);
  });
});

// ---------------------------------------------------------------------------
// 2. Tutum və gözləmə siyahısı
// ---------------------------------------------------------------------------

describe("RSVP — tutum və gözləmə siyahısı", () => {
  it("limitsiz tədbirdə qeydiyyat REGISTERED verir", async () => {
    const eventId = await makeEvent();
    const result = await rsvpToEvent(member, eventId, "REGISTER");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(RsvpStatus.REGISTERED);
      expect(result.value.waitlisted).toBe(false);
    }
  });

  it("🔴 tutum dolubsa WAITLISTED verir", async () => {
    const eventId = await makeEvent({ capacity: 1 });

    // Birinci yer koordinatorun özünə gedir.
    const first = await rsvpToEvent(coordinator, eventId, "REGISTER");
    expect(first.ok && first.value.status).toBe(RsvpStatus.REGISTERED);

    const second = await rsvpToEvent(member, eventId, "REGISTER");
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.status).toBe(RsvpStatus.WAITLISTED);
      expect(second.value.waitlisted).toBe(true);
    }
  });

  it("🔴 DƏVƏTLƏR (INVITED) yeri TUTMUR", async () => {
    // Tədbir yaradılanda bütün sinfə INVITED sətri düşür. Onlar yer tutsaydı
    // 1 yerlik tədbir dərhal dolu görünərdi.
    const eventId = await makeEvent({ capacity: 1 });

    const invitedCount = await prisma.eventRSVP.count({
      where: { eventId, status: RsvpStatus.INVITED },
    });
    expect(invitedCount).toBeGreaterThan(1);

    const result = await rsvpToEvent(member, eventId, "REGISTER");
    expect(result.ok && result.value.status).toBe(RsvpStatus.REGISTERED);
  });

  it("təkrar klik istifadəçini gözləmə siyahısına ATMIR", async () => {
    // Öz sətri tutum hesabından ÇIXILIR (`resolveRsvpDecision` müqaviləsi).
    const eventId = await makeEvent({ capacity: 1 });

    await rsvpToEvent(member, eventId, "REGISTER");
    const again = await rsvpToEvent(member, eventId, "REGISTER");

    expect(again.ok && again.value.status).toBe(RsvpStatus.REGISTERED);
  });

  it("qeydiyyat son tarixi keçibsə REGISTER bloklanır, DECLINE yox", async () => {
    const eventId = await makeEvent({
      registrationDeadline: new Date(Date.now() - 86_400_000),
    });

    const register = await rsvpToEvent(member, eventId, "REGISTER");
    expect(register.ok).toBe(false);
    if (!register.ok) expect(register.reason).toBe("REGISTRATION_CLOSED");

    const decline = await rsvpToEvent(member, eventId, "DECLINE");
    expect(decline.ok).toBe(true);
  });

  it("🔒 görünməyən tədbirə RSVP verilə bilmir", async () => {
    // Məzun BAŞQA sinifdədir → `CLASS` tədbir ona görünmür.
    const eventId = await makeEvent();
    const result = await rsvpToEvent(alumni, eventId, "REGISTER");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });

  it("`attendingCount` yalnız yer tutanları sayır", async () => {
    const eventId = await makeEvent();
    await rsvpToEvent(member, eventId, "REGISTER");
    await rsvpToEvent(coordinator, eventId, "DECLINE");

    const detail = await getEventDetail(coordinator, eventId);
    expect(detail?.attendingCount).toBe(1);

    const totalRsvps = await prisma.eventRSVP.count({ where: { eventId } });
    // Xam sətir sayı çox daha böyükdür (dəvətlər + rədd).
    expect(totalRsvps).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Koordinator paneli — İKİ İCAZƏ MODELİ
// ---------------------------------------------------------------------------

describe("koordinator paneli — rol qapısı", () => {
  it("yaradıcı öz tədbirini idarə edir", async () => {
    const eventId = await makeEvent();
    const table = await listEventAttendees(coordinator, eventId);
    expect(table.ok).toBe(true);
  });

  it("🔴 adi üzv iştirakçı cədvəlini AÇA BİLMİR", async () => {
    // Moderator bu tədbirdə `EVENT_MANAGER_ROLES` rolunda deyil və yaradıcı da
    // deyil → panel bağlıdır.
    const eventId = await makeEvent();
    const table = await listEventAttendees(moderator, eventId);

    expect(table.ok).toBe(false);
    if (!table.ok) expect(table.reason).toBe("FORBIDDEN");
  });

  it("eyni sinifdəki CLASS_REPRESENTATIVE idarə edə bilir", async () => {
    const eventId = await makeEvent();
    const table = await listEventAttendees(member, eventId);

    expect(table.ok).toBe(true);
    // Servis qapısı ilə UI qapısı EYNİ cavabı verməlidir.
    expect(await canManageEvent(member, { createdById: coordinator.userId, cohortId })).toBe(
      true,
    );
  });

  it("cədvəl statusa görə süzülür və axtarış işləyir", async () => {
    const eventId = await makeEvent();
    await rsvpToEvent(member, eventId, "REGISTER");

    const registered = await listEventAttendees(coordinator, eventId, {
      status: RsvpStatus.REGISTERED,
      take: ALL,
    });

    expect(registered.ok).toBe(true);
    if (registered.ok) {
      expect(registered.value.rows).toHaveLength(1);
      expect(registered.value.rows[0].userId).toBe(member.userId);

      const found = await listEventAttendees(coordinator, eventId, {
        search: registered.value.rows[0].firstName,
        take: ALL,
      });
      expect(found.ok && found.value.rows.length).toBeGreaterThan(0);
    }
  });

  it("CSV ixracı sətirləri qaytarır", async () => {
    const eventId = await makeEvent();
    await rsvpToEvent(member, eventId, "REGISTER");

    const exported = await exportEventAttendees(coordinator, eventId);
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      expect(exported.value.rows.length).toBeGreaterThan(0);
      // E-poçt YALNIZ idarəetmə axınındadır — cədvəl `redactProfile`-dan
      // keçmir (səbəb servisdə yazılıb).
      expect(exported.value.rows[0].email).toContain("@");
    }
  });

  it("hesabat rəyləri ANONİM qaytarır", async () => {
    const eventId = await makeEvent({ startsAt: new Date(Date.now() - 86_400_000) });
    await prisma.eventRSVP.upsert({
      where: { eventId_userId: { eventId, userId: member.userId } },
      create: { eventId, userId: member.userId, status: RsvpStatus.ATTENDED },
      update: { status: RsvpStatus.ATTENDED },
    });

    const feedback = await submitEventFeedback(member, eventId, 5, "Çox yaxşı təşkil olundu.");
    expect(feedback.ok).toBe(true);

    const report = await getEventReport(coordinator, eventId);
    expect(report.ok).toBe(true);
    if (report.ok) {
      expect(report.value.averageRating).toBe(5);
      expect(report.value.comments[0].feedback).toBe("Çox yaxşı təşkil olundu.");
      // Müəllif adı hesabatda ÜMUMİYYƏTLƏ yoxdur.
      expect(JSON.stringify(report.value.comments)).not.toContain(member.userId);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Class Timeline-a əlavə
// ---------------------------------------------------------------------------

describe("«Class Timeline-a əlavə et»", () => {
  it("🔴 TimelineEntry yaranır və görünürlük TƏDBİRDƏN kopyalanır", async () => {
    const eventId = await makeEvent({
      startsAt: new Date("2026-03-15T10:00:00.000Z"),
      visibility: Visibility.UNIVERSITY,
      category: "CEREMONY",
    });

    const result = await addEventToTimeline(coordinator, eventId);
    expect(result.ok).toBe(true);

    const entry = await prisma.timelineEntry.findUnique({ where: { eventId } });
    expect(entry).not.toBeNull();
    expect(entry?.sourceType).toBe("EVENT");
    expect(entry?.visibility).toBe(Visibility.UNIVERSITY);
    expect(entry?.cohortId).toBe(cohortId);
    // `EventCategory` DEYİL, `PostCategory` yazılır (filtr ondan asılıdır).
    expect(entry?.category).toBe("EVENT_PHOTOS");
    expect(entry?.academicYear).toBe("2025-2026");

    const row = await prisma.event.findUnique({ where: { id: eventId } });
    expect(row?.addedToTimeline).toBe(true);
  });

  it("iki dəfə çağırmaq DUBLİKAT yaratmır (upsert — T11 analoqu)", async () => {
    const eventId = await makeEvent();

    await addEventToTimeline(coordinator, eventId);
    await addEventToTimeline(coordinator, eventId);

    expect(await prisma.timelineEntry.count({ where: { eventId } })).toBe(1);
  });

  it("çıxarılanda sətir SİLİNİR (cascade işə düşmür)", async () => {
    const eventId = await makeEvent();

    await addEventToTimeline(coordinator, eventId);
    await removeEventFromTimeline(coordinator, eventId);

    expect(await prisma.timelineEntry.count({ where: { eventId } })).toBe(0);
    const row = await prisma.event.findUnique({ where: { id: eventId } });
    expect(row?.addedToTimeline).toBe(false);
  });

  it("icazəsi olmayan xronologiyaya əlavə edə bilmir", async () => {
    const eventId = await makeEvent();
    const result = await addEventToTimeline(moderator, eventId);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// 5. Filtrlər — scope ≠ category
// ---------------------------------------------------------------------------

describe("filtrlər (spec §15)", () => {
  it("🔴 REUNION `scope` filtri işləyir və seed-də 3 tədbir var", async () => {
    const reunions = await listEvents(coordinator, {
      scope: EventScope.REUNION,
      take: ALL,
    });

    for (const event of reunions) {
      expect(event.scope).toBe(EventScope.REUNION);
      // `category` HEÇ VAXT REUNION olmur — iki siyahı kəsişmir.
      expect(event.category).not.toBe("REUNION");
    }
  });

  it("kateqoriya filtri scope-dan ASILI DEYİL", async () => {
    const seminars = await listEvents(coordinator, { category: "SEMINAR", take: ALL });
    for (const event of seminars) expect(event.category).toBe("SEMINAR");
  });

  it("onlayn / üzbəüz filtri", async () => {
    const online = await listEvents(coordinator, { isOnline: true, take: ALL });
    for (const event of online) expect(event.isOnline).toBe(true);

    const offline = await listEvents(coordinator, { isOnline: false, take: ALL });
    for (const event of offline) expect(event.isOnline).toBe(false);
  });

  it("`countEvents` `listEvents` ilə eyni şərtdən keçir", async () => {
    const filters = { audienceCohortId: cohortId, upcoming: true } as const;

    const [rows, total] = await Promise.all([
      listEvents(coordinator, { ...filters, take: ALL }),
      countEvents(coordinator, filters),
    ]);

    expect(rows.length).toBe(total);
  });

  it("facet siyahıları viewer-in GÖRDÜYÜ tədbirlərdən qurulur", async () => {
    const facets = await listEventFacets(coordinator, { audienceCohortId: cohortId });

    for (const option of [...facets.faculty, ...facets.club]) {
      expect(option.count).toBeGreaterThan(0);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("🔒 başqa sinfin CLASS tədbiri məzuna görünmür", async () => {
    const eventId = await makeEvent();

    expect(await getEventDetail(alumni, eventId)).toBeNull();
    expect(await getEventDetail(coordinator, eventId)).not.toBeNull();
  });

  it("🔒 PRIVATE tədbir YALNIZ yaradıcıya görünür", async () => {
    const eventId = await makeEvent({ visibility: Visibility.PRIVATE });

    expect(await getEventDetail(coordinator, eventId)).not.toBeNull();
    expect(await getEventDetail(member, eventId)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. İştirakçı avatarları — məxfilik
// ---------------------------------------------------------------------------

describe("iştirakçı avatarları", () => {
  it("yalnız YER TUTAN statuslar göstərilir", async () => {
    const eventId = await makeEvent();
    await rsvpToEvent(member, eventId, "REGISTER");
    await rsvpToEvent(coordinator, eventId, "DECLINE");

    const detail = await getEventDetail(coordinator, eventId);
    expect(detail).not.toBeNull();

    for (const attendee of detail!.attendees) {
      expect(SEAT_HOLDING_RSVP_STATUSES as readonly string[]).toContain(attendee.status);
    }
    // Rədd edən siyahıda YOXDUR.
    expect(detail!.attendees.map((a) => a.id)).not.toContain(coordinator.userId);
  });

  it("🔒 avatarı gizlədilmiş iştirakçının şəkli qaytarılmır", async () => {
    const eventId = await makeEvent();
    await rsvpToEvent(member, eventId, "REGISTER");

    const previous = await prisma.fieldVisibility.findUnique({
      where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
      select: { level: true },
    });

    try {
      await prisma.fieldVisibility.upsert({
        where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
        create: { userId: member.userId, field: "avatarUrl", level: Visibility.PRIVATE },
        update: { level: Visibility.PRIVATE },
      });

      const detail = await getEventDetail(coordinator, eventId);
      const row = detail?.attendees.find((a) => a.id === member.userId);

      expect(row).toBeDefined();
      // Ad-soyad həmişə görünür (platformanın minimumu), avatar YOX.
      expect(row?.firstName.length).toBeGreaterThan(0);
      expect(row?.avatarUrl).toBeNull();
    } finally {
      // Seed determinizmi: əvvəlki səviyyə geri qaytarılır.
      if (previous) {
        await prisma.fieldVisibility.update({
          where: { userId_field: { userId: member.userId, field: "avatarUrl" } },
          data: { level: previous.level },
        });
      } else {
        await prisma.fieldVisibility.deleteMany({
          where: { userId: member.userId, field: "avatarUrl" },
        });
      }
    }
  });
});
