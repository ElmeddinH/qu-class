// ============================================================================
// src/app/api/v1/content/pages/{slug}/route.ts
// GET /api/v1/content/pages/{slug} — tam səhifə (Markdown gövdə ilə).
//
// ⚠️ `Viewer` ALMIR (`content.service.ts` başlığındaki səbəb): `ContentPage`
// universitetin REDAKSİYA məzmunudur, şəxsi məlumat daşımır.
//
// 🔴 YEGANƏ SÜZGƏC `isPublished`-dir və o, SERVİSDƏDİR. Qaralama səhifə HEÇ
// KİMƏ göstərilmir — bura `?includeDrafts=` kimi parametr ƏLAVƏ ETMƏ.
//
// ⚠️ Tapılmayan slug → 404. Siyahı endpoint-i (`GET /content/pages`) `body`
// qaytarmır; tam mətn YALNIZ buradadır.
// ============================================================================

import { withViewer } from "@/lib/api/guard";
import { notFound, ok } from "@/lib/api/respond";
import { getContentPage } from "@/services/content.service";

export const dynamic = "force-dynamic";

export const GET = withViewer<{ slug: string }>(async ({ params }) => {
  const page = await getContentPage(params.slug);
  if (!page) return notFound("Səhifə tapılmadı.");

  return ok(page);
});
