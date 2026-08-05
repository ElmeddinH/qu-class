// @vitest-environment node
// ============================================================================
// tests/integration/memories-crud.db.test.ts
// Blok 14C — `/api/v1` xatirə yazma səthi REAL BAZAYA qarşı.
//
// 🔴 FAYLIN İKİ SUALI (14B-nin `posts-crud.db.test.ts`-i ilə EYNİ):
//   1. Yazma həqiqətən İŞLƏYİRMİ? (yaradıldı → oxundu → yeniləndi → silindi)
//   2. YENİ YAZMA ENDPOINT-LƏRİ SIZMA AÇDIMI?
//
// İkinci sual daha vacibdir: `updateMemory` və `deleteMemory` xatirəni
// GÖRÜNÜRLÜK ŞƏRTİ OLMADAN oxuyur (onların işi sahiblik yoxlamaqdır). Route
// bunu `getMemory` qapısı ilə bağlayır — test həmin qapının yerində olduğunu
// SÜBUT EDİR:
//   · başqa sinfin üzvü GET / PATCH / DELETE → HAMISI 404 (403 YOX)
//   · öz sinfinin üzvü, amma müəllif deyil   → 403 (mövcudluq onsuz da məlum)
//
// ⚠️ ÜÇÜNCÜ SUAL BU FAYLA XASDIR: `showInTimeline && !showInFeed` iş qaydası
// (`TIMELINE_REQUIRES_FEED`) həm POST-da, həm də BİRLƏŞMİŞ PATCH nəticəsində
// 422 verirmi? Qayda route-da TƏKRARLANMIR, ona görə testi ROUTE səthində
// ölçmək lazımdır.
//
// ⚠️ NİYƏ `getViewer` MOCK OLUNUR — `posts-crud.db.test.ts` ilə eyni səbəb:
// `auth()` `next/headers`-ə toxunur. Viewer REAL bazadan qurulur.
//
// 🔴 FAYL YAZIR — və ARDINCA TƏMİZLƏYİR: `deleteMemory` SOFT delete edir,
// yəni sətir öz-özünə getmir. Bağlı Post, xronologiya qeydi və moderasiya
// audit sətri də əl ilə silinir (cascade soft delete-də İŞLƏMİR).
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

/** Ən sadə keçərli xatirə gövdəsi — heç bir səthə yayılma YOXDUR. */
function draft(title: string, overrides: Record<string, unknown> = {}) {
  return {
    type: "MEMORABLE_EVENT",
    title,
    body: "Bu, inteqrasiya testinin yazdığı xatirə mətnidir — ən azı 20 simvol.",
    dedicatedTo: "",
    imageUrl: "",
    occurredAt: "2026-11-05T20:00",
    guidePlaceId: "",
    visibility: "CLASS",
    showInProfile: true,
    showInFeed: false,
    showInTimeline: false,
    showInYearbook: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test datası
// ---------------------------------------------------------------------------

/** Xatirənin müəllifi. */
let author: UserViewer;
/** EYNİ sinfin adi üzvü — müəllif deyil, moderator deyil. */
let classmate: UserViewer;
/** EYNİ sinfin MODERATORU — silə bilir, redaktə edə BİLMİR. */
let moderator: UserViewer;
/** BAŞQA sinfin üzvü — sızma testinin əsas aktyoru. */
let outsider: UserViewer;

let ownSlug: string;

/** Testlərin yaratdığı bütün xatirələr — `afterAll` onları təmizləyir. */
const createdMemories: string[] = [];

async function createMemoryVia(
  viewer: Viewer,
  slug: string,
  body: Record<string, unknown>,
): Promise<Response> {
  currentViewer = viewer;
  const { POST } = await import("@/app/api/v1/cohorts/[slug]/memories/route");
  return call(
    POST,
    `/api/v1/cohorts/${slug}/memories`,
    { slug },
    jsonInit("POST", body),
  );
}

/** Yaradır və `id`-ni təmizləmə siyahısına yazır. */
async function seedMemory(title: string, overrides: Record<string, unknown> = {}) {
  const response = await createMemoryVia(author, ownSlug, draft(title, overrides));
  expect(response.status).toBe(201);

  const { memoryId } = await dataOf<{ memoryId: string }>(response);
  createdMemories.push(memoryId);
  return memoryId;
}

beforeAll(async () => {
  [author, classmate, moderator, outsider] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("xedice.agayeva@qu.edu.az"),
    viewerOf("moderator@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  const own = await prisma.cohort.findUniqueOrThrow({
    where: { id: author.cohortIds[0] },
    select: { slug: true },
  });
  ownSlug = own.slug;

  // Test öz aktyorlarını doğru seçibmi? — səhv fixture "sızma yoxdur" deyə
  // bilər, halbuki sadəcə yanlış adamla ölçülüb.
  expect(classmate.cohortIds).toContain(author.cohortIds[0]);
  expect(classmate.moderatedCohortIds).not.toContain(author.cohortIds[0]);
  expect(moderator.moderatedCohortIds).toContain(author.cohortIds[0]);
  expect(outsider.cohortIds).not.toContain(author.cohortIds[0]);
});

beforeEach(() => {
  // ⚠️ Sayğac MODUL SƏVİYYƏSİNDƏDİR və testlər arasında yaşayır.
  resetWriteRateLimiter();
});

afterAll(async () => {
  // 🔴 HARD delete — `deleteMemory` yalnız `status = DELETED` qoyur.
  for (const memoryId of createdMemories) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      select: { postId: true },
    });

    if (memory?.postId) {
      await prisma.timelineEntry.deleteMany({ where: { postId: memory.postId } });
      await prisma.mediaAsset.deleteMany({ where: { postId: memory.postId } });
    }

    await prisma.memory.deleteMany({ where: { id: memoryId } });
    if (memory?.postId) await prisma.post.deleteMany({ where: { id: memory.postId } });

    // Moderasiya yolu ilə silmə audit sətri yaradır (TƏLƏ T41).
    await prisma.auditLog.deleteMany({ where: { entityId: memoryId } });
  }

  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. CRUD — dörd addım bir axında
