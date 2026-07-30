// ============================================================================
// src/features/admin/UserExportButton.tsx
// İstifadəçi cədvəlinin CSV ixracı — filtr vəziyyəti ilə birlikdə.
//
// SERVER komponentidir: filtr vəziyyətini URL parametrlərinə çevirib client
// düyməsinə ötürür. Belə olanda `AdminUserFilterState` obyekti sərhəddən
// keçmir, yalnız düz `Record<string, string>` keçir (serialləşən forma).
//
// 🔴 İxracın MƏZMUNU `redactProfile`-dan keçir — bax
// `services/admin-users.service.ts` → `ADMIN_USER_EXPORT_COLUMNS`.
// ============================================================================

import {
  serializeAdminUserParams,
  type AdminUserFilterState,
} from "@/lib/admin-filters";

import { exportUsersCsvAction } from "./actions";
import { CsvDownloadButton } from "./CsvDownloadButton";

export function UserExportButton({ filters }: { filters: AdminUserFilterState }) {
  return (
    <CsvDownloadButton
      label="CSV ixrac"
      params={Object.fromEntries(serializeAdminUserParams(filters))}
      action={exportUsersCsvAction}
    />
  );
}
