// ============================================================================
// src/services/post.service.ts
// Class Feed — oxu VƏ yazma sorğuları.
//
// Model: `Post` · sahib sütunu: `authorId` · status: `ACTIVE` (ilə
// `activeVisibleWhere`). Bax `src/lib/visibility.ts` başındakı cədvəl.
//
// Blok 3 → oxu (listFeed, getPost). Blok 4 → yazma (createPost,
// updatePostSurfaces, deletePost, toggleReaction, createComment,
// deleteComment) + şərh oxusu.
//
// 🔴 Bütün Prisma girişi BU FAYLDADIR. Server action-lar (features/feed/
// actions.ts) və route handler-lər (app/api/feed) buradan çağırır, `prisma.*`-a
// birbaşa toxunmur (CLAUDE.md §4).
// ============================================================================

import type { Prisma } from "@prisma/client";

import { AUTHOR_SELECT, toAuthorCard, type AuthorCard } from "@/lib/author-card";
import { prisma } from "@/lib/db";
import {
  AchievementStatus,
  AuditAction,
  ContentStatus,
  NotificationEntityType,
  NotificationType,
  PostKind,
  PostStatus,
  Visibility,
  type PostCategory,
  type PostKind as PostKindType,
  type ReactionType,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { tokenizedContains } from "@/lib/text-search";
import { recordAudit } from "@/services/audit.service";
import {
  activeVisibleWhere,
  canModerate,
  type Viewer,
} from "@/lib/visibility";
import {
  buildAchievement,
  buildTimelineEntry,
  derivedVisibility,
  type AchievementFanoutInput,
  type PostFanoutSource,
} from "@/features/feed/fanout";

// ---------------------------------------------------------------------------
// Oxu tipləri
// ---------------------------------------------------------------------------

/**
 * ⚠️ `avatarUrl` İDARƏ OLUNAN sahədir — kart `toAuthorCard()`-dan keçir
 * (`lib/author-card.ts`, TƏLƏ T40). Şəkli gizlədən müəllif lentdə baş
 * hərfləri ilə görünür.
 */
export type FeedAuthor = AuthorCard;

export interface FeedMedia {
  id: string;
  url: string;
  thumbUrl: string | null;
  type: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export interface FeedPost {
  id: string;
  category: string;
  kind: string;
  body: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkImage: string | null;
  visibility: string;
  occurredAt: Date;
  createdAt: Date;
  showOnTimeline: boolean;
  showInAchievements: boolean;
  author: FeedAuthor;
  cohort: { id: string; slug: string; displayName: string };
  media: FeedMedia[];
  commentCount: number;
  reactionCount: number;
  /** Reaksiya növü → say. Sıfır olan növlər siyahıda OLMUR. */
  reactionCounts: Record<string, number>;
  /** Viewer-in öz reaksiyası — yoxdursa `null`. */
  viewerReaction: string | null;
  /** Viewer müəllifdirmi? (redaktə / silmə menyusu) */
  isOwner: boolean;
  /** Viewer moderasiya edə bilirmi? Müəllif üçün `false` — o, sahib yolu ilə gedir. */
  canModerate: boolean;
  referencedEvent: { id: string; title: string; startsAt: Date; location: string | null } | null;
  achievement: {
    id: string;
    category: string;
    title: string;
    organization: string | null;
    proofUrl: string | null;
    awardedAt: Date;
    status: string;
  } | null;
  memory: { id: string; type: string; title: string; dedicatedTo: string | null } | null;
}

export interface FeedFilters {
  cohortId?: string;
  category?: PostCategory;
  /** Əvvəlki səhifənin son post `id`-si. */
  cursor?: string | null;
  take?: number;
}

export interface FeedPage {
  items: FeedPost[];
  /** `null` olarsa daha məlumat yoxdur. */
  nextCursor: string | null;
}

const FEED_PAGE_SIZE = 20;

/**
 * ⚠️ `reactions` burada `where` OLMADAN təyin olunub — sorğu anında viewer-in
 * `userId`-si ilə süzülür (`viewerReactionFilter`). Payload TİPİ `where`-dən
 * asılı olmadığı üçün `FeedRow` sabit qalır.
 */
const FEED_SELECT = {
  id: true,
  category: true,
  kind: true,
  body: true,
  linkUrl: true,
  linkTitle: true,
  linkImage: true,
  visibility: true,
  occurredAt: true,
  createdAt: true,
  showOnTimeline: true,
  showInAchievements: true,
  authorId: true,
  cohortId: true,
  // ⚠️ TƏLƏ T40 — xam `avatarUrl: true` YAZMA; kart redaksiyadan keçməlidir.
  author: { select: AUTHOR_SELECT },
  cohort: { select: { id: true, slug: true, displayName: true } },
  media: {
    select: {
      id: true,
      url: true,
      thumbUrl: true,
      type: true,
      caption: true,
      width: true,
      height: true,
    },
    orderBy: { order: "asc" },
  },
  referencedEvent: { select: { id: true, title: true, startsAt: true, location: true } },
  achievement: {
    select: {
      id: true,
      category: true,
      title: true,
      organization: true,
      proofUrl: true,
      awardedAt: true,
      status: true,
    },
  },
  memory: { select: { id: true, type: true, title: true, dedicatedTo: true } },
  reactions: { select: { type: true } },
  // Silinmiş şərhlər sayılmır — kartda "3 şərh" yazıb ikisini göstərmək olmaz.
  _count: {
    select: {
      comments: { where: { status: { not: ContentStatus.DELETED } } },
      reactions: true,
    },
  },
} satisfies Prisma.PostSelect;

type FeedRow = Prisma.PostGetPayload<{ select: typeof FEED_SELECT }>;

/**
 * Viewer-in öz reaksiyasını çəkmək üçün şərt.
 * ANONYMOUS-un reaksiyası ola BİLMƏZ → heç bir sətrə uyğun gəlməyən `userId`.
 */
function viewerReactionFilter(viewer: Viewer): Prisma.ReactionWhereInput {
  return { userId: viewer.kind === "USER" ? viewer.userId : "" };
}

function feedSelectFor(viewer: Viewer) {
  return {
    ...FEED_SELECT,
    reactions: { ...FEED_SELECT.reactions, where: viewerReactionFilter(viewer) },
  } satisfies Prisma.PostSelect;
}

function toFeedPost(
  row: FeedRow,
  viewer: Viewer,
  reactionCounts: Record<string, number>,
): FeedPost {
  const { _count, reactions, authorId, cohortId, author, ...rest } = row;

  const isOwner = viewer.kind === "USER" && viewer.userId === authorId;

  return {
    ...rest,
    // TƏLƏ T40 — sahə-səviyyə redaksiyası burada tətbiq olunur.
    author: toAuthorCard(author, viewer),
    commentCount: _count.comments,
    reactionCount: _count.reactions,
    reactionCounts,
    viewerReaction: reactions[0]?.type ?? null,
    isOwner,
    // Sahib «moderator» kimi göstərilmir — onun öz yolu var və moderasiya
    // AuditLog tələb edir (bax `deletePost`).
    canModerate:
      !isOwner &&
      canModerate(viewer, {
        ownerId: authorId,
        cohortId,
        visibility: row.visibility,
      }),
  };
}

/**
 * Reaksiya növlərinin sayı — TƏK aqreqasiya sorğusu ilə.
 *
 * `postIds` artıq görünürlük süzgəcindən keçmiş nəticədən gəlir, yəni burada
 * əlavə məxfilik şərti lazım deyil — görünməyən postun id-si bu siyahıya
 * düşmür.
 */
async function reactionBreakdown(
  postIds: string[],
): Promise<Map<string, Record<string, number>>> {
  const result = new Map<string, Record<string, number>>();
  if (postIds.length === 0) return result;

  const rows = await prisma.reaction.groupBy({
    by: ["postId", "type"],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    const bucket = result.get(row.postId) ?? {};
    bucket[row.type] = row._count._all;
    result.set(row.postId, bucket);
  }

  return result;
}

/**
 * Görünürlük + `DELETED` qoruyucusu.
 *
 * ⚠️ `activeVisibleWhere` status filtrini SAHİBƏ tətbiq etmir (qəsdən —
 * istifadəçi öz `SUBMITTED` nailiyyətini görməlidir). `Post` üçün bunun bir
 * yan təsiri var: müəllif öz SOFT-DELETE edilmiş postunu görərdi. Silinmiş
 * post heç kimə görünməməlidir, ona görə burada açıq `NOT DELETED` şərti
 * əlavə olunur — yenə DB səviyyəsində.
 *
 * 🔴 Yeni post sorğusu yazırsansa `activeVisibleWhere`-i TƏK BAŞINA çağırma —
 * bu köməkçidən keç.
 */
function visiblePostWhere(viewer: Viewer, extra?: Prisma.PostWhereInput): Prisma.PostWhereInput {
  return {
    AND: [
      { status: { not: PostStatus.DELETED } },
      activeVisibleWhere<Prisma.PostWhereInput>(viewer, "authorId"),
      ...(extra ? [extra] : []),
    ],
  };
}

/**
 * Sinif lenti — kursor əsaslı səhifələmə.
 *
 * Kursor `createdAt desc, id desc` sırasına bağlıdır: eyni millisaniyədə
 * yaradılmış iki post arasında `id` sabit sıra verir, yoxsa səhifə sərhədində
 * qeyd təkrarlana və ya itə bilər.
 */
export async function listFeed(viewer: Viewer, filters: FeedFilters = {}): Promise<FeedPage> {
  const take = filters.take ?? FEED_PAGE_SIZE;

  const rows = await prisma.post.findMany({
    where: visiblePostWhere(viewer, {
      ...(filters.cohortId ? { cohortId: filters.cohortId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    }),
    select: feedSelectFor(viewer),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // Növbəti səhifənin olub-olmadığını bilmək üçün bir artıq sətir çəkilir.
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  const counts = await reactionBreakdown(page.map((row) => row.id));

  return {
    items: page.map((row) => toFeedPost(row, viewer, counts.get(row.id) ?? {})),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}

/**
 * Qlobal axtarışın paylaşım bölməsi [M16].
 *
 * Süzgəc `visiblePostWhere`-dən keçir — yəni görünürlük və `DELETED` qoruyucusu
 * eynidir, axtarış YALNIZ əlavə bir mətn şərtidir. Ayrı sorğu yazıb məxfiliyi
 * təkrar qurmaq qadağandır (CLAUDE.md §5).
 *
 * 🔴 TƏLƏ T14: SQLite-da `mode: "insensitive"` yoxdur — `tokenizedContains`
 * hərf variantlarını özü qurur (`lib/text-search.ts`).
 */
export async function searchPosts(
  viewer: Viewer,
  term: string,
  take: number,
): Promise<FeedPost[]> {
  const textWhere = tokenizedContains<Prisma.PostWhereInput>(
    ["body", "linkTitle"],
    term,
  );
  if (textWhere === null) return [];

  const rows = await prisma.post.findMany({
    where: visiblePostWhere(viewer, textWhere),
    select: feedSelectFor(viewer),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });

  const counts = await reactionBreakdown(rows.map((row) => row.id));
  return rows.map((row) => toFeedPost(row, viewer, counts.get(row.id) ?? {}));
}

/** Tək post. Görünmürsə `null` — "yoxdur" və "icazə yoxdur" ayırd edilmir. */
export async function getPost(viewer: Viewer, postId: string): Promise<FeedPost | null> {
  const row = await prisma.post.findFirst({
    where: visiblePostWhere(viewer, { id: postId }),
    select: feedSelectFor(viewer),
  });

  if (!row) return null;

  const counts = await reactionBreakdown([row.id]);
  return toFeedPost(row, viewer, counts.get(row.id) ?? {});
}

// ---------------------------------------------------------------------------
// Şərhlər — oxu
// ---------------------------------------------------------------------------

export interface FeedComment {
  id: string;
  body: string;
  createdAt: Date;
  parentId: string | null;
  author: FeedAuthor;
  isOwner: boolean;
  canModerate: boolean;
}

/**
 * Bir postun şərhləri (bir səviyyəli cavablarla — `parentId`).
 *
 * ⚠️ Post-un görünürlüyü şərh sorğusuna DA tətbiq olunur (`post:
 * visiblePostWhere(...)`). Əks halda görünməyən postun şərhləri id ilə
 * oxunardı — mətn sızması.
 */
export async function listComments(viewer: Viewer, postId: string): Promise<FeedComment[]> {
  const rows = await prisma.comment.findMany({
    where: {
      postId,
      status: { not: ContentStatus.DELETED },
      post: visiblePostWhere(viewer),
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      body: true,
      createdAt: true,
      parentId: true,
      authorId: true,
      // ⚠️ TƏLƏ T40 — şərh müəllifinin şəkli də redaksiyadan keçir.
      author: { select: AUTHOR_SELECT },
      post: { select: { cohortId: true, visibility: true } },
    },
  });

  return rows.map((row) => {
    const isOwner = viewer.kind === "USER" && viewer.userId === row.authorId;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      parentId: row.parentId,
      author: toAuthorCard(row.author, viewer),
      isOwner,
      canModerate:
        !isOwner &&
        canModerate(viewer, {
          ownerId: row.authorId,
          cohortId: row.post.cohortId,
          visibility: row.post.visibility,
        }),
    };
  });
}

// ---------------------------------------------------------------------------
// Yazma — ortaq tiplər
// ---------------------------------------------------------------------------

/** Giriş etmiş istifadəçi — yazma əməliyyatları anonimə açıq deyil. */
type UserViewer = Extract<Viewer, { kind: "USER" }>;

export type PostMutationFailure =
  | "NOT_A_MEMBER"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "EVENT_NOT_FOUND"
  | "ACHIEVEMENT_DETAILS_REQUIRED";

export type PostMutationResult<T = null> =
  | { ok: true; value: T }
  | { ok: false; reason: PostMutationFailure };

export interface MediaAssetData {
  url: string;
  thumbUrl: string | null;
  type: string;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  order: number;
}

export interface MemoryData {
  type: string;
  title: string;
  body: string;
  dedicatedTo: string | null;
}

/**
 * `createPost` girişi — ARTIQ NORMALLAŞDIRILMIŞ: tarixlər `Date`, boş sətirlər
 * `null`. Sətir → `Date` çevirməsi server action-dadır (tələ T3).
 */
export interface CreatePostData {
  cohortId: string;
  category: PostCategory;
  kind: PostKindType;
  visibility: VisibilityType;
  body: string | null;
  occurredAt: Date;
  linkUrl: string | null;
  linkTitle: string | null;
  linkImage: string | null;
  referencedEventId: string | null;
  showOnTimeline: boolean;
  showInAchievements: boolean;
  media: MediaAssetData[];
  /** `kind = ACHIEVEMENT` və ya `showInAchievements` olduqda MƏCBURİ. */
  achievement: AchievementFanoutInput | null;
  /** `kind = MEMORY` olduqda MƏCBURİ. */
  memory: MemoryData | null;
}

/** Viewer həmin cohort-un üzvüdürmü? — token-ə deyil, BAZAYA baxılır. */
async function assertMembership(viewer: UserViewer, cohortId: string): Promise<boolean> {
  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: viewer.userId, cohortId } },
    select: { userId: true },
  });
  return membership !== null;
}

/**
 * Post-dan yayılma üçün lazım olan sahələr.
 * `PostFanoutSource` saf modul (`features/feed/fanout.ts`) tərəfindən işlədilir.
 */
function fanoutSourceOf(data: CreatePostData): PostFanoutSource {
  return {
    category: data.category,
    visibility: data.visibility,
    occurredAt: data.occurredAt,
    body: data.body,
    achievementTitle: data.achievement?.title ?? null,
    memoryTitle: data.memory?.title ?? null,
  };
}

/**
 * Sinif yoldaşlarına bildiriş sətirləri.
 *
 * ⚠️ `PRIVATE` paylaşımda bildiriş GÖNDƏRİLMİR — məzmunu görməyən adama
 * "yeni paylaşım var" deməK özü sızmadır.
 *
 * ⚠️ Enum-da «yeni paylaşım» tipi yoxdur (POST_LIKE / POST_COMMENT hadisəyə
 * bağlıdır), ona görə ümumi `SYSTEM` işlədilir — sətir literal yazılmır,
 * dəyər `@/lib/enums`-dən gəlir.
 */
async function buildPostNotifications(
  tx: Prisma.TransactionClient,
  params: {
    postId: string;
    cohortId: string;
    cohortSlug: string;
    authorId: string;
    authorName: string;
    visibility: VisibilityType;
    title: string;
  },
): Promise<Prisma.NotificationCreateManyInput[]> {
  if (params.visibility === Visibility.PRIVATE) return [];

  const members = await tx.cohortMembership.findMany({
    where: { cohortId: params.cohortId, userId: { not: params.authorId } },
    select: { userId: true },
  });

  return members.map((member) => ({
    recipientId: member.userId,
    actorId: params.authorId,
    type: NotificationType.SYSTEM,
    entityType: NotificationEntityType.POST,
    entityId: params.postId,
    title: `${params.authorName} yeni paylaşım etdi`,
    body: params.title,
    url: `/class/${params.cohortSlug}/feed`,
  }));
}

// ---------------------------------------------------------------------------
// createPost — TƏK TRANSAKSİYA (PLAN.md §4.4)
// ---------------------------------------------------------------------------

/**
 * Paylaşım yaradır və seçilmiş səthlərə yayır.
 *
 * ```
 * Post
 *   ├─ MediaAsset[]            (order ilə)
 *   ├─ Memory                  kind = MEMORY olduqda
 *   ├─ showOnTimeline     → TimelineEntry  (visibility post-dan KOPYALANIR)
 *   ├─ showInAchievements → Achievement    (status: SUBMITTED)
 *   └─ Notification[]          sinif yoldaşlarına
 * ```
 *
 * ⚠️ `cohortId` müştəridən GƏLİR, amma ona GÜVƏNİLMİR: üzvlük DB-dən yenidən
 * yoxlanılır. `authorId` heç vaxt müştəridən gəlmir — viewer-dəndir.
 */
export async function createPost(
  viewer: UserViewer,
  data: CreatePostData,
): Promise<PostMutationResult<{ postId: string }>> {
  if (!(await assertMembership(viewer, data.cohortId))) {
    return { ok: false, reason: "NOT_A_MEMBER" };
  }

  // Nailiyyət sətri üçün `title`, `category`, `awardedAt` sxemdə nullable
  // deyil — məlumat gəlmədiyi halda transaksiyaya girmək mənasızdır.
  if ((data.kind === PostKind.ACHIEVEMENT || data.showInAchievements) && !data.achievement) {
    return { ok: false, reason: "ACHIEVEMENT_DETAILS_REQUIRED" };
  }

  // İstinad edilən tədbir viewer üçün görünən olmalıdır, yoxsa gizli tədbirin
  // adı lentdə peyda olar.
  if (data.referencedEventId) {
    const event = await prisma.event.findFirst({
      where: {
        id: data.referencedEventId,
        OR: [{ cohortId: data.cohortId }, { cohortId: null }],
      },
      select: { id: true },
    });
    if (!event) return { ok: false, reason: "EVENT_NOT_FOUND" };
  }

  const source = fanoutSourceOf(data);

  const postId = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: viewer.userId,
        cohortId: data.cohortId,
        category: data.category,
        kind: data.kind,
        body: data.body,
        linkUrl: data.linkUrl,
        linkTitle: data.linkTitle,
        linkImage: data.linkImage,
        referencedEventId: data.referencedEventId,
        visibility: data.visibility,
        showOnTimeline: data.showOnTimeline,
        showInAchievements: data.showInAchievements,
        occurredAt: data.occurredAt,
        status: PostStatus.ACTIVE,
      },
      select: { id: true, cohort: { select: { slug: true } } },
    });

    if (data.media.length > 0) {
      await tx.mediaAsset.createMany({
        data: data.media.map((asset) => ({ ...asset, postId: post.id })),
      });
    }

    // `kind = MEMORY` → Memory sətri. Xatirə növü və "kimə həsr olunub"
    // məlumatı Post sütunlarında saxlanıla bilməz, ona görə burada yaranır
    // (`Memory.postId` @unique — lent paylaşımı ilə bir-bir bağlanır).
    if (data.memory) {
      await tx.memory.create({
        data: {
          authorId: viewer.userId,
          cohortId: data.cohortId,
          postId: post.id,
          type: data.memory.type,
          title: data.memory.title,
          body: data.memory.body,
          dedicatedTo: data.memory.dedicatedTo,
          visibility: derivedVisibility(data.visibility),
          status: ContentStatus.ACTIVE,
          occurredAt: data.occurredAt,
          showInFeed: true,
          showInTimeline: data.showOnTimeline,
        },
      });
    }

    if (data.showOnTimeline) {
      await tx.timelineEntry.create({
        data: buildTimelineEntry(post.id, data.cohortId, source),
      });
    }

    if (data.showInAchievements && data.achievement) {
      await tx.achievement.create({
        data: buildAchievement(
          post.id,
          data.cohortId,
          viewer.userId,
          source,
          data.achievement,
        ),
      });
    }

    const author = await tx.user.findUniqueOrThrow({
      where: { id: viewer.userId },
      select: { firstName: true, lastName: true },
    });

    const notifications = await buildPostNotifications(tx, {
      postId: post.id,
      cohortId: data.cohortId,
      cohortSlug: post.cohort.slug,
      authorId: viewer.userId,
      authorName: `${author.firstName} ${author.lastName}`,
      visibility: data.visibility,
      title: buildTimelineEntry(post.id, data.cohortId, source).title,
    });

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return post.id;
  });

  return { ok: true, value: { postId } };
}

