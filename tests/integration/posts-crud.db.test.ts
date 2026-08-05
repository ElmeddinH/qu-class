// @vitest-environment node
// ============================================================================
// tests/integration/posts-crud.db.test.ts
// Blok 14B — `/api/v1` paylaşım CRUD-u REAL BAZAYA qarşı.
//
// 🔴 FAYLIN İKİ SUALI:
//   1. CRUD həqiqətən İŞLƏYİRMİ? (yaradıldı → oxundu → yeniləndi → silindi)
//   2. YENİ YAZMA ENDPOINT-LƏRİ SIZMA AÇDIMI?
//
// İkinci sual daha vacibdir. Oxu endpoint-lərinin məxfiliyi `api.db.test.ts`-də
// ölçülüb; burada YAZMA səthi yoxlanılır, çünki `updatePostSurfaces` və
// `deletePost` servisləri post-u GÖRÜNÜRLÜK ŞƏRTİ OLMADAN oxuyur (onların işi
// sahiblik yoxlamaqdır). Route bunu `getPost` qapısı ilə bağlayır — test məhz
// həmin qapının yerində olduğunu SÜBUT EDİR:
//   · başqa sinfin üzvü GET / PATCH / DELETE → HAMISI 404 (403 YOX)
//   · öz sinfinin üzvü, amma müəllif deyil    → 403 (mövcudluq onsuz da məlum)
// Fərq incədir və məhz o fərq mövcudluq orakuludur.
//
// ⚠️ NİYƏ `getViewer` MOCK OLUNUR — `api.db.test.ts` ilə eyni səbəb: `auth()`
// `next/headers`-ə toxunur və Next sorğu konteksti olmadan atır. Viewer-in ÖZÜ
// mock deyil, REAL bazadan qurulur.
//
// 🔴 FAYL YAZIR — və ARDINCA TƏMİZLƏYİR. Digər inteqrasiya faylları qlobal
// aqreqasiya ölçür (`visibility.db.test.ts` → `includeInStats` sayğacları),
// ona görə burada yaradılan paylaşım `afterAll`-da HARD delete olunur.
// `deletePost` SOFT delete edir (`status = DELETED`), yəni sətir öz-özünə
// getmir — təmizləmə açıq yazılmalıdır. Bildirişlər də silinir: `Notification`
// `Post`-a FK ilə bağlı DEYİL (`entityId` sadə sətirdir), yəni cascade onları
// TUTMUR.
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

/** JSON gövdəsi ilə yazma sorğusu — `requireJson` başlığı hər dəfə lazımdır. */
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

/** Ən sadə keçərli paylaşım gövdəsi — səthlərə yayılma YOXDUR. */
function draft(body: string) {
  return {
    category: "GENERAL",
    kind: "TEXT",
    visibility: "CLASS",
    body,
    occurredAt: "2026-09-02T09:00",
    linkUrl: "",
    linkTitle: "",
    linkImage: "",
    referencedEventId: "",
    showOnTimeline: false,
    showInAchievements: false,
    media: [],
    achievement: { title: "", organization: "", awardedAt: "", proofUrl: "" },
    memory: { title: "", body: "", dedicatedTo: "" },
  };
}

// ---------------------------------------------------------------------------
// Test datası
// ---------------------------------------------------------------------------

/** Paylaşımın müəllifi — `rep`-in sinfinin nümayəndəsi. */
let author: UserViewer;
/** EYNİ sinfin adi üzvü — müəllif deyil, moderator deyil. */
let classmate: UserViewer;
/** BAŞQA sinfin üzvü — sızma testinin əsas aktyoru. */
let outsider: UserViewer;

let ownSlug: string;
let foreignSlug: string;

/** Testlərin yaratdığı bütün paylaşımlar — `afterAll` onları təmizləyir. */
const created: string[] = [];

async function createPostVia(
  viewer: Viewer,
  slug: string,
  body: string,
): Promise<Response> {
  currentViewer = viewer;
  const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");
  return call(POST, `/api/v1/cohorts/${slug}/posts`, { slug }, jsonInit("POST", draft(body)));
}

beforeAll(async () => {
  [author, classmate, outsider] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("xedice.agayeva@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  const own = await prisma.cohort.findUniqueOrThrow({
    where: { id: author.cohortIds[0] },
    select: { slug: true },
  });
  ownSlug = own.slug;

  const foreign = await prisma.cohort.findUniqueOrThrow({
    where: { id: outsider.cohortIds[0] },
    select: { slug: true },
  });
  foreignSlug = foreign.slug;

  // Test öz aktyorlarını doğru seçibmi? — səhv fixture "sızma yoxdur" deyə
  // bilər, halbuki sadəcə yanlış adamla ölçülüb.
  expect(classmate.cohortIds).toContain(author.cohortIds[0]);
  expect(classmate.moderatedCohortIds).not.toContain(author.cohortIds[0]);
  expect(outsider.cohortIds).not.toContain(author.cohortIds[0]);
});

