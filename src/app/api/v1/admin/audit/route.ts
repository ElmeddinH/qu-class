// ============================================================================
// src/app/api/v1/admin/audit/route.ts
// GET /api/v1/admin/audit — audit jurnalı, filtr + səhifələmə.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ D — BU FAYLDA YALNIZ `GET` VAR.
// ────────────────────────────────────────────────────────────────────────────
// `POST` / `PATCH` / `DELETE` İXRAC EDİLMİR: audit jurnalı yalnız əlavə
// olunur. Route handler-də mövcud olmayan metod Next tərəfindən 405 ilə
// cavablandırılır, yəni "silmə endpoint-i" ünvan səviyyəsində belə yoxdur.
// `openapi.test.ts` sənəddə bu yol üçün yalnız `get` əməliyyatının olduğunu
// yoxlayır.
//
// ⚠️ Filtrlər UI ilə EYNİ saf moduldan gəlir (`lib/admin-filters.ts`), yəni
// `/admin/audit?ac=MODERATE` veb səhifədə və API-də eyni nəticəni verir.
// ============================================================================

import {
  AUDIT_PAGE_SIZE,
  adminSkipOf,
  parseAuditParams,
} from "@/lib/admin-filters";
import { withAdmin } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { countAuditLog, listAuditLog } from "@/services/audit.service";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async ({ viewer, searchParams }) => {
  const filters = parseAuditParams(searchParams);
  const skip = adminSkipOf(filters.page, AUDIT_PAGE_SIZE);

  const [items, total] = await Promise.all([
    listAuditLog(viewer, filters, AUDIT_PAGE_SIZE, skip),
    countAuditLog(viewer, filters),
  ]);

  return ok(items, {
    meta: { total, page: filters.page, pageSize: AUDIT_PAGE_SIZE },
    headers: { "Cache-Control": "private, no-store" },
  });
});
