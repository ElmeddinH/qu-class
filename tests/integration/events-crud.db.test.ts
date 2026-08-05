// @vitest-environment node
// ============================================================================
// tests/integration/events-crud.db.test.ts
// Blok 14C — `/api/v1` tədbir yazma səthi REAL BAZAYA qarşı.
//
// 🔴 FAYLIN ÜÇ SUALI:
//   1. Yazma işləyirmi? (elan olundu → oxundu → yeniləndi → ləğv edildi)
//   2. Yeni endpoint-lər SIZMA açdımı? (kənar sinif üzvü → 404, 403 YOX)
//   3. `event.service.ts`-ə ƏLAVƏ EDİLMİŞ `updateEvent` / `deleteEvent`
//      qapıları doğrudurmu? — burada İKİ AYRI icazə modeli toqquşur:
//        · GÖRÜNÜRLÜK (`visibleWithStatus`) → görməyənə 404
//        · İDARƏETMƏ (`canManageEvent` + `EVENT_MANAGER_ROLES`) → görüb
//          idarə etməyənə 403
//      Sinfin ADİ ÜZVÜ tədbiri GÖRÜR, yəni onun cavabı 403-dür; başqa sinfin
//      üzvü isə GÖRMÜR və 404 alır. Məhz bu fərq mövcudluq orakuludur.
//
// ⚠️ `updateEvent` xronologiya qeydini də yeniləyir — bu, MƏXFİLİK addımıdır
// (törəmə qeydin görünürlüyü mənbədən kopyalanır) və ayrıca test edilir.
//
// 🔴 FAYL YAZIR — və ARDINCA TƏMİZLƏYİR: `createEvent` sinfin hər üzvünə
// `INVITED` RSVP sətri + bildiriş yaradır, `deleteEvent` isə HARD delete
// etmir (`status = CANCELLED`). Hamısı `afterAll`-da əl ilə silinir.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetWriteRateLimiter } from "@/lib/api/rate-limit";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

let currentViewer: Viewer = ANONYMOUS;

vi.mock("@/lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...original,
    getViewer: async () => currentViewer,
  };
});

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

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

const BASE = "http://localhost:3000";
const JSON_HEADERS = { "content-type": "application/json" };

async function call<P extends Record<string, string>>(
  handler: (request: Request, context: { params: Promise<P> }) => Promise<Response>,
  url: string,
  params: P = {} as P,
  init?: RequestInit,
): Promise<Response> {
  return handler(new Request(`${BASE}${url}`, init), {
    params: Promise.resolve(params),
  });
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: JSON_HEADERS,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function dataOf<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { data: T };
  return body.data;
}

