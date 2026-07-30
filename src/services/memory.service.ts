// ============================================================================
// src/services/memory.service.ts
// Share Memories [M9] — oxu VƏ yazma sorğuları (spec §11).
//
// Model: `Memory` · sahib sütunu: `authorId` · status: `ACTIVE` →
// `activeVisibleWhere` (Post ilə eyni ailə).
//
// ⚠️ `Memory`-nin DÖRD AYRICA göstərilmə seçimi var (`showInProfile`,
// `showInFeed`, `showInTimeline`, `showInYearbook`) və bunlar görünürlük
// SƏVİYYƏSİNDƏN fərqlidir: səviyyə "kim görə bilər", bu bayraqlar isə "harada
// göstərilir" sualına cavab verir. İkisi birlikdə tətbiq olunur.
//
// ============================================================================
// 🔴 TƏLƏ A — `showInTimeline` SXEM MƏHDUDİYYƏTİ (Blok 10A qərarı)
// ============================================================================
// `TimelineEntry.sourceType` yalnız POST | ACHIEVEMENT | EVENT | SYSTEM qəbul
// edir və `TimelineEntry`-də Memory-yə FK YOXDUR. Yəni xatirə xronologiyaya
// ANCAQ bağlı Post vasitəsilə (`Memory.postId`) düşə bilər.
//
// `sourceType`-a "MEMORY" ƏLAVƏ EDİLMƏDİ. Səbəb: yeni miqrasiya + yeni FK +
// `timelineVisibilityWhere`-in sahib şaxəsinə müdaxilə (C ailəsi köməkçisi) —
// üçü də Blok 3-ün üç qat qorumasını riskə atardı.
//
// ƏVƏZİNDƏ:
//   · `showInTimeline` yalnız `showInFeed` açıq olduqda seçilə bilir
//     (UI-da `disabled`, SERVERDƏ Zod `refine` — bax `features/memories/
//     schemas.ts`; UI qoruma sayılmır),
//   · `showInFeed` açıqdırsa xatirə ilə birlikdə EYNİ TRANSAKSİYADA Post
//     yaranır (kind: MEMORY, eyni visibility, eyni occurredAt) və
//     `Memory.postId` bağlanır,
//   · `showInTimeline` açıqdırsa Blok 4-ün yayılma köməkçisi
//     (`buildTimelineEntry`) ÇAĞIRILIR — məntiq kopyalanmır,
//   · `showInFeed` sonradan söndürülərsə Post SOFT-DELETE olunur
//     (`status = DELETED`) və `timelineEntry.deleteMany({ postId })` işə düşür
//     (T4 nümunəsi — soft delete-də cascade İŞLƏMİR).
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  ContentStatus,
  MediaType,
  PostCategory,
  PostKind,
  PostStatus,
  type MemoryType,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { activeVisibleWhere, canModerate, type Viewer } from "@/lib/visibility";
import type { AuthenticatedViewer } from "@/lib/viewer";
import { buildTimelineEntry } from "@/features/feed/fanout";

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
  /** "Sevimli yer" körpüsü (Blok 7B — M9 ↔ M3). */
  guidePlaceId: string | null;
  /** Lentdə də paylaşılıbsa bağlı postun `id`-si (TƏLƏ A). */
  postId: string | null;
  showInProfile: boolean;
  showInFeed: boolean;
  showInTimeline: boolean;
  showInYearbook: boolean;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; slug: string; displayName: string };
  guidePlace: { id: string; title: string; category: string } | null;
}

export interface MemoryFilters {
  cohortId?: string;
  authorId?: string;
  type?: MemoryType;
  /** Yerləşdirmə yerinə görə süzgəc — Memory-nin 4 göstərilmə seçimi. */
  surface?: "profile" | "feed" | "timeline" | "yearbook";
  /** Xankəndi bələdçisindəki konkret məkana bağlı xatirələr (Blok 7B). */
  guidePlaceId?: string;
  /** `true` → yalnız hər hansı məkana bağlı olanlar (spec §11 «sevimli yer»). */
  placeOnly?: boolean;
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
  guidePlaceId: true,
  postId: true,
  showInProfile: true,
  showInFeed: true,
  showInTimeline: true,
  showInYearbook: true,
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  cohort: { select: { id: true, slug: true, displayName: true } },
  guidePlace: { select: { id: true, title: true, category: true } },
} satisfies Prisma.MemorySelect;

