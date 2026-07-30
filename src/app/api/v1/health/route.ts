// ============================================================================
// src/app/api/v1/health/route.ts
// GET /api/v1/health — xidmət cavab verirmi?
//
// ⚠️ DB-yə TOXUNMUR. Sağlamlıq yoxlaması bazaya sorğu göndərsəydi hər monitor
// çağırışı SQLite faylını kilidləyərdi; "proses ayaqdadır" sualının cavabı
// üçün bu, lazımsız qiymətdir.
//
// `force-dynamic` MƏCBURİDİR: `time` sahəsi hər cavabda dəyişir, statik render
// isə build anındaki vaxtı əbədi qaytarardı.
// ============================================================================

import { API_VERSION } from "@/lib/api/openapi";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export function GET() {
  return ok({
    status: "ok" as const,
    version: API_VERSION,
    time: new Date().toISOString(),
  });
}
