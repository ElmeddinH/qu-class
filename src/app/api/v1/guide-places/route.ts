// ============================================================================
// src/app/api/v1/guide-places/route.ts
// GET /api/v1/guide-places?category=…  — Xankəndi bələdçisi (spec §3).
//
// ⚠️ `Viewer` ALMIR — redaksiya məzmunu (`content.service.ts` başlığı).
//
// ⚠️ Cavabda `address` / `latitude` / `longitude` VAR. CLAUDE.md-dəki "ictimai
// görünüşdə dəqiq ünvan/koordinat heç vaxt göstərilmir" qaydası İSTİFADƏÇİ
// məkanına aiddir (`coarsenLocation`, Where Are We Now aqreqasiyası).
// `GuidePlace` isə şəhərin ictimai obyektidir — aptek, market, dayanacaq — və
// ünvanı bələdçinin bütün mənasıdır.
// ============================================================================

import { parseQuery } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { GuidePlacesQuerySchema } from "@/lib/api/schemas";
import { listGuidePlaces } from "@/services/content.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = parseQuery(GuidePlacesQuerySchema, request);
  if (!query.ok) return query.response;

  const items = await listGuidePlaces(query.data.category);
  return ok(items, { meta: { total: items.length } });
}
