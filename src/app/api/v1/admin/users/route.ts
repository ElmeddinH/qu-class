// ============================================================================
// src/app/api/v1/admin/users/route.ts
// GET /api/v1/admin/users — istifadəçi cədvəli (axtarış · filtr · səhifələmə).
//
// 🔴 CAVAB `redactProfile`-DAN KEÇİR. Admin olmaq `PRIVATE` sahəni görmək
// demək DEYİL: `currentCity` istifadəçinin görünürlük seçimindən asılıdır və
// `phone` / `personalEmail` ÜMUMİYYƏTLƏ sorğulanmır (bax
// `services/admin-users.service.ts` → `ADMIN_USER_SELECT`).
//
// ⚠️ YAZMA ƏMƏLİYYATI YOXDUR. Rol dəyişikliyi və deaktivasiya v1-də
// AÇILMAYIB: onlar «son admin» və «özünü endirmə» qorumaları ilə birlikdə
// gəlir və toplu skript üçün nəzərdə tutulmayıb. Veb interfeysi tək yoldur.
// ============================================================================

import {
  ADMIN_USER_PAGE_SIZE,
  adminSkipOf,
  parseAdminUserParams,
} from "@/lib/admin-filters";
import { withAdmin } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { listAdminUsers } from "@/services/admin-users.service";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async ({ viewer, searchParams }) => {
  const filters = parseAdminUserParams(searchParams);
  const skip = adminSkipOf(filters.page, ADMIN_USER_PAGE_SIZE);

  const page = await listAdminUsers(viewer, filters, ADMIN_USER_PAGE_SIZE, skip);

  return ok(page.items, {
    meta: { total: page.total, page: filters.page, pageSize: ADMIN_USER_PAGE_SIZE },
    headers: { "Cache-Control": "private, no-store" },
  });
});