// ---------------------------------------------------------------------------

describe("xatirə CRUD-u", () => {
  it("yaradıldı → oxundu → yeniləndi → silindi", async () => {
    const title = "Blok 14C inteqrasiya testi";

    // --- C ---
    const createResponse = await createMemoryVia(author, ownSlug, draft(title));
    expect(createResponse.status).toBe(201);

    const { memoryId } = await dataOf<{ memoryId: string }>(createResponse);
    createdMemories.push(memoryId);
    expect(createResponse.headers.get("location")).toBe(`/api/v1/memories/${memoryId}`);

    // --- R ---
    const { GET, PATCH, DELETE } = await import("@/app/api/v1/memories/[id]/route");

    currentViewer = author;
    const readResponse = await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId });
    expect(readResponse.status).toBe(200);

    const memory = await dataOf<{ id: string; title: string; showInYearbook: boolean }>(
      readResponse,
    );
    expect(memory.id).toBe(memoryId);
    expect(memory.title).toBe(title);
    expect(memory.showInYearbook).toBe(false);

    // --- U: QİSMƏN ---
    const patchResponse = await call(
      PATCH,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      jsonInit("PATCH", { showInYearbook: true }),
    );
    expect(patchResponse.status).toBe(200);

    const updated = await dataOf<{
      title: string;
      body: string;
      showInYearbook: boolean;
      showInProfile: boolean;
    }>(patchResponse);

    expect(updated.showInYearbook).toBe(true);

    // 🔴 QİSMƏN semantika: göndərilməyən sahələr DƏYİŞMƏDİ. Default qoysaydıq
    // burada başlıq boşalar, `showInProfile` isə söndürülərdi.
    expect(updated.title).toBe(title);
    expect(updated.showInProfile).toBe(true);

    // --- D ---
    const deleteResponse = await call(
      DELETE,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe("");

    const row = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { status: true },
    });
    expect(row.status).toBe("DELETED");

    // Silinmiş xatirə artıq OXUNMUR.
    const afterDelete = await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId });
    expect(afterDelete.status).toBe(404);
  });

  it("ikinci `DELETE` 404 verir — əməliyyat idempotent DEYİL", async () => {
    const memoryId = await seedMemory("İkiqat silmə testi");

    const { DELETE } = await import("@/app/api/v1/memories/[id]/route");
    const init = { method: "DELETE" };

    currentViewer = author;
    expect(
      (await call(DELETE, `/api/v1/memories/${memoryId}`, { id: memoryId }, init)).status,
    ).toBe(204);

    const second = await call(
      DELETE,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      init,
    );
    expect(second.status).toBe(404);
  });

  it("🔴 `showInFeed` açıq yaradılanda lentdə Post yaranır (TƏLƏ A)", async () => {
    const memoryId = await seedMemory("Lentdə də paylaşılan xatirə", {
      showInFeed: true,
      showInTimeline: true,
    });

    const memory = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { postId: true },
    });

    expect(memory.postId).not.toBeNull();

    // Xronologiya qeydi ANCAQ bağlı Post vasitəsilə yaranır — `TimelineEntry`-də
    // Memory-yə FK yoxdur.
    const entry = await prisma.timelineEntry.findFirst({
      where: { postId: memory.postId as string },
    });
    expect(entry).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. 🔴 İŞ QAYDASI — `showInTimeline` yalnız `showInFeed` ilə