/**
 * Görünürlük + `DELETED` qoruyucusu (Post-dakı `visiblePostWhere` ilə eyni).
 *
 * ⚠️ `activeVisibleWhere` status filtrini SAHİBƏ tətbiq etmir (qəsdən —
 * istifadəçi öz `SUBMITTED` nailiyyətini görməlidir). `Memory` üçün bunun yan
 * təsiri var: müəllif öz SOFT-DELETE edilmiş xatirəsini albomda və siyahıda
 * görərdi. Silinmiş xatirə HEÇ KİMƏ görünməməlidir, ona görə açıq
 * `NOT DELETED` şərti əlavə olunur — yenə DB səviyyəsində.
 *
 * 🔴 Yeni xatirə sorğusu yazırsansa `activeVisibleWhere`-i TƏK BAŞINA çağırma —
 * bu köməkçidən keç.
 */
function visibleMemoryWhere(
  viewer: Viewer,
  extra?: Prisma.MemoryWhereInput,
): Prisma.MemoryWhereInput {
  return {
    AND: [
      { status: { not: ContentStatus.DELETED } },
      activeVisibleWhere<Prisma.MemoryWhereInput>(viewer, "authorId"),
      ...(extra ? [extra] : []),
    ],
  };
}

/** Filtrləri Prisma şərtinə çevirir — görünürlük şərti HƏMİŞƏ birincidir. */
function memoryWhere(viewer: Viewer, filters: MemoryFilters): Prisma.MemoryWhereInput {
  return {
    AND: [
      visibleMemoryWhere(viewer),
      ...(filters.cohortId ? [{ cohortId: filters.cohortId }] : []),
      ...(filters.authorId ? [{ authorId: filters.authorId }] : []),
      ...(filters.type ? [{ type: filters.type }] : []),
      ...(filters.surface ? [{ [SURFACE_FIELD[filters.surface]]: true }] : []),
      ...(filters.guidePlaceId ? [{ guidePlaceId: filters.guidePlaceId }] : []),
      ...(filters.placeOnly ? [{ guidePlaceId: { not: null } }] : []),
    ],
  };
}

export async function listMemories(
  viewer: Viewer,
  filters: MemoryFilters = {},
): Promise<MemoryItem[]> {
  return prisma.memory.findMany({
    where: memoryWhere(viewer, filters),
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: filters.take ?? MEMORY_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: MEMORY_SELECT,
  });
}

/** Səhifələmə üçün ümumi say — EYNİ görünürlük şərtindən keçir. */
export async function countMemories(
  viewer: Viewer,
  filters: MemoryFilters = {},
): Promise<number> {
  return prisma.memory.count({ where: memoryWhere(viewer, filters) });
}

/** Tək xatirə. Görünmürsə `null`. */
export async function getMemory(viewer: Viewer, memoryId: string): Promise<MemoryItem | null> {
  return prisma.memory.findFirst({
    where: {
      AND: [{ id: memoryId }, visibleMemoryWhere(viewer)],
    },
    select: MEMORY_SELECT,
  });
}

// ---------------------------------------------------------------------------
// Digital Yearbook (spec §11 — «gələcək Digital Yearbook»)
// ---------------------------------------------------------------------------

/**
 * Albom üçün seçilmiş xatirələr — TƏK sorğu.
 *
 * 🔴 İKİ ŞƏRT BİRLİKDƏ: `activeVisibleWhere(viewer, "authorId")` (kim görə
 * bilər) VƏ `showInYearbook: true` (müəllif albomu seçib). Biri digərini ƏVƏZ
 * ETMİR: `PRIVATE` xatirə albom üçün işarələnsə də yalnız sahibinə görünür.
 *
 * Bölmələrə paylama SAF `lib/yearbook.ts` modulundadır — servis yalnız
 * sıralanmış siyahını verir (xronoloji: köhnədən yeniyə, albom belə oxunur).
 */
export async function listYearbook(
  viewer: Viewer,
  cohortId: string,
): Promise<MemoryItem[]> {
  return prisma.memory.findMany({
    where: {
      AND: [visibleMemoryWhere(viewer), { cohortId }, { showInYearbook: true }],
    },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: MEMORY_SELECT,
  });
}

// ---------------------------------------------------------------------------
// Xankəndi bələdçisi körpüsü (M9 ↔ M3)
// ---------------------------------------------------------------------------

/** `listMemoriesForPlace` çıxışı — bələdçi kartı üçün dar forma. */
export interface PlaceMemoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  occurredAt: Date;
  visibility: string;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; slug: string; displayName: string };
}

export const PLACE_MEMORY_LIMIT = 3;

