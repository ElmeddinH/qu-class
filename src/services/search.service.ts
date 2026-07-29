// ============================================================================
// src/services/search.service.ts
// Qlobal axtarış [M16] — dörd növ: istifadəçi · paylaşım · tədbir · nailiyyət.
//
// 🔴 BU FAYLDA `prisma` İMPORTU YOXDUR və olmamalıdır. Bu, KOMPOZİSİYA
// qatıdır: hər növ ÖZ servisindən və ÖZ görünürlük köməkçisindən keçir
// (`src/lib/visibility.ts` başındakı model → köməkçi cədvəli):
//
//   növ          servis                              köməkçi
//   ───────────  ──────────────────────────────────  ─────────────────────────
//   istifadəçi   user.service → searchUsers          redactProfile + üzvlük
//   paylaşım     post.service → searchPosts          activeVisibleWhere
//   tədbir       event.service → searchEvents        visibleWithStatus(PUBLISHED,COMPLETED)
//   nailiyyət    achievement.service → searchAchievements  visibleWithStatus(VERIFIED,FEATURED)
//
// Niyə ayrı fayl: `/api/search` route handler-i və `/search` səhifəsi EYNİ
// nəticəni gözləyir. Aqreqasiya bir yerdə saxlanılır, yoxsa iki yerdə iki
// fərqli davranış yaranır (biri məxfilik köməkçisini unuda bilər).
//
// ⚠️ Nəticə forması (`SearchResults`) və limitlər BU FAYLDA DEYİL —
// `src/lib/search.ts`-dədir. Səbəb: müqaviləni client tərəf də (⌘K palitrası)
// işlədir və servisdən import etsə Prisma client paketinə düşərdi.
// ============================================================================

import { postCategoryMeta } from "@/features/feed/catalog";
import { shortDate } from "@/utils/date";
import {
  EMPTY_SEARCH_RESULTS,
  PALETTE_LIMIT,
  isSearchable,
  type SearchResults,
} from "@/lib/search";
import type { Viewer } from "@/lib/visibility";
import { searchAchievements } from "@/services/achievement.service";
import { searchEvents } from "@/services/event.service";
import { searchPosts } from "@/services/post.service";
import { searchUsers } from "@/services/user.service";

/** Paylaşımın başlığı yoxdur — kateqoriya etiketi + mətn parçası göstərilir. */
const EXCERPT_LENGTH = 90;

function excerpt(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > EXCERPT_LENGTH
    ? `${trimmed.slice(0, EXCERPT_LENGTH)}…`
    : trimmed;
}

/**
 * Dörd növ üzrə axtarış — hamısı PARALEL.
 *
 * Boş / çox qısa sorğuda DB-yə heç bir sorğu getmir.
 */
export async function searchEverything(
  viewer: Viewer,
  rawTerm: string,
  take: number = PALETTE_LIMIT,
): Promise<SearchResults> {
  const term = rawTerm.trim();
  if (!isSearchable(term)) return EMPTY_SEARCH_RESULTS;

  const [users, posts, events, achievements] = await Promise.all([
    searchUsers(viewer, term, take),
    searchPosts(viewer, term, take),
    searchEvents(viewer, term, take),
    searchAchievements(viewer, term, take),
  ]);

  return {
    // Sahələr `redactProfile`-dan keçmiş gəlir: `currentPosition` və
    // `currentCity` gizlədilibsə obyektdə YOXDUR, alt sətir sadəcə boş qalır.
    users: users.map((user) => ({
      id: user.id,
      title: `${user.firstName} ${user.lastName}`,
      subtitle:
        user.currentPosition ??
        user.currentCity ??
        user.cohorts[0]?.displayName ??
        null,
      href: `/u/${user.id}`,
    })),

    posts: posts.map((post) => ({
      id: post.id,
      title: postCategoryMeta(post.category).label,
      subtitle: excerpt(post.body) ?? post.linkTitle ?? null,
      href: `/class/${post.cohort.slug}/feed`,
    })),

    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: [shortDate(event.startsAt), event.location].filter(Boolean).join(" · ") || null,
      href: `/events/${event.id}`,
    })),

    achievements: achievements.map((achievement) => ({
      id: achievement.id,
      title: achievement.title,
      subtitle:
        [achievement.organization, shortDate(achievement.awardedAt)]
          .filter(Boolean)
          .join(" · ") || null,
      href: `/class/${achievement.cohort.slug}/achievements`,
    })),
  };
}
