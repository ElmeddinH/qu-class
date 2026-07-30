// ============================================================================
// src/app/api/v1/faculties/route.ts
// GET /api/v1/faculties — fakültə → ixtisas → qəbul ili kataloqu.
//
// ⚠️ `Viewer` ALMIR və bu, `services/academic.service.ts` başlığındaki səbəbə
// görədir: akademik struktur İCTİMAİ kataloqdur (qeydiyyat forması onu giriş
// etməmiş ziyarətçiyə göstərməlidir), şəxsi məlumat daşımır. Məxfilik mühərriki
// İSTİFADƏÇİ məzmununa (Post / Memory / Achievement / Event / profil) aiddir.
//
// Endpoint qeydiyyatın ön şərtidir: `POST /auth/register` `programId` gözləyir
// və müştəri onu buradan alır.
// ============================================================================

import { ok } from "@/lib/api/respond";
import { listRegistrationCatalog } from "@/services/academic.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const faculties = await listRegistrationCatalog();
  return ok(faculties, { meta: { total: faculties.length } });
}