/**
 * Konkret məkana bağlı xatirələr — Xankəndi bələdçisi səhifəsi üçün.
 *
 * 🔴 GÖRÜNÜRLÜK MƏCBURİDİR, MƏKAN FİLTRİ ONU ƏVƏZ ETMİR.
 * Bələdçi səhifəsi Blok 11-də İCTİMAİ olacaq, yəni bu funksiya ANONİM viewer
 * ilə də çağırılacaq. `guidePlaceId` şərti "hansı məkan" sualına cavab verir,
 * "kim görə bilər" sualına yox — `activeVisibleWhere` olmasaydı `CLASS` və
 * `PRIVATE` xatirələr məkan səhifəsi üzərindən ictimai internetə sızardı.
 * Bu, `tests/integration/memories.db.test.ts`-də ayrıca testlə bərkidilib.
 */
export async function listMemoriesForPlace(
  viewer: Viewer,
  guidePlaceId: string,
  take: number = PLACE_MEMORY_LIMIT,
): Promise<PlaceMemoryItem[]> {
  return prisma.memory.findMany({
    where: {
      AND: [visibleMemoryWhere(viewer), { guidePlaceId }],
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      imageUrl: true,
      occurredAt: true,
      visibility: true,
      author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      cohort: { select: { id: true, slug: true, displayName: true } },
    },
  });
}

/** Məkana bağlı GÖRÜNƏN xatirə sayı — "hamısı" linkinin yanındakı rəqəm. */
export async function countMemoriesForPlace(
  viewer: Viewer,
  guidePlaceId: string,
): Promise<number> {
  return prisma.memory.count({
    where: {
      AND: [visibleMemoryWhere(viewer), { guidePlaceId }],
    },
  });
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

export type MemoryMutationFailure =
  | "NOT_A_MEMBER"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "PLACE_NOT_FOUND"
  | "TIMELINE_REQUIRES_FEED";

export type MemoryMutationResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; reason: MemoryMutationFailure };

export interface MemoryWriteData {
  type: MemoryType;
  title: string;
  body: string;
  dedicatedTo: string | null;
  imageUrl: string | null;
  /** ⚠️ ARTIQ ÇEVRİLMİŞ: sətir → `Date` server action-dadır (T3). */
  occurredAt: Date;
  guidePlaceId: string | null;
  visibility: VisibilityType;
  showInProfile: boolean;
  showInFeed: boolean;
  showInTimeline: boolean;
  showInYearbook: boolean;
}

export interface CreateMemoryData extends MemoryWriteData {
  cohortId: string;
}

/** Viewer həmin cohort-un üzvüdürmü? — token-ə deyil, BAZAYA baxılır. */
async function assertMembership(
  viewer: AuthenticatedViewer,
  cohortId: string,
): Promise<boolean> {
  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: viewer.userId, cohortId } },
    select: { userId: true },
  });
  return membership !== null;
}

/** Seçilmiş məkan həqiqətən mövcuddurmu? (FK səhvi əvəzinə aydın cavab) */
async function assertPlace(guidePlaceId: string | null): Promise<boolean> {
  if (guidePlaceId === null) return true;
  const place = await prisma.guidePlace.findUnique({
    where: { id: guidePlaceId },
    select: { id: true },
  });
  return place !== null;
}

/**
 * Xatirənin lentdəki Post-u üçün kateqoriya.
 *
 * ⚠️ `PostCategory` və `MemoryType` AYRI siyahılardır (bax
 * `features/feed/catalog.ts` başlığı) — növü birbaşa kateqoriya kimi yazmaq
 * olmaz, xronologiya filtri 12 `PostCategory` üzərində qurulub. Xatirə
 * paylaşımı həmişə "Ümumi"dir; istifadəçi daha dəqiq kateqoriya istəyirsə
 * lentdən paylaşım yaradır.
 */
const MEMORY_POST_CATEGORY = PostCategory.GENERAL;

/** Lentdəki Post-un `body`-si — xatirənin başlığı + mətni. */
function memoryPostBody(data: MemoryWriteData): string {
  return `${data.title}\n\n${data.body}`;
}

/**
 * Xatirə yaradır və seçilmiş səthlərə yayır (TƏK TRANSAKSİYA).
 *
 * ```
 * Memory
 *   ├─ showInFeed     → Post (kind: MEMORY, eyni visibility/occurredAt)
 *   └─ showInTimeline → TimelineEntry (post üzərindən — TƏLƏ A)
 * ```
 *
 * ⚠️ `cohortId` müştəridən GƏLİR, amma ona GÜVƏNİLMİR: üzvlük DB-dən yenidən
 * yoxlanılır. `authorId` heç vaxt müştəridən gəlmir — viewer-dəndir.
 *
 * ⚠️ `TIMELINE_REQUIRES_FEED` ikinci qapıdır: Zod sxemi eyni qaydanı tətbiq
 * edir, amma servis birbaşa da çağırıla bilər (v1 yazma səthi gələndə).
 */
