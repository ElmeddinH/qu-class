// ============================================================================
// src/app/api/v1/content/pages/route.ts
// GET /api/v1/content/pages?section=UNIVERSITY|CAMPUS|SERVICES|NEWCOMERS
//
// ⚠️ `Viewer` ALMIR (`content.service.ts` başlığındaki səbəb): `ContentPage`
// universitetin REDAKSİYA məzmunudur. Yeganə süzgəc `isPublished`-dir —
// qaralama səhifə heç kimə göstərilmir.
//
// ⚠️ `section` MƏCBURİDİR. Bütün bölmələri birdən qaytarmaq açılış səhifəsinin
// heç bir bölməsinə lazım deyil və cavabı lüzumsuz böyüdür.
// ============================================================================

import { parseQuery } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { ContentPagesQuerySchema } from "@/lib/api/schemas";
import { listContentPages } from "@/services/content.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = parseQuery(ContentPagesQuerySchema, request);
  if (!query.ok) return query.response;

  const pages = await listContentPages(query.data.section);
  return ok(pages, { meta: { total: pages.length } });
}
