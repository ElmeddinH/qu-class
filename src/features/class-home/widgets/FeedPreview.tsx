// ============================================================================
// spec §16 blok 6 — Class Feed önizləməsi (5 paylaşım).
//
// ⚠️ Burada `features/feed/PostCard` İŞLƏDİLMİR və bu, qəsdəndir. `PostCard`
// client komponentidir: reaksiya, şərh, moderasiya menyusu daşıyır və
// `serializeFeedPost()`-dan keçmiş məlumat + TanStack Query konteksti tələb
// edir. Ana səhifədəki ÖNİZLƏMƏ isə oxunur, qarşılıqlı deyil — tam serverdə
// render olunur, JS paketi böyümür. Tam qarşılıqlı lent `/class/[slug]/feed`-dədir.
// ============================================================================

import Link from "next/link";
import { MessageSquare, Sparkles, ThumbsUp } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { FEED_ICONS, postCategoryMeta } from "@/features/feed/catalog";
import { listFeed } from "@/services/post.service";
import { relativeTime } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function FeedPreview({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const page = await listFeed(viewer, { cohortId: cohort.id, take: WIDGET_ITEM_LIMIT });

  return (
    <WidgetCard
      headingId={headingId}
      title="Sinif lenti"
      icon="sparkles"
      description="Ən son paylaşımlar."
      action={{ href: `/class/${cohort.slug}/feed`, label: "Lentə keç" }}
    >
      {page.items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Lent hələ boşdur"
          description="İlk paylaşımı siz edin — foto, xatirə və ya qısa bir qeyd."
          action={{ href: `/class/${cohort.slug}/feed`, label: "Paylaşım yarat" }}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {page.items.map((post) => {
            const meta = postCategoryMeta(post.category);
            const CategoryIcon = FEED_ICONS[meta.icon];

            return (
              <li key={post.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="h-9 w-9 shrink-0">
                  {post.author.avatarUrl ? (
                    <AvatarImage src={post.author.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                    {post.author.firstName.charAt(0)}
                    {post.author.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/u/${post.author.id}`}
                      className="text-small font-medium text-text-primary hover:text-ku-green hover:underline"
                    >
                      {post.author.firstName} {post.author.lastName}
                    </Link>
                    <span className="text-caption text-text-secondary">
                      {relativeTime(post.createdAt)}
                    </span>
                    <VisibilityBadge level={post.visibility} showLabel={false} />
                  </div>

                  {post.body ? (
                    <p className="line-clamp-2 text-small text-text-secondary">
                      {post.body}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-caption text-text-secondary">
                    <Badge variant="outline" className="gap-1 text-caption font-normal">
                      <CategoryIcon className="h-3 w-3" aria-hidden />
                      {meta.label}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" aria-hidden />
                      {post.reactionCount}
                      <span className="sr-only">reaksiya</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" aria-hidden />
                      {post.commentCount}
                      <span className="sr-only">şərh</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