export async function createMemory(
  viewer: AuthenticatedViewer,
  data: CreateMemoryData,
): Promise<MemoryMutationResult<{ memoryId: string }>> {
  if (data.showInTimeline && !data.showInFeed) {
    return { ok: false, reason: "TIMELINE_REQUIRES_FEED" };
  }
  if (!(await assertMembership(viewer, data.cohortId))) {
    return { ok: false, reason: "NOT_A_MEMBER" };
  }
  if (!(await assertPlace(data.guidePlaceId))) {
    return { ok: false, reason: "PLACE_NOT_FOUND" };
  }

  const memoryId = await prisma.$transaction(async (tx) => {
    const postId = data.showInFeed
      ? await createLinkedPost(tx, viewer.userId, data.cohortId, data)
      : null;

    const memory = await tx.memory.create({
      data: {
        authorId: viewer.userId,
        cohortId: data.cohortId,
        postId,
        type: data.type,
        title: data.title,
        body: data.body,
        dedicatedTo: data.dedicatedTo,
        imageUrl: data.imageUrl,
        guidePlaceId: data.guidePlaceId,
        visibility: data.visibility,
        status: ContentStatus.ACTIVE,
        occurredAt: data.occurredAt,
        showInProfile: data.showInProfile,
        showInFeed: data.showInFeed,
        showInTimeline: data.showInTimeline,
        showInYearbook: data.showInYearbook,
      },
      select: { id: true },
    });

    return memory.id;
  });

  return { ok: true, value: { memoryId } };
}

/**
 * Lentdəki Post-u (və istənilirsə TimelineEntry-ni) yaradır.
 *
 * ⚠️ `buildTimelineEntry` Blok 4-ün YAYILMA KÖMƏKÇİSİDİR və burada yenidən
 * işlədilir — başlıq/xülasə/akademik il/görünürlük məntiqi KOPYALANMIR.
 */
