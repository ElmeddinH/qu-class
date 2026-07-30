// ============================================================================
// src/app/api/v1/cohorts/[slug]/achievements/route.ts
// GET /api/v1/cohorts/{slug}/achievements — kateqoriya filtri.
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseAchievementParams`).
//
// ⚠️ `total` `countAchievements` ilə hesablanır — EYNİ `where` şərtindən.
// Say ilə siyahı ayrılsa "12 nəticə" yazıb 9 sətir qaytarmaq mümkün olardı.
//
// 🔴 BU, MODERASİYA NÖVBƏSİ DEYİL (Blok 8, TƏLƏ A). `listAchievements` status
// filtrini yalnız sahibə tətbiq etmir, yəni moderator başqasının `SUBMITTED`
// qeydini BURADA GÖRMÜR. Növbə ayrı funksiyadır (`listModerationQueue`) və
// v1-də hələ açılmayıb — rol qapısı tələb edir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { achievementSkipOf, parseAchievementParams } from "@/lib/achievement-filters";
import {
  ACHIEVEMENT_PAGE_SIZE,
  countAchievements,
  listAchievements,
} from "@/services/achievement.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const filters = parseAchievementParams(searchParams);

    const serviceFilters = {
      cohortId: scope.cohort.id,
      category: filters.category ?? undefined,
    };

    const [items, total] = await Promise.all([
      listAchievements(viewer, {
        ...serviceFilters,
        take: ACHIEVEMENT_PAGE_SIZE,
        skip: achievementSkipOf(filters, ACHIEVEMENT_PAGE_SIZE),
      }),
      countAchievements(viewer, serviceFilters),
    ]);

    return ok(items, {
      meta: { total, page: filters.page, pageSize: ACHIEVEMENT_PAGE_SIZE },
    });
  },
);
