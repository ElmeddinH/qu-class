// ============================================================================
// src/app/api/v1/openapi.json/route.ts
// GET /api/v1/openapi.json — Swagger UI-ın oxuduğu sənəd.
//
// ⚠️ Qovluq adı QƏSDƏN `openapi.json`-dur: Next.js route seqmentində nöqtə
// icazəlidir və ünvan məhz `/api/v1/openapi.json` olur. `openapi/route.ts` +
// `?format=json` variantı Swagger UI-da lazımsız konfiqurasiya deməkdir.
//
// ⚠️ Sənəd DB-yə TOXUNMUR — tamamilə Zod sxemlərindən qurulur, ona görə
// `force-static`-dir: build anında bir dəfə generasiya olunur və hər sorğuda
// yenidən qurulmur. Sxem dəyişəndə build də dəyişir, yəni köhnə sənəd
// verilməsi mümkün deyil.
// ============================================================================

import { NextResponse } from "next/server";

import { buildOpenApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildOpenApiDocument(), {
    headers: {
      // Sənəd build ilə birlikdə dəyişir → uzun keş təhlükəsizdir, amma
      // dev-də dərhal yenilənməsi vacibdir, ona görə qısa `max-age`.
      "cache-control": "public, max-age=60",
    },
  });
}