async function createLinkedPost(
  tx: Prisma.TransactionClient,
  authorId: string,
  cohortId: string,
  data: MemoryWriteData,
): Promise<string> {
  const post = await tx.post.create({
    data: {
      authorId,
      cohortId,
      category: MEMORY_POST_CATEGORY,
      kind: PostKind.MEMORY,
      body: memoryPostBody(data),
      visibility: data.visibility,
      showOnTimeline: data.showInTimeline,
      showInAchievements: false,
      occurredAt: data.occurredAt,
      status: PostStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (data.imageUrl) {
    await tx.mediaAsset.create({
      data: {
        postId: post.id,
        url: data.imageUrl,
        type: MediaType.IMAGE,
        order: 0,
      },
    });
  }

  if (data.showInTimeline) {
    await tx.timelineEntry.create({
      data: buildTimelineEntry(post.id, cohortId, {
        category: MEMORY_POST_CATEGORY,
        visibility: data.visibility,
        occurredAt: data.occurredAt,
        body: data.body,
        memoryTitle: data.title,
      }),
    });
  }

  return post.id;
}

export interface UpdateMemoryData extends MemoryWriteData {
  memoryId: string;
}

/**
 * Xatirəni redaktə edir və göstərilmə səthlərini yenidən qurur.
 *
 * 🔴 SƏTHLƏRİN KEÇİDLƏRİ (TƏLƏ A-nın ikinci yarısı):
 *   feed OFF → ON : Post yaranır (varsa yenilənir), `Memory.postId` bağlanır
 *   feed ON  → OFF: Post SOFT-DELETE (`status = DELETED`) +
 *                   `timelineEntry.deleteMany({ postId })`.
 *                   ⚠️ Soft delete-də `onDelete: Cascade` İŞLƏMİR — sətir
 *                   qalır, ona görə xronologiya qeydi ƏL İLƏ silinir (T4).
 *   timeline ON/OFF: `upsert` / `deleteMany` (T11 — `postId` @unique).
 *
 * ⚠️ Redaktə YALNIZ MÜƏLLİFİNDİR. Moderator məzmunu SİLƏ bilər (`deleteMemory`),
 * amma başqasının xatirəsini yazmır — bu, redaktə deyil, saxtakarlıq olardı.
 */
export async function updateMemory(
  viewer: AuthenticatedViewer,
  data: UpdateMemoryData,
): Promise<MemoryMutationResult> {
  if (data.showInTimeline && !data.showInFeed) {
    return { ok: false, reason: "TIMELINE_REQUIRES_FEED" };
  }

  const memory = await prisma.memory.findUnique({
    where: { id: data.memoryId },
    select: { id: true, authorId: true, cohortId: true, postId: true, status: true },
  });

  if (!memory || memory.status !== ContentStatus.ACTIVE) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  if (memory.authorId !== viewer.userId) return { ok: false, reason: "FORBIDDEN" };
  if (!(await assertPlace(data.guidePlaceId))) {
    return { ok: false, reason: "PLACE_NOT_FOUND" };
  }

  await prisma.$transaction(async (tx) => {
    let postId = memory.postId;

    if (data.showInFeed) {
      if (postId === null) {
        postId = await createLinkedPost(tx, viewer.userId, memory.cohortId, data);
      } else {
        await tx.post.update({
          where: { id: postId },
          data: {
            body: memoryPostBody(data),
            visibility: data.visibility,
            occurredAt: data.occurredAt,
            showOnTimeline: data.showInTimeline,
            status: PostStatus.ACTIVE,
          },
        });

        if (data.showInTimeline) {
          const entry = buildTimelineEntry(postId, memory.cohortId, {
            category: MEMORY_POST_CATEGORY,
            visibility: data.visibility,
            occurredAt: data.occurredAt,
            body: data.body,
            memoryTitle: data.title,
          });
          // T11: `TimelineEntry.postId` @unique → `create` ikinci dəfə P2002
          // verir; bayraq açılıb-bağlana bilər, ona görə `upsert`.
          await tx.timelineEntry.upsert({
            where: { postId },
            create: entry,
            update: entry,
          });
        } else {
          await tx.timelineEntry.deleteMany({ where: { postId } });
        }
      }
    } else if (postId !== null) {
      // Lentdən çıxarılır: Post soft-delete + törəmə xronologiya qeydi silinir.
      await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.DELETED },
      });
      await tx.timelineEntry.deleteMany({ where: { postId } });
      postId = null;
    }

    await tx.memory.update({
      where: { id: data.memoryId },
      data: {
        postId,
        type: data.type,
        title: data.title,
        body: data.body,
        dedicatedTo: data.dedicatedTo,
        imageUrl: data.imageUrl,
        guidePlaceId: data.guidePlaceId,
        visibility: data.visibility,
        occurredAt: data.occurredAt,
        showInProfile: data.showInProfile,
        showInFeed: data.showInFeed,
        showInTimeline: data.showInTimeline,
        showInYearbook: data.showInYearbook,
      },
    });
  });

  return { ok: true, value: undefined };
}

/**
 * Xatirəni SOFT-DELETE edir (`status = DELETED`).
 *
 * ⚠️ Sətir qalır, yəni `onDelete: Cascade` işə DÜŞMÜR — bağlı Post və
 * TimelineEntry eyni transaksiyada ƏL İLƏ təmizlənir (T4).
 *
 * Müəllif və moderator silə bilər (`canModerate` — sinif səviyyəsi).
 */
export async function deleteMemory(
  viewer: AuthenticatedViewer,
  memoryId: string,
): Promise<MemoryMutationResult> {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    select: {
      id: true,
      authorId: true,
      cohortId: true,
      postId: true,
      status: true,
      visibility: true,
    },
  });

  if (!memory || memory.status !== ContentStatus.ACTIVE) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const isOwner = memory.authorId === viewer.userId;
  const moderates = canModerate(viewer, {
    ownerId: memory.authorId,
    cohortId: memory.cohortId,
    visibility: memory.visibility,
  });

  if (!isOwner && !moderates) return { ok: false, reason: "FORBIDDEN" };

  await prisma.$transaction(async (tx) => {
    await tx.memory.update({
      where: { id: memoryId },
      data: { status: ContentStatus.DELETED },
    });

    if (memory.postId !== null) {
      await tx.post.update({
        where: { id: memory.postId },
        data: { status: PostStatus.DELETED },
      });
      await tx.timelineEntry.deleteMany({ where: { postId: memory.postId } });
    }
  });

  return { ok: true, value: undefined };
}

/** Redaktə formasının başlanğıc dəyərləri — YALNIZ müəllifə. */
export async function getMemoryDraft(
  viewer: AuthenticatedViewer,
  memoryId: string,
): Promise<MemoryItem | null> {
  return prisma.memory.findFirst({
    where: { id: memoryId, authorId: viewer.userId, status: ContentStatus.ACTIVE },
    select: MEMORY_SELECT,
  });
}
