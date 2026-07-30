// ============================================================================
// src/app/api/v1/cohorts/{slug}/support/route.ts
// GET /api/v1/cohorts/{slug}/support — dəstək təklifləri (spec §9).
//
// 🔴 ÜÇÜNCÜ, MÜSTƏQİL RAZILIQ: `User.openToSupport`. Filtr servisdədir
// (`listCohortSupportOffers`) — endpoint əlavə şərt yazmır.
//
// 🔴 ƏLAQƏ MƏLUMATI CAVABDA YOXDUR: `phone` / `personalEmail` default
// `PRIVATE`-dır və bu səth onları oxumur belə. Müştəri əlaqə üçün profil
// endpoint-inə müraciət edir və orada `redactProfile` işləyir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { listCohortSupportOffers } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(async ({ viewer, params }) => {
  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const offers = await listCohortSupportOffers(viewer, scope.cohort.id);

  return ok(offers, { meta: { total: offers.length } });
});
