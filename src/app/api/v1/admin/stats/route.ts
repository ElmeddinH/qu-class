// ============================================================================
// src/app/api/v1/admin/stats/route.ts
// GET /api/v1/admin/stats — idarə panelinin rəqəmləri.
//
// 🔴 `withAdmin` — rol TOKEN-dən deyil, BAZADAN yoxlanılır (TƏLƏ B).
// 🔴 TƏLƏ G — cavabda şəxsə bağlı sıralama YOXDUR: yalnız struktur saylar və
// aqreqat həftəlik seriya. Servis `authorId` belə seçmir.
// ============================================================================

import { withAdmin } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { getAdminActivitySeries, getAdminDashboardStats } from "@/services/admin.service";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async ({ viewer }) => {
  const [stats, series] = await Promise.all([
    getAdminDashboardStats(viewer),
    getAdminActivitySeries(viewer),
  ]);

  return ok(
    { ...stats, series },
    // ⚠️ İdarəetmə rəqəmləri ara keşlərə düşməməlidir.
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
