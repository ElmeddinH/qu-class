// ============================================================================
// src/app/api/v1/cohorts/[slug]/events/route.ts
// GET /api/v1/cohorts/{slug}/events — spec §15-in 6 filtri (Blok 9).
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseEventParams`), `when` →
// `upcoming` və `format` → `isOnline` çevirmələri də EYNİ köməkçilərdən
// (`upcomingFlagOf`, `isOnlineFlagOf`).
//
// ⚠️ `cohortId` DEYİL, `audienceCohortId`: sinif səviyyəli tədbir azdır, tələbə
// isə universitet / fakültə / klub tədbirlərini də görür (`ClassEvents` ilə
// eyni qərar). Bu, AUDİTORİYA süzgəcidir — görünürlük yenə `visibleWithStatus`
// ilə ayrıca tətbiq olunur.
//
// ⚠️ "İndi" BİR DƏFƏ hesablanır və hər iki sorğuya ötürülür: siyahı ilə say
// eyni ana baxmalıdır, yoxsa sərhəddəki tədbir sayda var, siyahıda yox olur.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import {
  EVENT_PAGE_SIZE,
  eventSkipOf,
  isOnlineFlagOf,
  parseEventParams,
  upcomingFlagOf,
} from "@/lib/event-filters";
import { countEvents, listEvents } from "@/services/event.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const filters = parseEventParams(searchParams);
    const now = new Date();

    const serviceFilters = {
      audienceCohortId: scope.cohort.id,
      category: filters.category ?? undefined,
      scope: filters.scope ?? undefined,
      facultyId: filters.facultyId ?? undefined,
      clubId: filters.clubId ?? undefined,
      isOnline: isOnlineFlagOf(filters.format),
      upcoming: upcomingFlagOf(filters.when),
    };

    const [items, total] = await Promise.all([
      listEvents(
        viewer,
        {
          ...serviceFilters,
          take: EVENT_PAGE_SIZE,
          skip: eventSkipOf(filters, EVENT_PAGE_SIZE),
        },
        now,
      ),
      countEvents(viewer, serviceFilters, now),
    ]);

    return ok(items, {
      meta: { total, page: filters.page, pageSize: EVENT_PAGE_SIZE },
    });
  },
);