// ---------------------------------------------------------------------------
// updatePostSurfaces — bayraqları sonradan dəyişmək
// ---------------------------------------------------------------------------

export interface UpdateSurfacesData {
  postId: string;
  showOnTimeline: boolean;
  showInAchievements: boolean;
  /** Nailiyyət ilk dəfə açılırsa məcburidir (title/category/awardedAt nullable deyil). */
  achievement: AchievementFanoutInput | null;
}

/**
 * Timeline / Achievements bayraqlarını dəyişir.
 *
 * ⚠️ TƏLƏ T11: `TimelineEntry.postId` və `Achievement.postId` `@unique`-dir.
 * Bayraq ikinci dəfə açılanda `create` işlətsən Prisma `P2002` verir —
 * `upsert` işlədilir. Bağlananda:
 *   · TimelineEntry → `deleteMany` (törəmə qeyddir, arxivə ehtiyac yoxdur)
 *   · Achievement   → `ARCHIVED` (təsdiq tarixçəsi qalır, `deleteMany` DEYİL)
 */
export async function updatePostSurfaces(
  viewer: UserViewer,
  data: UpdateSurfacesData,
): Promise<PostMutationResult> {
  const post = await prisma.post.findUnique({
    where: { id: data.postId },
    select: {
      id: true,
      authorId: true,
      cohortId: true,
      visibility: true,
      status: true,
      category: true,
      occurredAt: true,
      body: true,
      kind: true,
      achievement: { select: { id: true } },
      memory: { select: { title: true } },
    },
  });

  if (!post || post.status === PostStatus.DELETED) return { ok: false, reason: "NOT_FOUND" };
  // Səthləri yalnız MÜƏLLİF idarə edir: bu, məzmunun harada göründüyü ilə bağlı
  // redaktədir, moderasiya əməliyyatı deyil.
  if (viewer.userId !== post.authorId) return { ok: false, reason: "FORBIDDEN" };

  if (data.showInAchievements && !data.achievement && !post.achievement) {
    return { ok: false, reason: "ACHIEVEMENT_DETAILS_REQUIRED" };
  }

  const source: PostFanoutSource = {
    category: post.category as PostCategory,
    visibility: post.visibility as VisibilityType,
    occurredAt: post.occurredAt,
    body: post.body,
    achievementTitle: data.achievement?.title ?? null,
    memoryTitle: post.memory?.title ?? null,
  };

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: post.id },
      data: {
        showOnTimeline: data.showOnTimeline,
        showInAchievements: data.showInAchievements,
      },
    });

    if (data.showOnTimeline) {
      const entry = buildTimelineEntry(post.id, post.cohortId, source);
      await tx.timelineEntry.upsert({
        where: { postId: post.id },
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
    } else {
      await tx.timelineEntry.deleteMany({ where: { postId: post.id } });
    }

    if (data.showInAchievements) {
      if (data.achievement) {
        const achievement = buildAchievement(
          post.id,
          post.cohortId,
          post.authorId,
          source,
          data.achievement,
        );
        await tx.achievement.upsert({
          where: { postId: post.id },
          create: achievement,
          update: {
            category: achievement.category,
            title: achievement.title,
            description: achievement.description,
            organization: achievement.organization,
            proofUrl: achievement.proofUrl,
            awardedAt: achievement.awardedAt,
            visibility: achievement.visibility,
            // Arxivdən qaytarılırsa yenidən təsdiq növbəsinə düşür.
            status: AchievementStatus.SUBMITTED,
          },
        });
      } else {
        // Detal gəlməyib, amma sətir var → sadəcə arxivdən çıxarılır.
        await tx.achievement.updateMany({
          where: { postId: post.id },
          data: { status: AchievementStatus.SUBMITTED },
        });
      }
    } else {
      await tx.achievement.updateMany({
        where: { postId: post.id },
        data: { status: AchievementStatus.ARCHIVED },
      });
    }
  });

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// deletePost — SOFT DELETE + əl ilə təmizləmə
// ---------------------------------------------------------------------------

