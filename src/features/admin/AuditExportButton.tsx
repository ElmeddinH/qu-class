// ============================================================================
// src/features/admin/AuditExportButton.tsx
// Audit jurnalının CSV ixracı.
//
// ⚠️ İxrac OXU səthinin davamıdır (TƏLƏ D): jurnalı çıxarmaq onu dəyişmək
// deyil. Burada silmə / redaktə düyməsi YOXDUR və olmayacaq.
// ============================================================================

import { serializeAuditParams, type AuditFilterState } from "@/lib/admin-filters";

import { exportAuditCsvAction } from "./actions";
import { CsvDownloadButton } from "./CsvDownloadButton";

export function AuditExportButton({ filters }: { filters: AuditFilterState }) {
  return (
    <CsvDownloadButton
      label="CSV ixrac"
      params={Object.fromEntries(serializeAuditParams(filters))}
      action={exportAuditCsvAction}
    />
  );
}
