// ============================================================================
// src/app/api/v1/cohorts/{slug}/stats/where-are-we-now/route.ts
// GET — "İndi haradayıq?" aqreqasiyası (spec §13, [M11]).
//
// 🔴 `withUser` — ANONİM SORĞU ÜÇÜN YOXDUR. Bu, SİNİF DAXİLİ analitikadır:
// aqreqat olsa da bir sinfin karyera mənzərəsini açıq internetə vermək
// üzvlərin gözlədiyi şey deyil. `withViewer` işlətsək anonim sorğu yalnız
// `PUBLIC` qeydləri görər — yəni cavab BOŞ olmazdı, "az" olardı və bu, daha
// pisdir: sızma səssiz olar.
//
// 🔴 ENDPOINT AQREQASİYA MƏNTİQİ YAZMIR (CLAUDE.md §4). Yalnız viewer qurur,
// sinfi həll edir və servisi çağırır. k-anonimlik, razılıq süzgəci və yer
// eskalasiyası `lib/career-stats.ts` + `services/stats.service.ts`-dədir —
// burada təkrarlansaydı iki səth iki fərqli cavab verə bilərdi.
//
// ⚠️ `Cache-Control: private, no-store` MƏCBURİDİR. Cavab viewer-dən ASILIDIR
// (görünürlük süzgəci): ortaq keş (proxy, CDN) bir istifadəçinin gördüyü
// bölgünü başqasına verə bilər. `private` ortaq keşi bağlayır, `no-store` isə
// brauzer diskinə yazılmasını da dayandırır — ortaq kompüterdə açıq qalan
// sessiyadan sonra "geri" düyməsi ilə oxunmasın.
//
// ⚠️ İCAZƏSİZ / MÖVCUD OLMAYAN SİNİF → EYNİ 404 (`resolveCohortScope`).
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { getCareerOutcomeStats } from "@/services/stats.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(async ({ viewer, params }) => {
  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const stats = await getCareerOutcomeStats(viewer, {
    cohortId: scope.cohort.id,
    viewerId: viewer.userId,
  });

  return ok(stats, { headers: { "Cache-Control": "private, no-store" } });
});
