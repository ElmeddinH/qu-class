"use client";

// ============================================================================
// src/features/feed/ClassFeed.tsx
// Lent ekranının müştəri konteyneri: kompozitor + kateqoriya filtri + siyahı.
//
// ⚠️ Kateqoriya filtri URL-də saxlanılır (`nuqs` → `?category=TRIPS`):
// istifadəçi linki paylaşa, geri düyməsi ilə qayıda bilir. Adapter
// `app/providers.tsx`-dədir.
//
// Filtr dəyişəndə `shallow: false` ilə server komponenti yenidən işə düşür və
// `initialPage` yeni kateqoriya üçün gəlir — belə olmasa ilk səhifə köhnə
// filtrin nəticəsi qalardı.
// ============================================================================

import { useQueryState } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { POST_CATEGORY_VALUES, type PostCategory } from "@/lib/enums";
import { cn } from "@/lib/utils";

import { FEED_ICONS, POST_CATEGORY_META } from "./catalog";
import { FeedList } from "./FeedList";
import { PostComposer } from "./PostComposer";
import type { FeedEventOption, FeedPageView } from "./types";

interface ClassFeedProps {
  cohortId: string;
  cohortSlug: string;
  /** Viewer bu sinfin üzvüdürmü? Üzv deyilsə kompozitor göstərilmir. */
  canPost: boolean;
  category: PostCategory | null;
  initialPage: FeedPageView;
  events: FeedEventOption[];
}

export function ClassFeed({
  cohortId,
  cohortSlug,
  canPost,
  category,
  initialPage,
  events,
}: ClassFeedProps) {
  const queryClient = useQueryClient();

  const [, setCategory] = useQueryState("category", {
    shallow: false,
    clearOnDefault: true,
  });

  function invalidateFeed() {
    void queryClient.invalidateQueries({ queryKey: ["feed", cohortId] });
  }

  return (
    <div className="flex flex-col gap-6">
      {canPost ? (
        <PostComposer
          cohortId={cohortId}
          cohortSlug={cohortSlug}
          events={events}
          onCreated={invalidateFeed}
        />
      ) : null}

      <nav aria-label="Kateqoriya filtri" className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={category === null}
          onClick={() => void setCategory(null)}
          className={cn(
            category === null && "border-ku-green bg-ku-soft text-ku-dark hover:bg-ku-soft",
          )}
        >
          Hamısı
        </Button>

        {POST_CATEGORY_VALUES.map((value) => {
          const meta = POST_CATEGORY_META[value];
          const Icon = FEED_ICONS[meta.icon];
          const isActive = category === value;

          return (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={isActive}
              onClick={() => void setCategory(isActive ? null : value)}
              className={cn(
                "gap-2",
                isActive && "border-ku-green bg-ku-soft text-ku-dark hover:bg-ku-soft",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {meta.label}
            </Button>
          );
        })}
      </nav>

      <FeedList
        cohortId={cohortId}
        cohortSlug={cohortSlug}
        category={category}
        initialPage={initialPage}
      />
    </div>
  );
}