/**
 * Paylaşımı silir.
 *
 * 🔴 TƏLƏ T4: `status = DELETED` SOFT delete-dir — sətir qalır, yəni
 * `onDelete: Cascade` İŞƏ DÜŞMÜR. Timeline qeydi və nailiyyət EYNİ
 * TRANSAKSİYADA açıq şəkildə təmizlənməlidir, yoxsa silinmiş postun izi
 * xronologiyada qalır (spec §7 pozulur).
 *
 * İcazə: müəllif VƏ YA `canModerate(viewer, post)`. Moderasiya yolu ilə
 * silinirsə `AuditLog` sətri MƏCBURİDİR (CLAUDE.md — moderasiya konteksti).
 */
export async function deletePost(
  viewer: UserViewer,
  postId: string,
): Promise<PostMutationResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      cohortId: true,
      visibility: true,
      status: true,
      category: true,
    },
  });

  if (!post || post.status === PostStatus.DELETED) return { ok: false, reason: "NOT_FOUND" };

  const isOwner = viewer.userId === post.authorId;
  const isModerating =
    !isOwner &&
    canModerate(viewer, {
      ownerId: post.authorId,
      cohortId: post.cohortId,
      visibility: post.visibility,
    });

  if (!isOwner && !isModerating) return { ok: false, reason: "FORBIDDEN" };

  // ⚠️ TƏLƏ T42 — audit sətri `recordAudit()` ilə yazılır, `prisma.auditLog
  // .create` ilə DEYİL: ağ siyahı (`safeAuditMetadata`) yalnız orada tətbiq
  // olunur. `recordAudit` `async`-dir, ona görə transaksiya MASSİV formasından
  // İNTERAKTİV formaya keçirilib — davranış eynidir (hamısı bir transaksiyada).
  await prisma.$transaction(async (tx) => {
    if (isModerating) {
      // İZ ƏVVƏL, məzmun sonra — `openModerationReview` ilə eyni sıra.
      await recordAudit(tx, {
        actorId: viewer.userId,
        action: AuditAction.MODERATE,
        entityType: NotificationEntityType.POST,
        entityId: post.id,
        metadata: {
          operation: "deletePost",
          authorId: post.authorId,
          cohortId: post.cohortId,
          category: post.category,
        },
      });
    }

    await tx.post.update({
      where: { id: post.id },
      data: { status: PostStatus.DELETED },
    });
    await tx.timelineEntry.deleteMany({ where: { postId: post.id } });
    await tx.achievement.updateMany({
      where: { postId: post.id },
      data: { status: AchievementStatus.ARCHIVED },
    });
    // Xatirə də soft-delete olur — `Memory.status` ayrı sütundur və
    // `Memory.postId` `onDelete: SetNull` olduğu üçün cascade onu toxunmur.
    await tx.memory.updateMany({
      where: { postId: post.id },
      data: { status: ContentStatus.DELETED },
    });
  });

  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Reaksiyalar