async function codeOf(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

/** Ən sadə keçərli tədbir gövdəsi — üzbəüz, sinif səviyyəli. */
function draft(title: string, overrides: Record<string, unknown> = {}) {
  return {
    title,
    description: "İnteqrasiya testinin yaratdığı tədbir.",
    startsAt: "2027-05-20T18:00",
    endsAt: "2027-05-20T21:00",
    location: "Universitet konfrans zalı",
    onlineUrl: "",
    isOnline: false,
    capacity: "60",
    registrationDeadline: "",
    agenda: "",
    contactId: "",
    visibility: "CLASS",
    scope: "CLASS",
    category: "SOCIAL",
    facultyId: "",
    clubId: "",
    coverUrl: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test datası
// ---------------------------------------------------------------------------

/** Tədbiri yaradan — `CLASS_REPRESENTATIVE` (EVENT_MANAGER_ROLES). */
let organizer: UserViewer;
/** EYNİ sinfin ADİ üzvü — tədbiri görür, idarə etmir. */
let member: UserViewer;
/** EYNİ sinfin `EVENT_COORDINATOR`-u — başqasının tədbirini idarə edə bilir. */
let coordinator: UserViewer;
/** BAŞQA sinfin üzvü — sızma testinin əsas aktyoru. */
let outsider: UserViewer;

let ownSlug: string;

/** Testlərin yaratdığı bütün tədbirlər — `afterAll` onları təmizləyir. */
const createdEvents: string[] = [];

async function createEventVia(
  viewer: Viewer,
  slug: string,
  body: Record<string, unknown>,
): Promise<Response> {
  currentViewer = viewer;
  const { POST } = await import("@/app/api/v1/cohorts/[slug]/events/route");
  return call(POST, `/api/v1/cohorts/${slug}/events`, { slug }, jsonInit("POST", body));
}

/** Yaradır və `id`-ni təmizləmə siyahısına yazır. */
async function seedEvent(title: string, overrides: Record<string, unknown> = {}) {
  const response = await createEventVia(organizer, ownSlug, draft(title, overrides));
  expect(response.status).toBe(201);

  const { eventId } = await dataOf<{ eventId: string }>(response);
  createdEvents.push(eventId);
  return eventId;
}

beforeAll(async () => {
  [organizer, member, coordinator, outsider] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("xedice.agayeva@qu.edu.az"),
    viewerOf("coordinator@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  const own = await prisma.cohort.findUniqueOrThrow({
    where: { id: organizer.cohortIds[0] },
    select: { slug: true },
  });
  ownSlug = own.slug;

  // Fixture doğrudurmu? Rollar DB-dən oxunur — səhv aktyor "sızma yoxdur"
  // deyə bilər, halbuki sadəcə yanlış adamla ölçülüb.
  const roles = await prisma.cohortMembership.findMany({
    where: {
      cohortId: organizer.cohortIds[0],
      userId: { in: [organizer.userId, member.userId, coordinator.userId] },
    },
    select: { userId: true, role: true },
  });

  const roleOf = new Map(roles.map((row) => [row.userId, row.role]));
  expect(roleOf.get(organizer.userId)).toBe("CLASS_REPRESENTATIVE");
  expect(roleOf.get(member.userId)).toBe("MEMBER");
  expect(roleOf.get(coordinator.userId)).toBe("EVENT_COORDINATOR");
  expect(outsider.cohortIds).not.toContain(organizer.cohortIds[0]);
});

beforeEach(() => {
  resetWriteRateLimiter();
});

afterAll(async () => {
  // 🔴 HARD delete — `deleteEvent` yalnız `status = CANCELLED` qoyur.
  for (const eventId of createdEvents) {
    await prisma.timelineEntry.deleteMany({ where: { eventId } });
    await prisma.eventRSVP.deleteMany({ where: { eventId } });
    await prisma.mediaAsset.deleteMany({ where: { eventId } });
    await prisma.notification.deleteMany({ where: { entityId: eventId } });
    await prisma.auditLog.deleteMany({ where: { entityId: eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
  }

  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. CRUD — dörd addım bir axında
// ---------------------------------------------------------------------------

describe("tədbir yazma axını", () => {
  it("elan olundu → oxundu → yeniləndi → ləğv edildi", async () => {
    const title = "Blok 14C — tədbir axını testi";

    // --- C ---
    const createResponse = await createEventVia(organizer, ownSlug, draft(title));
    expect(createResponse.status).toBe(201);

    const { eventId } = await dataOf<{ eventId: string }>(createResponse);
    createdEvents.push(eventId);
    expect(createResponse.headers.get("location")).toBe(`/api/v1/events/${eventId}`);

    // Dəvətlər TƏK TRANSAKSİYADA yarandı (sinif üzvləri `INVITED`).
    const invited = await prisma.eventRSVP.count({
      where: { eventId, status: "INVITED" },
    });
    expect(invited).toBeGreaterThan(0);

    // --- R ---
    const { GET, PATCH, DELETE } = await import("@/app/api/v1/events/[id]/route");

    currentViewer = organizer;
    const readResponse = await call(GET, `/api/v1/events/${eventId}`, { id: eventId });
    expect(readResponse.status).toBe(200);

    const event = await dataOf<{ id: string; title: string; capacity: number | null }>(
      readResponse,
    );
    expect(event.id).toBe(eventId);
    expect(event.title).toBe(title);
    expect(event.capacity).toBe(60);

    // --- U: QİSMƏN ---
    const patchResponse = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { location: "A korpusu, 204" }),
    );
    expect(patchResponse.status).toBe(200);

    const updated = await dataOf<{
      location: string | null;
      title: string;
      capacity: number | null;
    }>(patchResponse);

    expect(updated.location).toBe("A korpusu, 204");

    // 🔴 QİSMƏN semantika: göndərilməyən sahələr DƏYİŞMƏDİ.
    expect(updated.title).toBe(title);
    expect(updated.capacity).toBe(60);

    // --- D ---
    const deleteResponse = await call(
      DELETE,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe("");

    // ⚠️ `Event`-də `DELETED` statusu YOXDUR — silmə `CANCELLED` yazır.
    const row = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { status: true },
    });
    expect(row.status).toBe("CANCELLED");

    // ⚠️ RSVP tarixçəsi QALIR: hard delete iştirak faktını cascade ilə
    // aparardı, halbuki o, hesabatın mənbəyidir.
    expect(await prisma.eventRSVP.count({ where: { eventId } })).toBeGreaterThan(0);
  });

  it("ikinci `DELETE` 404 verir — əməliyyat idempotent DEYİL", async () => {
    const eventId = await seedEvent("İkiqat ləğv testi");

    const { DELETE } = await import("@/app/api/v1/events/[id]/route");
    const init = { method: "DELETE" };

    currentViewer = organizer;
    expect(
      (await call(DELETE, `/api/v1/events/${eventId}`, { id: eventId }, init)).status,
    ).toBe(204);

    const second = await call(DELETE, `/api/v1/events/${eventId}`, { id: eventId }, init);
    expect(second.status).toBe(404);
  });

  it("🔴 audit izi yazılır: CREATE · UPDATE · DELETE (TƏLƏ T42)", async () => {
    const eventId = await seedEvent("Audit izi testi");

    const { PATCH, DELETE } = await import("@/app/api/v1/events/[id]/route");
    currentViewer = organizer;

    await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { title: "Audit izi testi (yenilənmiş)" }),
    );
    await call(DELETE, `/api/v1/events/${eventId}`, { id: eventId }, { method: "DELETE" });

    const actions = await prisma.auditLog.findMany({
      where: { entityId: eventId },
      select: { action: true, metadata: true },
    });

    expect(actions.map((row) => row.action).sort()).toEqual(["CREATE", "DELETE", "UPDATE"]);
    // ⚠️ Jurnal MƏTN DAŞIMIR — ağ siyahı yalnız id / enum açarlarını buraxır.
    for (const row of actions) {
      expect(row.metadata ?? "").not.toContain("Audit izi testi");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. 🔴 Xronologiya qeydi — yeniləmə və silmə TÖRƏMƏ sətri ilə birlikdə
// ---------------------------------------------------------------------------

describe("🔴 xronologiya qeydi mənbə ilə sinxron qalır", () => {
  it("`PATCH` görünürlüyü daraldanda törəmə qeyd də daralır", async () => {
    // Törəmə qeydin `visibility`-si MƏNBƏDƏN kopyalanır. Yeniləmə ona
    // toxunmasaydı, `PUBLIC` → `CLASS` daraltması SƏSSİZCƏ İŞLƏMƏZDİ və
    // başlıq açıq xronologiyada qalardı.
    const eventId = await seedEvent("Xronologiya sinxron testi", {
      visibility: "PUBLIC",
    });

    // Tədbir keçmişdə olmalı deyil — `addEventToTimeline` yalnız idarəetmə
    // qapısını yoxlayır.
    const { addEventToTimeline } = await import("@/services/event.service");
    const added = await addEventToTimeline(organizer, eventId);
    expect(added.ok).toBe(true);

    const before = await prisma.timelineEntry.findUniqueOrThrow({ where: { eventId } });
    expect(before.visibility).toBe("PUBLIC");

    const { PATCH, DELETE } = await import("@/app/api/v1/events/[id]/route");
    currentViewer = organizer;

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { visibility: "CLASS", title: "Daraldılmış tədbir" }),
    );
    expect(response.status).toBe(200);

    const after = await prisma.timelineEntry.findUniqueOrThrow({ where: { eventId } });
    expect(after.visibility).toBe("CLASS");
    expect(after.title).toContain("Daraldılmış tədbir");

    // Ləğv edilən tədbirin qeydi xronologiyadan ÇIXIR — soft delete-də
    // cascade işləmir, ona görə servis onu açıq şəkildə silir.
    await call(DELETE, `/api/v1/events/${eventId}`, { id: eventId }, { method: "DELETE" });

    expect(await prisma.timelineEntry.findUnique({ where: { eventId } })).toBeNull();
    const row = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { addedToTimeline: true },
    });
    expect(row.addedToTimeline).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. 🔴 MƏXFİLİK REQRESSİYASI
// ---------------------------------------------------------------------------

describe("🔴 CLASS tədbir kənar istifadəçiyə SIZMIR", () => {
  let eventId: string;
  const title = "Sızma testi — bu tədbir kənar cavabda GÖRÜNMƏMƏLİDİR";

  beforeAll(async () => {
    resetWriteRateLimiter();
    eventId = await seedEvent(title);
  });

  it("🔴 BAŞQA sinfin üzvü `GET` çağıranda 404 alır — 403 YOX", async () => {
    currentViewer = outsider;
    const { GET } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(GET, `/api/v1/events/${eventId}`, { id: eventId });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 kənar istifadəçinin `PATCH`-i 404 alır — 403 SIZMA OLARDI", async () => {
    // `updateEvent` tədbiri `loadManageableEvent` ilə oxuyur və orada
    // görünürlük şərti YOXDUR (koordinator öz `DRAFT`-ını idarə etməlidir) —
    // route-dakı görünürlük qapısı olmasaydı cavab 403 olardı.
    currentViewer = outsider;
    const { PATCH } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { title: "Oğurlanmış başlıq" }),
    );

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 kənar istifadəçinin `DELETE`-i 404 alır və tədbir TOXUNULMAZ qalır", async () => {
    currentViewer = outsider;
    const { DELETE } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(404);

    const row = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { status: true, title: true },
    });
    expect(row.status).toBe("PUBLISHED");
    expect(row.title).toBe(title);
  });

  it("🔴 kənar istifadəçi kənar sinifdə tədbir YARADA BİLMİR (404)", async () => {
    const response = await createEventVia(outsider, ownSlug, draft("Kənar elan cəhdi"));

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");

    const leaked = await prisma.event.findFirst({
      where: { createdById: outsider.userId, cohortId: organizer.cohortIds[0] },
    });
    expect(leaked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Rol qapısı → 403 (mövcudluq viewer-ə ONSUZ DA məlumdur)
// ---------------------------------------------------------------------------

describe("adi üzv tədbiri GÖRÜR, amma idarə edə BİLMİR", () => {
  let eventId: string;

  beforeAll(async () => {
    resetWriteRateLimiter();
    eventId = await seedEvent("Rol qapısı testi");
  });

  it("üzv tədbiri OXUYUR (test doğru resursa baxır)", async () => {
    currentViewer = member;
    const { GET } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(GET, `/api/v1/events/${eventId}`, { id: eventId });
    expect(response.status).toBe(200);
  });

  it("🔴 `PATCH` 403 alır — BURADA 404 səhv olardı", async () => {
    currentViewer = member;
    const { PATCH } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { title: "Başqasının tədbirini redaktə" }),
    );

    expect(response.status).toBe(403);
    expect(await codeOf(response)).toBe("FORBIDDEN");
  });

  it("🔴 `DELETE` 403 alır və tədbir qalır", async () => {
    currentViewer = member;
    const { DELETE } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);

    const row = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { status: true },
    });
    expect(row.status).toBe("PUBLISHED");
  });

  it("🔴 adi üzv `POST` ilə tədbir YARADA BİLMİR (403 — sinfi görür)", async () => {
    // ⚠️ Xatirədən FƏRQ: üzvlük kifayət deyil, `EVENT_MANAGER_ROLES` lazımdır.
    // Cavab 404 DEYİL, çünki viewer sinfin üzvüdür — mövcudluq ona məlumdur.
    const response = await createEventVia(member, ownSlug, draft("Rolsuz elan cəhdi"));

    expect(response.status).toBe(403);
    expect(await codeOf(response)).toBe("FORBIDDEN");
  });

  it("`EVENT_COORDINATOR` BAŞQASININ tədbirini yeniləyə bilir", async () => {
    // `canManageEvent`-in üçüncü şaxəsi: sinifdəki tədbir rolu. Rol JWT-də
    // YOXDUR — DB-dən oxunur.
    currentViewer = coordinator;
    const { PATCH } = await import("@/app/api/v1/events/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { location: "Koordinatorun düzəlişi" }),
    );

    expect(response.status).toBe(200);
    const updated = await dataOf<{ location: string | null }>(response);
    expect(updated.location).toBe("Koordinatorun düzəlişi");
  });
});

// ---------------------------------------------------------------------------
// 5. Doğrulama: `FACULTY_REQUIRED` · `INVALID_DATES` → 422
// ---------------------------------------------------------------------------

describe("🔴 gövdənin qüsurları 422 verir", () => {
  it("POST — `scope = FACULTY` fakültəsiz keçmir", async () => {
    const response = await createEventVia(
      organizer,
      ownSlug,
      draft("Fakültəsiz fakültə tədbiri", { scope: "FACULTY", facultyId: "" }),
    );

    expect(response.status).toBe(422);
    expect(await codeOf(response)).toBe("VALIDATION_FAILED");
  });

  it("🔴 PATCH — `FACULTY_REQUIRED` servisdən gəlir və 422-yə çevrilir", async () => {
    // Qismən gövdədə çarpaz Zod qaydası tətbiq oluna bilmir (müqayisə
    // ediləcək ikinci sahə gövdədə yoxdur) — qapı SERVİSDƏDİR və route
    // yalnız `reason`-u çevirir.
    const eventId = await seedEvent("Fakültəyə keçid testi");

    const { PATCH } = await import("@/app/api/v1/events/[id]/route");
    currentViewer = organizer;

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { scope: "FACULTY" }),
    );

    expect(response.status).toBe(422);
    expect(await codeOf(response)).toBe("VALIDATION_FAILED");

    // Rədd edilən sorğu heç nə yazmır.
    const row = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { scope: true },
    });
    expect(row.scope).toBe("CLASS");
  });

  it("🔴 PATCH — bitmə vaxtı başlamadan əvvəldirsə `INVALID_DATES` → 422", async () => {
    const eventId = await seedEvent("Tarix qaydası testi");

    const { PATCH } = await import("@/app/api/v1/events/[id]/route");
    currentViewer = organizer;

    const response = await call(
      PATCH,
      `/api/v1/events/${eventId}`,
      { id: eventId },
      jsonInit("PATCH", { endsAt: "2027-05-20T17:00" }),
    );

    expect(response.status).toBe(422);
    expect(await codeOf(response)).toBe("VALIDATION_FAILED");
  });
});