beforeEach(() => {
  // ⚠️ Sayğac MODUL SƏVİYYƏSİNDƏDİR və testlər arasında yaşayır. 20 yazma
  // həddi bütün fayl üçün olsaydı sonuncu testlər 429 alardı — və bu, real
  // nasazlıq olmadan qırmızı verərdi.
  resetWriteRateLimiter();
});

afterAll(async () => {
  // 🔴 HARD delete — `deletePost` yalnız `status = DELETED` qoyur.
  for (const postId of created) {
    await prisma.notification.deleteMany({ where: { entityId: postId } });
    await prisma.timelineEntry.deleteMany({ where: { postId } });
    await prisma.achievement.deleteMany({ where: { postId } });
    await prisma.memory.deleteMany({ where: { postId } });
    await prisma.post.deleteMany({ where: { id: postId } });
  }

  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. CRUD — dörd addım bir axında
// ---------------------------------------------------------------------------

describe("paylaşım CRUD-u", () => {
  it("yaradıldı → oxundu → yeniləndi → silindi", async () => {
    const text = "Blok 14B inteqrasiya testi — CRUD axını.";

    // --- C: yaradılma ---
    const createResponse = await createPostVia(author, ownSlug, text);
    expect(createResponse.status).toBe(201);

    const { postId } = await dataOf<{ postId: string }>(createResponse);
    expect(postId).toBeTruthy();
    created.push(postId);

    // `Location` müştəriyə növbəti addımı göstərir (RFC 9110 §10.2.2).
    expect(createResponse.headers.get("location")).toBe(`/api/v1/posts/${postId}`);

    // --- R: oxu ---
    const { GET, PATCH, DELETE } = await import("@/app/api/v1/posts/[id]/route");

    currentViewer = author;
    const readResponse = await call(GET, `/api/v1/posts/${postId}`, { id: postId });
    expect(readResponse.status).toBe(200);

    const post = await dataOf<{ id: string; body: string; showOnTimeline: boolean }>(
      readResponse,
    );
    expect(post.id).toBe(postId);
    expect(post.body).toBe(text);
    expect(post.showOnTimeline).toBe(false);

    // --- U: qismən yeniləmə ---
    const patchResponse = await call(
      PATCH,
      `/api/v1/posts/${postId}`,
      { id: postId },
      jsonInit("PATCH", { showOnTimeline: true }),
    );
    expect(patchResponse.status).toBe(200);

    const updated = await dataOf<{
      showOnTimeline: boolean;
      showInAchievements: boolean;
    }>(patchResponse);
    expect(updated.showOnTimeline).toBe(true);

    // 🔴 QİSMƏN semantika: göndərilməyən bayraq DƏYİŞMƏDİ. `?? false` yazsaydıq
    // burada `false` görünərdi və müştəri xəbərsiz səth söndürərdi.
    expect(updated.showInAchievements).toBe(false);

    // Səthə yayılma REAL oldu — xronologiya qeydi yarandı (spec §7).
    const entry = await prisma.timelineEntry.findFirst({ where: { postId } });
    expect(entry).not.toBeNull();

    // --- D: silinmə ---
    currentViewer = author;
    const deleteResponse = await call(
      DELETE,
      `/api/v1/posts/${postId}`,
      { id: postId },
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(204);
    expect(await deleteResponse.text()).toBe("");

    // ⚠️ SOFT delete-dir, amma xronologiya qeydi EYNİ transaksiyada silinir
    // (TƏLƏ T4) — əks halda silinmiş postun izi xronologiyada qalardı.
    const row = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { status: true },
    });
    expect(row.status).toBe("DELETED");
    expect(await prisma.timelineEntry.findFirst({ where: { postId } })).toBeNull();

    // Silinmiş paylaşım artıq OXUNMUR.
    const afterDelete = await call(GET, `/api/v1/posts/${postId}`, { id: postId });
    expect(afterDelete.status).toBe(404);
  });

  it("ikinci `DELETE` 404 verir — əməliyyat idempotent DEYİL", async () => {
    const response = await createPostVia(author, ownSlug, "İkiqat silmə testi.");
    const { postId } = await dataOf<{ postId: string }>(response);
    created.push(postId);

    const { DELETE } = await import("@/app/api/v1/posts/[id]/route");
    const init = { method: "DELETE" };

    currentViewer = author;
    expect((await call(DELETE, `/api/v1/posts/${postId}`, { id: postId }, init)).status).toBe(204);

    const second = await call(DELETE, `/api/v1/posts/${postId}`, { id: postId }, init);
    expect(second.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 2. 🔴 MƏXFİLİK REQRESSİYASI — blokun ən vacib hissəsi
// ---------------------------------------------------------------------------

describe("🔴 CLASS paylaşım kənar istifadəçiyə SIZMIR", () => {
  let postId: string;
  let text: string;

  beforeAll(async () => {
    text = "Sızma testi — bu mətn kənar cavabda GÖRÜNMƏMƏLİDİR.";
    const response = await createPostVia(author, ownSlug, text);
    expect(response.status).toBe(201);

    ({ postId } = await dataOf<{ postId: string }>(response));
    created.push(postId);
  });

  it("🔴 BAŞQA sinfin üzvü `GET` çağıranda 404 alır — 403 YOX", async () => {
    // 403 «bu id-də nəsə var, amma sənə yox» deməkdir və mövcudluq faktının
    // özü məlumatdır: hücumçu id sıralayıb sinfin məzmun HƏCMİNİ ölçə bilərdi.
    currentViewer = outsider;
    const { GET } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(GET, `/api/v1/posts/${postId}`, { id: postId });

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 cavabın MƏTNİNDƏ paylaşımın gövdəsi yoxdur", async () => {
    currentViewer = outsider;
    const { GET } = await import("@/app/api/v1/posts/[id]/route");

    const body = await (
      await call(GET, `/api/v1/posts/${postId}`, { id: postId })
    ).text();

    expect(body).not.toContain(text.slice(0, 30));
  });

  it("🔴 ANONİM sorğu da 404 alır (CLASS paylaşım ictimai deyil)", async () => {
    currentViewer = ANONYMOUS;
    const { GET } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(GET, `/api/v1/posts/${postId}`, { id: postId });
    expect(response.status).toBe(404);
  });

  it("🔴 kənar istifadəçinin `PATCH`-i 404 alır — 403 SIZMA OLARDI", async () => {
    // Bu, blokun ən incə yeridir: `updatePostSurfaces` post-u görünürlük
    // şərti OLMADAN oxuyur və özü `FORBIDDEN` qaytarardı → 403. Route-dakı
    // `getPost` qapısı onu 404-ə çevirir.
    currentViewer = outsider;
    const { PATCH } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/posts/${postId}`,
      { id: postId },
      jsonInit("PATCH", { showOnTimeline: true }),
    );

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");
  });

  it("🔴 kənar istifadəçinin `DELETE`-i 404 alır və paylaşım TOXUNULMAZ qalır", async () => {
    currentViewer = outsider;
    const { DELETE } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/posts/${postId}`,
      { id: postId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(404);

    // Cavab 404 olsa da sətir dəyişməmiş olmalıdır — status kodu ilə real
    // effekt ayrı şeylərdir.
    const row = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { status: true },
    });
    expect(row.status).toBe("ACTIVE");
  });

  it("🔴 kənar istifadəçi kənar sinifdə paylaşım YARADA BİLMİR (404)", async () => {
    // ⚠️ 403 DEYİL — `resolveCohortScope` ilə eyni qərar: sinfin mövcudluğu
    // sızmamalıdır. Sprint tapşırığında bu hal "403" kimi yazılmışdı, amma
    // layihənin 404 qaydası (CLAUDE.md §5 · `lib/api/errors.ts`) daha
    // güclüdür və məxfilik testi ona görə 404 gözləyir.
    const response = await createPostVia(outsider, ownSlug, "Kənar yazma cəhdi.");

    expect(response.status).toBe(404);
    expect(await codeOf(response)).toBe("NOT_FOUND");

    // Heç bir sətir yaranmamalıdır.
    const leaked = await prisma.post.findFirst({
      where: { authorId: outsider.userId, cohortId: author.cohortIds[0] },
    });
    expect(leaked).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Sahiblik qapısı → 403 (mövcudluq viewer-ə ONSUZ DA məlumdur)
// ---------------------------------------------------------------------------

describe("sinif yoldaşı postu GÖRÜR, amma dəyişə BİLMİR", () => {
  let postId: string;

  beforeAll(async () => {
    const response = await createPostVia(author, ownSlug, "Sahiblik qapısı testi.");
    ({ postId } = await dataOf<{ postId: string }>(response));
    created.push(postId);
  });

  it("üzv postu OXUYUR (test doğru resursa baxır)", async () => {
    currentViewer = classmate;
    const { GET } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(GET, `/api/v1/posts/${postId}`, { id: postId });
    expect(response.status).toBe(200);
  });

  it("🔴 `PATCH` 403 alır — BURADA 404 səhv olardı", async () => {
    // Viewer postu görür, yəni mövcudluq artıq məlumdur: 404 qaytarmaq
    // inteqrasiya yazan adamı yanıldardı ("id səhvdirmi?"). Səth redaktəsini
    // YALNIZ müəllif idarə edir.
    currentViewer = classmate;
    const { PATCH } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(
      PATCH,
      `/api/v1/posts/${postId}`,
      { id: postId },
      jsonInit("PATCH", { showOnTimeline: true }),
    );

    expect(response.status).toBe(403);
    expect(await codeOf(response)).toBe("FORBIDDEN");
  });

  it("🔴 `DELETE` 403 alır və paylaşım qalır", async () => {
    currentViewer = classmate;
    const { DELETE } = await import("@/app/api/v1/posts/[id]/route");

    const response = await call(
      DELETE,
      `/api/v1/posts/${postId}`,
      { id: postId },
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);

    const row = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
      select: { status: true },
    });
    expect(row.status).toBe("ACTIVE");
  });
});

// ---------------------------------------------------------------------------
// 4. Qapılar: məzmun tipi, doğrulama, sayğac
// ---------------------------------------------------------------------------

describe("yazma qapıları", () => {
  it("🔴 `POST` JSON olmayan sorğuda 415 alır (TƏLƏ B — cross-site form)", async () => {
    currentViewer = author;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/posts`,
      { slug: ownSlug },
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "kind=TEXT",
      },
    );

    expect(response.status).toBe(415);
    expect(await codeOf(response)).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("naməlum `kind` 422 və AZƏRBAYCANCA detal verir", async () => {
    currentViewer = author;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/posts`,
      { slug: ownSlug },
      jsonInit("POST", { ...draft("Səhv növ."), kind: "TELEPATHY" }),
    );

    expect(response.status).toBe(422);

    const body = (await response.json()) as {
      error: { code: string; details: Array<{ path: string; message: string }> };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details.some((d) => d.path === "kind")).toBe(true);
  });

  it("🔴 çarpaz qayda tətbiq olunur: `kind = TEXT` boş mətnlə keçmir", async () => {
    // Qayda `features/feed/schemas.ts` → `postContentRules`-dədir və forma ilə
    // EYNİ funksiyadır. Ayrı yazsaydıq eyni gövdə brauzerdə düşüb REST-də
    // keçərdi.
    currentViewer = author;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/posts`,
      { slug: ownSlug },
      jsonInit("POST", draft("")),
    );

    expect(response.status).toBe(422);
  });

  it("🔴 nailiyyət detalı olmadan `showInAchievements` keçmir (422)", async () => {
    currentViewer = author;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${ownSlug}/posts`,
      { slug: ownSlug },
      jsonInit("POST", { ...draft("Nailiyyət detalsız."), showInAchievements: true }),
    );

    expect(response.status).toBe(422);
  });

  it("🔴 sayğac həddi aşılanda 429 + `Retry-After` gəlir", async () => {
    // Limitsiz yazma endpoint-i spam qapısıdır — bu, təhlükəsizlik tələbidir.
    currentViewer = author;
    const { DELETE } = await import("@/app/api/v1/posts/[id]/route");

    // `DELETE` seçilib, çünki mövcud olmayan id ilə də sayğac ARTIR: qapı
    // doğrulamadan ƏVVƏLDİR və baza toxunulmur.
    let last: Response | null = null;
    for (let i = 0; i < 25; i += 1) {
      last = await call(DELETE, "/api/v1/posts/yoxdur", { id: "yoxdur" }, {
        method: "DELETE",
      });
      if (last.status === 429) break;
    }

    expect(last?.status).toBe(429);
    expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await codeOf(last as Response)).toBe("TOO_MANY_REQUESTS");
  });

  it("🔴 anonim sorğu yazma endpoint-lərində 401 alır", async () => {
    currentViewer = ANONYMOUS;
    const { POST } = await import("@/app/api/v1/cohorts/[slug]/posts/route");

    const response = await call(
      POST,
      `/api/v1/cohorts/${foreignSlug}/posts`,
      { slug: foreignSlug },
      jsonInit("POST", draft("Anonim cəhd.")),
    );

    expect(response.status).toBe(401);
    expect(await codeOf(response)).toBe("UNAUTHENTICATED");
  });
});