// ---------------------------------------------------------------------------

describe("🔴 TIMELINE_REQUIRES_FEED → 422", () => {
  it("POST — `showInTimeline: true` + `showInFeed: false` keçmir", async () => {
    // Qayda İKİ QAT tətbiq olunur (Zod `memorySurfaceRules` + servis) və heç
    // biri route-da deyil. Cavab hər halda 422 olmalıdır.
    const response = await createMemoryVia(
      author,
      ownSlug,
      draft("Qaydanı pozan xatirə", { showInTimeline: true, showInFeed: false }),
    );

    expect(response.status).toBe(422);
    expect(await codeOf(response)).toBe("VALIDATION_FAILED");
  });

  it("🔴 PATCH — qayda BİRLƏŞMİŞ nəticəyə tətbiq olunur", async () => {
    // Gövdədə yalnız `showInTimeline` var; `showInFeed` MÖVCUD dəyərdən
    // (false) gəlir. Yalnız gövdəyə baxan sxem bunu buraxardı — servis
    // birləşmiş vəziyyəti yoxlayır və route `reason`-u 422-yə çevirir.
    const memoryId = await seedMemory("Birləşmiş qayda testi");

    const { PATCH } = await import("@/app/api/v1/memories/[id]/route");
    currentViewer = author;

    const response = await call(
      PATCH,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      jsonInit("PATCH", { showInTimeline: true }),
    );

    expect(response.status).toBe(422);
    expect(await codeOf(response)).toBe("VALIDATION_FAILED");

    // Sətir TOXUNULMAZ qalmalıdır — rədd edilən sorğu heç nə yazmır.
    const row = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { showInTimeline: true },
    });
    expect(row.showInTimeline).toBe(false);
  });

  it("`showInFeed` ilə birlikdə göndərilsə KEÇİR", async () => {
    const memoryId = await seedMemory("Birlikdə göndərilən bayraqlar");

    const { PATCH } = await import("@/app/api/v1/memories/[id]/route");
    currentViewer = author;

    const response = await call(
      PATCH,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      jsonInit("PATCH", { showInTimeline: true, showInFeed: true }),
    );

    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 3. 🔴 MƏXFİLİK REQRESSİYASI
// ---------------------------------------------------------------------------

describe("🔴 CLASS xatirə kənar istifadəçiyə SIZMIR", () => {
  let memoryId: string;
  const title = "Sızma testi — bu başlıq kənar cavabda GÖRÜNMƏMƏLİDİR";

  beforeAll(async () => {
    resetWriteRateLimiter();
    memoryId = await seedMemory(title);
  });

  it("🔴 BAŞQA sinfin üzvü `GET` çağıranda 404 alır — 403 YOX", async () => {
    currentViewer = outsider;
    const { GET } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 cavabın MƏTNİNDƏ xatirənin başlığı yoxdur", async () => {
    currentViewer = outsider;
    const { GET } = await import("@/app/api/v1/memories/[id]/route");

    const body = await (
      await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId })
    ).text();

    expect(body).not.toContain(title.slice(0, 20));
  });

  it("🔴 ANONİM sorğu da 404 alır (CLASS xatirə ictimai deyil)", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId });
    expect(response.status).toBe(404);
  });

  it("🔴 kənar istifadəçinin `PATCH`-i 404 alır — 403 SIZMA OLARDI", async () => {
    // `updateMemory` görünürlük şərti OLMADAN oxuyur və özü `FORBIDDEN`
    // qaytarardı → 403. Route-dakı `getMemory` qapısı onu 404-ə çevirir.
    currentViewer = outsider;
    const { PATCH } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      jsonInit("PATCH", { title: "Oğurlanmış başlıq" }),
    );

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 kənar istifadəçinin `DELETE`-i 404 alır və xatirə TOXUNULMAZ qalır", async () => {
    currentViewer = outsider;
    const { DELETE } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(404);

    const row = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { status: true, title: true },
    });
    expect(row.status).toBe("ACTIVE");
    expect(row.title).toBe(title);
  });

  it("🔴 kənar istifadəçi kənar sinifdə xatirə YARADA BİLMİR (404)", async () => {
    // 403 DEYİL — `resolveCohortScope` ilə eyni qərar: sinfin mövcudluğu
    // sızmamalıdır.
    const response = await createMemoryVia(outsider, ownSlug, draft("Kənar yazma cəhdi"));

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");

    const leaked = await prisma.memory.findFirst({
      where: { authorId: outsider.userId, cohortId: author.cohortIds[0] },
    });
    expect(leaked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Sahiblik qapısı → 403 (mövcudluq viewer-ə ONSUZ DA məlumdur)
// ---------------------------------------------------------------------------

describe("sinif yoldaşı xatirəni GÖRÜR, amma dəyişə BİLMİR", () => {
  let memoryId: string;

  beforeAll(async () => {
    resetWriteRateLimiter();
    memoryId = await seedMemory("Sahiblik qapısı testi");
  });

  it("üzv xatirəni OXUYUR (test doğru resursa baxır)", async () => {
    currentViewer = classmate;
    const { GET } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(GET, `/api/v1/memories/${memoryId}`, { id: memoryId });
    expect(response.status).toBe(200);
  });

  it("🔴 `PATCH` 403 alır — BURADA 404 səhv olardı", async () => {
    currentViewer = classmate;
    const { PATCH } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      jsonInit("PATCH", { title: "Başqasının xatirəsini redaktə" }),
    );

    expect(response.status).toBe(403);
    expect(await codeOf(response)).toBe("FORBIDDEN");
  });

  it("🔴 adi üzvün `DELETE`-i 403 alır və xatirə qalır", async () => {
    currentViewer = classmate;
    const { DELETE } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);

    const row = await prisma.memory.findUniqueOrThrow({
      where: { id: memoryId },
      select: { status: true },
    });
    expect(row.status).toBe("ACTIVE");
  });

  it("🔴 MODERATOR silə bilir və AUDIT sətri yazılır (TƏLƏ T41)", async () => {
    // Moderator MƏZMUNU silir, amma yuxarıdakı `PATCH` testi göstərir ki,
    // başqasının xatirəsini YAZA bilmir — silmə moderasiyadır, redaktə yox.
    currentViewer = moderator;
    const { DELETE } = await import("@/app/api/v1/memories/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/memories/${memoryId}`,
      { id: memoryId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(204);

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: memoryId, action: "MODERATE" },
      select: { actorId: true, metadata: true },
    });

    expect(audit).not.toBeNull();
    expect(audit?.actorId).toBe(moderator.userId);
    // ⚠️ Jurnal MƏTN DAŞIMIR — ağ siyahı yalnız id / enum açarlarını buraxır.
    expect(audit?.metadata ?? "").not.toContain("Sahiblik qapısı testi");
  });
});