// ---------------------------------------------------------------------------
// 6. Qapılar: məzmun tipi, sayğac, anonim
// ---------------------------------------------------------------------------

describe("yazma qapıları", () => {
  it("🔴 `POST` JSON olmayan sorğuda 415 alır (TƏLƏ B — cross-site form)", async () => {
    currentViewer = organizer;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/events/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/events`,
      { slug: ownSlug },
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "title=Tədbir",
      },
    );

    expect(response.status).toBe(415);
    expect(await codeOf(response)).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("🔴 sayğac həddi aşılanda 429 + `Retry-After` gəlir", async () => {
    currentViewer = organizer;
    const { DELETE } = await import("@/app/api/v1/events/[id]/route");

    let last: Response | null = null;
    for (let i = 0; i < 25; i += 1) {
      last = await call(DELETE, "/api/v1/events/yoxdur", { id: "yoxdur" }, {
        method: "DELETE",
      });
      if (last.status === 429) break;
    }

    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await codeOf(last as Response)).toBe("TOO_MANY_REQUESTS");
  });

  it("🔴 anonim sorğu yazma endpoint-lərində 401 alır", async () => {
    const response = await createEventVia(ANONYMOUS, ownSlug, draft("Anonim elan"));

    expect(response.status).toBe(401);
    expect(await codeOf(response)).toBe("UNAUTHENTICATED");
  });
});
