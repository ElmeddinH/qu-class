// ============================================================================
// src/app/api/v1/search/route.ts
// GET /api/v1/search?q=… — qlobal axtarış [M16].
//
// ⚠️ MÖVCUD `/api/search` KÖÇÜRÜLMƏDİ (TƏLƏ F): ⌘K palitrası onu birbaşa
// çağırır və cavab forması (`SearchResults`) client müqaviləsidir. Bu endpoint
// EYNİ servisi (`searchEverything`) zərflə qaytarır.
//
// ⚠️ Bir davranış fərqi var və sənəddə yazılıb: köhnə endpoint çox qısa sorğuda
// BOŞ NƏTİCƏ qaytarır (palitra hər hərfdə çağırır, orada xəta göstərmək olmaz),
// v1 isə 422 verir — REST müştərisi üçün səssiz boş cavab səhvi gizlədir.
//
// ⚠️ `withViewer` — anonim sorğuya da cavab verir. Hər növ ÖZ görünürlük
// köməkçisindən keçir; istifadəçi bölməsi anonimə HƏMİŞƏ boş qayıdır, çünki
// üzv siyahısı sinif daxili məlumatdır.
// ============================================================================

import { parseQuery, withViewer } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { SearchQuerySchema } from "@/lib/api/schemas";
import { searchEverything } from "@/services/search.service";

export const dynamic = "force-dynamic";

/** Uzun sorğu sətri DB-ni yükləməsin — praktikada ad-soyad qısadır. */
const MAX_TERM_LENGTH = 100;

export const GET = withViewer(async ({ viewer, searchParams }) => {
  const query = parseQuery(SearchQuerySchema, searchParams);
  if (!query.ok) return query.response;

  const results = await searchEverything(
    viewer,
    query.data.q.slice(0, MAX_TERM_LENGTH),
    query.data.take,
  );

  return ok(results);
});
