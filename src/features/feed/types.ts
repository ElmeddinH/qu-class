// ============================================================================
// src/features/feed/types.ts
// Servis tipləri → müştəri tipləri (JSON seriallaşdırma sərhədi).
//
// ⚠️ `/api/feed` cavabı JSON-dur, yəni `Date` sahələri ISO SƏTRİNƏ çevrilir.
// Server komponenti ilk səhifəni `initialData` kimi ötürəndə isə `Date`
// obyektləri olduğu kimi keçir. İki forma qarışsa `useInfiniteQuery` keşində
// bir səhifə `Date`, digəri `string` daşıyar və formatlama funksiyası sınar.
//
// Həll: server tərəf DƏ `serializeFeedPage()`-dən keçir — keşdəki BÜTÜN
// səhifələr eyni formadadır (`string`).
// ============================================================================

import type { FeedPage, FeedPost } from "@/services/post.service";

export interface FeedPostView
  extends Omit<FeedPost, "occurredAt" | "createdAt" | "referencedEvent" | "achievement"> {
  occurredAt: string;
  createdAt: string;
  referencedEvent: {
    id: string;
    title: string;
    startsAt: string;
    location: string | null;
  } | null;
  achievement: {
    id: string;
    category: string;
    title: string;
    organization: string | null;
    proofUrl: string | null;
    awardedAt: string;
    status: string;
  } | null;
}

export interface FeedPageView {
  items: FeedPostView[];
  nextCursor: string | null;
}

export function serializeFeedPost(post: FeedPost): FeedPostView {
  return {
    ...post,
    occurredAt: post.occurredAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    referencedEvent: post.referencedEvent
      ? { ...post.referencedEvent, startsAt: post.referencedEvent.startsAt.toISOString() }
      : null,
    achievement: post.achievement
      ? { ...post.achievement, awardedAt: post.achievement.awardedAt.toISOString() }
      : null,
  };
}

export function serializeFeedPage(page: FeedPage): FeedPageView {
  return { items: page.items.map(serializeFeedPost), nextCursor: page.nextCursor };
}

/** Kompozitorda tədbir seçimi üçün minimal forma (`listEvents`-dən). */
export interface FeedEventOption {
  id: string;
  title: string;
  startsAt: string;
}
