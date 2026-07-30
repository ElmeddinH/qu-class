// ============================================================================
// src/app/api/v1/cohorts/[slug]/timeline/route.ts
// GET /api/v1/cohorts/{slug}/timeline — 3 filtr (`lib/timeline-filters`).
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseTimelineParams`) — bax
// `members/route.ts` başlığındaki səbəb.
//
// ⚠️ Xronologiya TÖRƏMƏDİR: `timelineVisibilityWhere` sahib şaxəsini MƏNBƏ
// əlaqələri (post / achievement / event) üzərindən qurur, çünki
// `TimelineEntry`-də sahib sütunu yoxdur. `visibilityWhere` işlətmək burada
// SƏHV olardı.
//
// ⚠️ Cavabın `academicYears` sahəsi ZƏRFDƏN KƏNARDA qalır: o, filtr panelinin
// seçim siyahısıdır, məzmun deyil. `meta`-ya yazılır ki, `data` təmiz siyahı
// qalsın... — ⚠️ `ApiMeta` sabit sxemdir, ona görə illər siyahısı bu endpoint
// üçün QAYTARILMIR. Müştəri lazım olsa qeydlərin `academicYear` sahəsindən
// özü toplayır (API-də filtr paneli yoxdur).
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import {
  TIMELINE_PAGE_SIZE,
  parseTimelineParams,
  timelineSkipOf,
} from "@/lib/timeline-filters";
import { listTimeline } from "@/services/timeline.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const filters = parseTimelineParams(searchParams);

    const result = await listTimeline(viewer, {
      cohortId: scope.cohort.id,
      academicYear: filters.academicYear ?? undefined,
      category: filters.category ?? undefined,
      sourceType: filters.sourceType ?? undefined,
      take: TIMELINE_PAGE_SIZE,
      skip: timelineSkipOf(filters),
    });

    return ok(result.items, {
      meta: {
        total: result.total,
        page: filters.page,
        pageSize: TIMELINE_PAGE_SIZE,
      },
    });
  },
);
