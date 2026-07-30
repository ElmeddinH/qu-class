// ============================================================================
// src/app/api/v1/auth/session/route.ts
// GET /api/v1/auth/session — "kim mənəm?"
//
// 🔴 ANONİM SORĞU 200 + `data: null` ALIR, 401 YOX.
// "Kim mənəm?" sualının cavabı "heç kim" ola bilər və bu, XƏTA DEYİL. 401
// qaytarsaydıq müştəri "sessiya yoxdur" ilə "sorğu sındı" hallarını ayırd edə
// bilməzdi; Swagger UI-da da hər açılışda qırmızı cavab görünərdi.
//
// ⚠️ `withViewer` işlədilir, `withUser` YOX — endpoint qəsdən anonimə açıqdır.
//
// ⚠️ Cavabda `passwordHash`, e-poçt doğrulama detalı və digər həssas sahə
// YOXDUR (`SessionSchema`). `cohortIds` / `moderatedCohortIds` isə lazımdır:
// müştəri hansı sinif endpoint-lərini çağıra biləcəyini bilməlidir.
// ============================================================================

import { withViewer } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withViewer(async ({ viewer }) => {
  if (viewer.kind !== "USER") return ok(null);

  const sessionUser = await getSessionUser();
  if (!sessionUser) return ok(null);

  return ok({
    userId: viewer.userId,
    email: sessionUser.email,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName,
    systemRole: viewer.systemRole,
    stage: sessionUser.stage,
    cohortIds: viewer.cohortIds,
    moderatedCohortIds: viewer.moderatedCohortIds,
  });
});
