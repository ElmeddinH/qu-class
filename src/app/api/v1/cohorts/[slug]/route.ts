// ============================================================================
// src/app/api/v1/cohorts/[slug]/route.ts
// GET /api/v1/cohorts/{slug} — sinif başlığı.
//
// ⚠️ İcazəsiz və ya mövcud olmayan sinif — HƏR İKİSİ 404 (`resolveCohortScope`).
// Fərq cavabdan oxunmamalıdır.
//
// ⚠️ `stage` `User.stage` keşindən DEYİL, cohort tarixlərindən hesablanır
// (`resolveStage`) — keş girişdə yenilənir və UI ona güvənmir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(async ({ viewer, params }) => {
  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  return ok(scope.cohort);
});