// ---------------------------------------------------------------------------

export interface ToggleReactionOutcome {
  /** Yeni vəziyyət — reaksiya ləğv olunubsa `null`. */
  type: string | null;
}

/**
 * Reaksiyanı əlavə edir / dəyişir / ləğv edir.
 *
 * 🔴 TƏLƏ T12: `Reaction` PK-sı `@@id([postId, userId])` — istifadəçi başına
 * BİR reaksiya. `create` ikinci dəfə `P2002` verir:
 *   · eyni növ yenidən basılıb → `delete` (ləğv)
 *   · fərqli növ               → `upsert` (dəyişmə)
 */
export async function toggleReaction(
  viewer: UserViewer,
  postId: string,
  type: ReactionType,
): Promise<PostMutationResult<ToggleReactionOutcome>> {
  // Görünməyən posta reaksiya verilə bilməz.
  const post = await prisma.post.findFirst({
    where: visiblePostWhere(viewer, { id: postId }),
    select: { id: true, authorId: true, cohort: { select: { slug: true } } },
  });
  if (!post) return { ok: false, reason: "NOT_FOUND" };

  const key = { postId_userId: { postId, userId: viewer.userId } };
  const existing = await prisma.reaction.findUnique({
    where: key,
    select: { type: true },
  });

  if (existing?.type === type) {
    await prisma.reaction.delete({ where: key });
    return { ok: true, value: { type: null } };
  }

  await prisma.reaction.upsert({
    where: key,
    create: { postId, userId: viewer.userId, type },
    update: { type },
  });

  // Bildiriş yalnız İLK reaksiyada — növ dəyişəndə təkrar göndərilmir.
  if (!existing && post.authorId !== viewer.userId) {
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: viewer.userId },
      select: { firstName: true, lastName: true },
    });
    await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        actorId: viewer.userId,
        type: NotificationType.POST_LIKE,
        entityType: NotificationEntityType.POST,
        entityId: postId,
        title: `${actor.firstName} ${actor.lastName} paylaşımınıza reaksiya verdi`,
        url: `/class/${post.cohort.slug}/feed`,
      },
    });
  }

  return { ok: true, value: { type } };
}

