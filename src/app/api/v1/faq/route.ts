// ============================================================================
// src/app/api/v1/faq/route.ts
// GET /api/v1/faq?category=GENERAL|ADMISSION|CAMPUS|PLATFORM
//
// ⚠️ `Viewer` ALMIR — redaksiya məzmunu (`content.service.ts` başlığı).
// `category` ŞƏRTİDİR: açılış səhifəsi bütün sualları bir akkordeonda göstərir.
// ============================================================================

import { parseQuery } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { FaqQuerySchema } from "@/lib/api/schemas";
import { listFaqs } from "@/services/content.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = parseQuery(FaqQuerySchema, request);
  if (!query.ok) return query.response;

  const items = await listFaqs(query.data.category);
  return ok(items, { meta: { total: items.length } });
}
