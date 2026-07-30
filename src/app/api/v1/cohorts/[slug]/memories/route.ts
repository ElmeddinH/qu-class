// ============================================================================
// src/app/api/v1/cohorts/{slug}/memories/route.ts
// GET /api/v1/cohorts/{slug}/memories — 2 filtr (`lib/memory-filters`).
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseMemoryParams`) — yeni
// parse məntiqi yazsaq eyni URL iki səthdə fərqli nəticə verərdi.
//
// ⚠️ Görünürlük şərti servisdədir (`activeVisibleWhere`); endpoint ƏLAVƏ filtr
// YAZMIR (CLAUDE.md §4-5).
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import {
  MEMORY_PAGE_SIZE,
  memorySkipOf,
  parseMemoryParams,
} from "@/lib/memory-filters";
import { countMemories, listMemories } from "@/services/memory.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(async ({ viewer, params, searchParams }) => {
  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const filters = parseMemoryParams(searchParams);

  const serviceFilters = {
    cohortId: scope.cohort.id,
    type: filters.type ?? undefined,
    placeOnly: filters.placeOnly || undefined,
  };

  const [items, total] = await Promise.all([
    listMemories(viewer, {
      ...serviceFilters,
      take: MEMORY_PAGE_SIZE,
      skip: memorySkipOf(filters),
    }),
    countMemories(viewer, serviceFilters),
  ]);

  return ok(items, {
    meta: { total, page: filters.page, pageSize: MEMORY_PAGE_SIZE },
  });
});