// ---------------------------------------------------------------------------
// Şərhlər — yazma
// ---------------------------------------------------------------------------

export interface CreateCommentData {
  postId: string;
  body: string;
  /** Bir səviyyəli cavab. İkinci səviyyə qəsdən dəstəklənmir. */
  parentId: string | null;
}

export async function createComment(
  viewer: UserViewer,
  data: CreateCommentData,
): Promise<PostMutationResult<{ commentId: string }>> {
  const post = await prisma.post.findFirst({
    where: visiblePostWhere(viewer, { id: data.postId }),
    select: { id: true, authorId: true, cohort: { select: { slug: true } } },
  });
  if (!post) return { ok: false, reason: "NOT_FOUND" };

  // Cavab verilən şərh EYNİ posta aid olmalı və özü cavab OLMAMALIDIR —
  // əks halda iyerarxiya bir səviyyədən dərinləşər.
  let parentId: string | null = null;
  if (data.parentId) {
    const parent = await prisma.comment.findFirst({
      where: {
        id: data.parentId,
        postId: data.postId,
        parentId: null,
        status: { not: ContentStatus.DELETED },
      },
      select: { id: true },
    });
    if (!parent) return { ok: false, reason: "NOT_FOUND" };
    parentId = parent.id;
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        postId: data.postId,
        authorId: viewer.userId,
        body: data.body,
        parentId,
        status: ContentStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (post.authorId !== viewer.userId) {
      const actor = await tx.user.findUniqueOrThrow({
        where: { id: viewer.userId },
        select: { firstName: true, lastName: true },
      });
      await tx.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: viewer.userId,
          type: NotificationType.POST_COMMENT,
          entityType: NotificationEntityType.POST,
          entityId: data.postId,
          title: `${actor.firstName} ${actor.lastName} paylaşımınıza şərh yazdı`,
          body: data.body.slice(0, 160),
          url: `/class/${post.cohort.slug}/feed`,
        },
      });
    }

    return created;
  });

  return { ok: true, value: { commentId: comment.id } };
}

