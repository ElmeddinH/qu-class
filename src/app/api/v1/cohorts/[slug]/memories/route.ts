// ============================================================================
// src/app/api/v1/cohorts/{slug}/memories/route.ts
// GET  /api/v1/cohorts/{slug}/memories — 2 filtr (`lib/memory-filters`).
// POST /api/v1/cohorts/{slug}/memories — yeni xatirə (Blok 14C).
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseMemoryParams`) — yeni
// parse məntiqi yazsaq eyni URL iki səthdə fərqli nəticə verərdi.
//
// ⚠️ Görünürlük şərti servisdədir (`activeVisibleWhere`); endpoint ƏLAVƏ filtr
// YAZMIR (CLAUDE.md §4-5).
//
// 🔴 POST — SİNİF YOLDAN GƏLİR, GÖVDƏDƏN YOX (paylaşım POST-u ilə eyni qərar).
// `resolveCohortScope` slug-ı həll edir və üzv olmayana 404 verir (403 YOX —
// sinfin mövcudluğu sızmasın). Servis üzvlüyü ONSUZ DA DB-dən yenidən yoxlayır
// (`createMemory` → `assertMembership`) — qapı ikiqatdır, məntiq tək yerdədir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { parseJsonBody, requireJson, withUser } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { created, ok } from "@/lib/api/respond";
import { CreateMemoryBodySchema } from "@/lib/api/schemas";
import {
  MEMORY_PAGE_SIZE,
  memorySkipOf,
  parseMemoryParams,
} from "@/lib/memory-filters";
import { toMemoryWriteData } from "@/features/memories/memory-input";
import { countMemories, createMemory, listMemories } from "@/services/memory.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — paylaşım büdcəsindən AYRIDIR. */
const WRITE_SCOPE = "memories";

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

/**
 * Yeni xatirə.
 *
 * Sıra paylaşım POST-u ilə EYNİDİR və hər addımın səbəbi var:
 *   1. `requireJson`  — CSRF (brauzer `<form>`-u JSON göndərə bilmir, TƏLƏ B).
 *   2. `enforceWriteRate` — DOĞRULAMADAN ƏVVƏL: hədd aşılıbsa gövdəni parse
 *      etmək artıq xərcdir.
 *   3. `resolveCohortScope` — sinif + üzvlük qapısı (üzv olmayana 404).
 *   4. `parseJsonBody` — gövdə.
 *
 * ⚠️ `TIMELINE_REQUIRES_FEED` İKİ QAT yoxlanılır və heç biri ROUTE-DA DEYİL:
 * sxem (`memorySurfaceRules` — formanın işlətdiyi EYNİ funksiya) və servis
 * (`createMemory`-nin ilk sətri). Route yalnız servisin `reason`-unu HTTP
 * koduna çevirir (422 — `lib/api/mutation-result.ts`).
 */
export const POST = withUser<{ slug: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const body = await parseJsonBody(CreateMemoryBodySchema, request);
  if (!body.ok) return body.response;

  // ⚠️ Çevirmə (sətir → `Date`, "" → `null`, `/uploads/` filtri)
  // `features/memories/memory-input.ts`-dədir — Server Action ilə EYNİ funksiya.
  const result = await createMemory(viewer, {
    cohortId: scope.cohort.id,
    ...toMemoryWriteData(body.data),
  });

  if (!result.ok) return failMutation(result.reason);

  return created(result.value, {
    headers: { location: `/api/v1/memories/${result.value.memoryId}` },
  });
});
