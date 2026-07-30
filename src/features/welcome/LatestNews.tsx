// ============================================================================
// src/features/welcome/LatestNews.tsx
// «Son xəbərlər» — 3-4 PUBLIC paylaşım, tarix zolağı ilə (GW analizi #12).
//
// 🔴 ANONİM VIEWER İLƏ ÇƏKİLİR. `listFeed(ANONYMOUS, …)` → `visiblePostWhere`
// yalnız `visibility = PUBLIC` və `status != DELETED` seçir. Səhifədə ƏLAVƏ
// FİLTR YOXDUR (CLAUDE.md §5) — `landing.spec.ts` seed-dəki CLASS postun
// mətninin səhifədə OLMADIĞINI yoxlayır.
//
// ⚠️ BOŞ GƏLƏRSƏ BÖLMƏ GİZLƏNİR (`null`) — səbəb `CommunityStories`
// başlığındakı ilə eynidir (bölməyə naviqasiya linki yoxdur).
//
// ⚠️ REAKSİYA VƏ ŞƏRH SAYI GÖSTƏRİLMİR: onlar sinif daxili qarşılıqlı təsirin
// ölçüsüdür və ictimai səhifədə "kim nə qədər aktivdir" sualına yaxınlaşır.
// Kart burada XƏBƏR-dir, sosial obyekt deyil.
//
// ⚠️ PAYLAŞIMA KEÇİD YOXDUR: lent `/class/[slug]/feed` altındadır və auth
// arxasındadır — anonim ziyarətçini `/login`-ə atardı.
// ============================================================================

import Image from "next/image";
import { CalendarDays } from "lucide-react";

import { postCategoryLabel } from "@/lib/labels";
import type { FeedPost } from "@/services/post.service";
import { dayMonth, shortDate } from "@/utils/date";

interface LatestNewsProps {
  posts: FeedPost[];
}

export function LatestNews({ posts }: LatestNewsProps) {
  if (posts.length === 0) return null;

  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => {
        const cover = post.media.find((asset) => asset.type === "IMAGE") ?? null;

        return (
          <li
            key={post.id}
            className="flex gap-4 overflow-hidden rounded-card border border-border bg-surface p-4 shadow-sm-kuds sm:p-6"
          >
            {/* Tarix zolağı — kartın sol tərəfində sabit enli sütun. */}
            <div
              className="flex w-16 shrink-0 flex-col items-center justify-center rounded-card bg-ku-soft py-3 text-center"
              aria-hidden
            >
              <span className="text-small font-semibold text-ku-dark">
                {dayMonth(post.occurredAt)}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-badge bg-ku-blue px-3 py-1 text-caption text-text-primary">
                  {postCategoryLabel(post.category)}
                </span>
                <time
                  dateTime={post.occurredAt.toISOString()}
                  className="flex items-center gap-1 text-caption text-text-secondary"
                >
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  {shortDate(post.occurredAt)}
                </time>
              </div>

              {post.body ? (
                <p className="line-clamp-3 whitespace-pre-line text-body text-text-primary">
                  {post.body}
                </p>
              ) : null}

              <p className="text-caption text-text-secondary">
                {post.author.firstName} {post.author.lastName} ·{" "}
                {post.cohort.displayName}
              </p>
            </div>

            {cover ? (
              <div className="relative hidden aspect-square w-24 shrink-0 overflow-hidden rounded-card bg-muted sm:block">
                <Image
                  src={cover.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
