// ============================================================================
// src/app/api/v1/cohorts/[slug]/posts/route.ts
// GET /api/v1/cohorts/{slug}/posts — sinif lenti, kursor səhifələməsi.
//
// ⚠️ MÖVCUD `/api/feed` KÖÇÜRÜLMƏDİ, ADI DƏYİŞMƏDİ (TƏLƏ F): onu `FeedList` →
// `useInfiniteQuery` işlədir və imzası UI müqaviləsidir. Bu endpoint ONUN
// YANINDA yaranır və EYNİ servisi (`listFeed`) çağırır — məntiq dublikat
// deyil, yalnız zərf və sənəd fərqlidir.
//
// 🔴 `CLASS` paylaşımlar sızmır: `listFeed` → `activeVisibleWhere(viewer)`
// şərtini DB sorğusuna qoyur. Endpoint əlavə filtr YAZMIR — yazsaydı iki
// müstəqil məxfilik məntiqi yaranardı və biri köhnələrdi.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { parseQuery, withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { PostsQuerySchema } from "@/lib/api/schemas";
import { listFeed } from "@/services/post.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const query = parseQuery(PostsQuerySchema, searchParams);
    if (!query.ok) return query.response;

    const page = await listFeed(viewer, {
      cohortId: scope.cohort.id,
      cursor: query.data.cursor ?? null,
      take: query.data.take,
    });

    return ok(page.items, { meta: { nextCursor: page.nextCursor } });
  },
);
