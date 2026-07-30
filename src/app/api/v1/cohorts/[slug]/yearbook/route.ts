// ============================================================================
// src/app/api/v1/cohorts/{slug}/yearbook/route.ts
// GET /api/v1/cohorts/{slug}/yearbook — Digital Yearbook üçün seçilmiş xatirələr.
//
// ⚠️ Bölmə (`section`) SAF `lib/yearbook.ts` modulundan hesablanır — UI ilə
// eyni qayda. API qruplaşdırılmış struktur QAYTARMIR: `data` düz siyahıdır və
// hər qeydin öz `section` sahəsi var. Səbəb — `ApiMeta` və zərf sabitdir, iç-içə
// qruplar müştəri üçün əlavə forma yaradardı; qruplaşdırma bir sətirlik işdir.
//
// ⚠️ Bölməyə düşməyən qeyd (naməlum növ) siyahıdan ÇIXARILIR — UI-da da
// göstərilmir, yəni iki səth eyni məzmunu verir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { yearbookSectionOf } from "@/lib/yearbook";
import { listYearbook } from "@/services/memory.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(async ({ viewer, params }) => {
  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const memories = await listYearbook(viewer, scope.cohort.id);

  const items = memories
    .map((memory) => ({ ...memory, section: yearbookSectionOf(memory) }))
    .filter((entry) => entry.section !== null);

  return ok(items, { meta: { total: items.length } });
});