// ---------------------------------------------------------------------------
// 5. Qapılar: məzmun tipi, doğrulama, sayğac, anonim
// ---------------------------------------------------------------------------

describe("yazma qapıları", () => {
  it("🔴 `POST` JSON olmayan sorğuda 415 alır (TƏLƏ B — cross-site form)", async () => {
    currentViewer = author;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/memories/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/memories`,
      { slug: ownSlug },
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "type=MEMORABLE_EVENT",
      },
    );

    expect(response.status).toBe(415);
    expect(await codeOf(response)).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("naməlum `type` 422 və AZƏRBAYCANCA detal verir", async () => {
    const response = await createMemoryVia(
      author,
      ownSlug,
      draft("Səhv növ", { type: "TELEPATHY" }),
    );

    expect(response.status).toBe(422);

    const body = (await response.json()) as {
      error: { code: string; details: Array<{ path: string; message: string }> };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details.some((d) => d.path === "type")).toBe(true);
  });

  it("🔴 sxem qaydası tətbiq olunur: qısa mətn keçmir (422)", async () => {
    // Qayda `features/memories/schemas.ts`-dədir və forma ilə EYNİ funksiyadır.
    const response = await createMemoryVia(
      author,
      ownSlug,
      draft("Qısa mətn", { body: "Bir cümlə." }),
    );

    expect(response.status).toBe(422);
  });

  it("🔴 sayğac həddi aşılanda 429 + `Retry-After` gəlir", async () => {
    currentViewer = author;
    const { DELETE } = await import("@/app/api/v1/memories/[id]/route");

    // `DELETE` seçilib, çünki mövcud olmayan id ilə də sayğac ARTIR: qapı
    // doğrulamadan ƏVVƏLDİR və baza toxunulmur.
    let last: Response | null = null;
    for (let i = 0; i < 25; i += 1) {
      last = await call(DELETE, "/api/v1/memories/yoxdur", { id: "yoxdur" }, {
        method: "DELETE",
      });
      if (last.status === 429) break;
    }

    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await codeOf(last as Response)).toBe("TOO_MANY_REQUESTS");
  });

  it("🔴 anonim sorğu yazma endpoint-lərində 401 alır", async () => {
    const response = await createMemoryVia(ANONYMOUS, ownSlug, draft("Anonim cəhd"));

    expect(response.status).toBe(401);
    expect(await codeOf(response)).toBe("UNAUTHENTICATED");
  });
});
