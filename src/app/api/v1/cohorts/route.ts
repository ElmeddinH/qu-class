// ============================================================================
// src/app/api/v1/cohorts/route.ts
// GET /api/v1/cohorts — viewer-in ÜZV OLDUĞU siniflər.
//
// ⚠️ `withUser` — sessiya yoxdursa 401 JSON (HTML redirect YOX, bax
// `lib/api/guard.ts`).
//
// Bu endpoint sinif axınının GİRİŞ NÖQTƏSİDİR: müştəri buradan `slug` alır və
// `/cohorts/{slug}/…` endpoint-lərini çağırır. Başqa siniflərin siyahısı
// BURADAN alınmır — universitetin bütün cohort kataloqu admin işidir.
// ============================================================================

import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { listViewerCohorts } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

export const GET = withUser(async ({ viewer }) => {
  const cohorts = await listViewerCohorts(viewer);
  return ok(cohorts, { meta: { total: cohorts.length } });
});
