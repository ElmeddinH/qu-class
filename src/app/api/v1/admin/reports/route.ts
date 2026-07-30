// ============================================================================
// src/app/api/v1/admin/reports/route.ts
// GET /api/v1/admin/reports — şikayət növbəsi (filtr + səhifələmə).
//
// 🔴 TƏLƏ A — CAVABDA MƏZMUN YOXDUR. Servis (`listReportQueue`) hədəfin yalnız
// qoruma sahələrini (`visibility`, `cohortId`, sahib, status) sorğulayır;
// `title` / `body` seçilmir, yəni JSON-da mövcud da deyil.
//
// Şikayət olunan mətnə çıxış YALNIZ veb interfeysindəki «moderasiya baxışı»
// axınındadır və o, AuditLog sətrini eyni transaksiyada ƏVVƏLCƏ yazır.
// Endpoint kimi açılmayıb: xarici skriptə "məzmunu göstər" imkanı vermək
// audit izini praktikada mənasız edərdi (avtomatlaşdırılmış toplu oxu).
// ============================================================================

import {
  MODERATION_PAGE_SIZE,
  adminSkipOf,
  parseModerationParams,
} from "@/lib/admin-filters";
import { withAdmin } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { countReportQueue, listReportQueue } from "@/services/moderation.service";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async ({ viewer, searchParams }) => {
  const filters = parseModerationParams(searchParams);
  const skip = adminSkipOf(filters.page, MODERATION_PAGE_SIZE);

  const [items, total] = await Promise.all([
    listReportQueue(viewer, filters, MODERATION_PAGE_SIZE, skip),
    countReportQueue(viewer, filters),
  ]);

  return ok(items, {
    meta: { total, page: filters.page, pageSize: MODERATION_PAGE_SIZE },
    headers: { "Cache-Control": "private, no-store" },
  });
});