/**
 * Şərhi silir — SOFT DELETE (`status = DELETED`), post ilə eyni yanaşma.
 * Moderasiya yolu ilə silinirsə `AuditLog` yazılır.
 */
export async function deleteComment(
  viewer: UserViewer,
  commentId: string,
): Promise<PostMutationResult> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      status: true,
      postId: true,
      post: { select: { cohortId: true, visibility: true } },
    },
  });

  if (!comment || comment.status === ContentStatus.DELETED) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const isOwner = viewer.userId === comment.authorId;
  const isModerating =
    !isOwner &&
    canModerate(viewer, {
      ownerId: comment.authorId,
      cohortId: comment.post.cohortId,
      visibility: comment.post.visibility,
    });

  if (!isOwner && !isModerating) return { ok: false, reason: "FORBIDDEN" };

  // ⚠️ TƏLƏ T42 — bax `deletePost`-dakı qeyd.
  await prisma.$transaction(async (tx) => {
    if (isModerating) {
      await recordAudit(tx, {
        actorId: viewer.userId,
        action: AuditAction.MODERATE,
        entityType: "COMMENT",
        entityId: comment.id,
        metadata: {
          operation: "deleteComment",
          authorId: comment.authorId,
          postId: comment.postId,
        },
      });
    }

    await tx.comment.update({
      where: { id: comment.id },
      data: { status: ContentStatus.DELETED },
    });
  });

  return { ok: true, value: null };
}
