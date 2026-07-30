"use client";

// ============================================================================
// src/features/feed/FeedList.tsx
// Sonsuz sürüşən lent — `useInfiniteQuery` + skeleton + boş vəziyyət.
//
// Kursor əsaslı səhifələmə: `/api/feed` `{ items, nextCursor }` qaytarır,
// `nextCursor === null` olduqda daha səhifə yoxdur. Offset işlədilmir —
// yeni post gələndə sərhəd sürüşür və qeyd təkrarlanardı.
//
// İlk səhifə SERVERDƏN gəlir (`initialPage`), yəni ekran boş görünmür və
// kateqoriya filtri dəyişməyincə əlavə sorğu getmir.
// ============================================================================

import { useCallback, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostCategory } from "@/lib/enums";

import { POST_CATEGORY_META } from "./catalog";
import { PostCard } from "./PostCard";
import type { FeedPageView } from "./types";

interface FeedListProps {
  cohortId: string;
  cohortSlug: string;
  category: PostCategory | null;
  /** Serverdə render olunmuş ilk səhifə — `serializeFeedPage()`-dən keçib. */
  initialPage: FeedPageView;
}

const PAGE_SIZE = 20;

async function fetchFeedPage(params: {
  cohortId: string;
  category: PostCategory | null;
  cursor: string | null;
}): Promise<FeedPageView> {
  const search = new URLSearchParams({
    cohortId: params.cohortId,
    take: String(PAGE_SIZE),
  });
  if (params.category) search.set("category", params.category);
  if (params.cursor) search.set("cursor", params.cursor);

  const response = await fetch(`/api/feed?${search.toString()}`);
  if (!response.ok) throw new Error("Lent yüklənmədi.");

  return (await response.json()) as FeedPageView;
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/**
 * ⚠️ WCAG 1.3.1 — siyahı `<section>` + `<h2>` ilə sarınır.
 * Səhifənin `<h1>`-i "Sinif lenti"dir, `PostCard` isə hər paylaşımı `<h3>` ilə
 * başlıqlandırır (T22 qeydi orada). Aralıqda `<h2>` olmasa iyerarxiya
 * h1 → h3 kimi ATLANIR. Başlıq `sr-only`-dir: ekranda `<h1>` onsuz da eyni
 * mənanı daşıyır, təkrarı vizual gürültü olardı.
 */
function FeedSection({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="feed-posts" className="flex flex-col gap-6">
      <h2 id="feed-posts" className="sr-only">
        Paylaşımlar
      </h2>
      {children}
    </section>
  );
}

export function FeedList({ cohortId, cohortSlug, category, initialPage }: FeedListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    // Filtr açarın bir hissəsidir → kateqoriya dəyişəndə ayrı keş, qarışıq yox.
    queryKey: ["feed", cohortId, category] as const,
    queryFn: ({ pageParam }) => fetchFeedPage({ cohortId, category, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Sonsuz sürüşmə: siyahının sonundakı boş element görünəndə növbəti səhifə
  // çəkilir. `IntersectionObserver` scroll hadisəsindən ucuzdur.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  function refresh() {
    void query.refetch();
  }

  if (query.isPending) {
    return (
      <FeedSection>
        <FeedSkeleton />
      </FeedSection>
    );
  }

  if (query.isError) {
    return (
      <FeedSection>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-body text-text-primary">Lent yüklənmədi.</p>
            <p className="text-small text-text-secondary">
              İnternet bağlantınızı yoxlayıb yenidən cəhd edin.
            </p>
            <Button type="button" variant="outline" onClick={refresh}>
              Yenidən cəhd et
            </Button>
          </CardContent>
        </Card>
      </FeedSection>
    );
  }

  if (posts.length === 0) {
    return (
      <FeedSection>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-avatar bg-ku-soft"
              aria-hidden
            >
              <Sparkles className="h-8 w-8 text-ku-dark" />
            </span>

            <h3 className="text-h4 font-medium text-text-primary">
              {category
                ? `«${POST_CATEGORY_META[category].label}» kateqoriyasında paylaşım yoxdur`
                : "Lent hələ boşdur"}
            </h3>

            <p className="max-w-md text-small text-text-secondary">
              {category
                ? "Başqa kateqoriya seçin və ya bu mövzuda ilk paylaşımı siz edin."
                : "İlk gün fotoları, imtahan dövrü, səyahətlər — sinif tarixçəsi buradan başlayır."}
            </p>

            <p className="text-small font-medium text-ku-dark">İlk paylaşımı sən et 👆</p>
          </CardContent>
        </Card>
      </FeedSection>
    );
  }

  return (
    <FeedSection>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          cohortSlug={cohortSlug}
          onChanged={refresh}
        />
      ))}

      <div ref={sentinelRef} aria-hidden className="h-1" />

      {isFetchingNextPage ? (
        <p className="flex items-center justify-center gap-2 py-4 text-small text-text-secondary">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Daha çox paylaşım yüklənir…
        </p>
      ) : null}

      {!hasNextPage ? (
        <p className="py-4 text-center text-small text-text-secondary">
          Lentin sonuna çatdınız.
        </p>
      ) : (
        // `IntersectionObserver` işləməyən hallar üçün (JS-siz deyil — köhnə
        // brauzer, gizlədilmiş konteyner) açıq düymə saxlanılır.
        <Button
          type="button"
          variant="outline"
          className="self-center"
          onClick={loadMore}
          disabled={isFetchingNextPage}
        >
          Daha çox göstər
        </Button>
      )}
    </FeedSection>
  );
}
