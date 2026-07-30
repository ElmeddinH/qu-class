// ============================================================================
// src/features/admin/AuditTable.tsx
// `/admin/audit` — audit jurnalı.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ D — YALNIZ OXU. SİLMƏ / REDAKTƏ / «TƏMİZLƏ» DÜYMƏSİ YOXDUR.
// ────────────────────────────────────────────────────────────────────────────
// Audit jurnalını silə bilən admin auditin ÖZÜNÜ mənasız edir. Qadağa üç
// qatdadır: bu ekran (düymə yoxdur) · `services/audit.service.ts` (silmə /
// redaktə funksiyası İXRAC ETMİR) · `/api/v1/admin/audit` (yalnız `GET`).
// Hər üçü ayrıca testlə bərkidilib.
//
// ⚠️ `metadata` JSON SƏTRİDİR (SQLite-da JSON tipi yoxdur). Parse uğursuz
// olarsa səhifə SINMIR — `parseAuditMetadata` `null` qaytarır və xam mətn
// göstərilir.
// ============================================================================

import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { Badge } from "@/components/ui/badge";
import {
  AUDIT_PAGE_SIZE,
  adminPageCount,
  adminSkipOf,
  auditHref,
  type AuditFilterState,
} from "@/lib/admin-filters";
import { parseAuditMetadata } from "@/lib/admin-rules";
import { getViewer } from "@/lib/auth";
import { auditActionLabel } from "@/lib/labels";
import {
  countAuditLog,
  listAuditFacets,
  listAuditLog,
  type AuditEntry,
} from "@/services/audit.service";
import { exactDateTime } from "@/utils/date";

import { AdminPageHeader } from "./AdminPageHeader";
import { AuditExportButton } from "./AuditExportButton";
import { AuditFilters } from "./AuditFilters";

interface AuditTableProps {
  filters: AuditFilterState;
}

export async function AuditTable({ filters }: AuditTableProps) {
  const viewer = await getViewer();
  const skip = adminSkipOf(filters.page, AUDIT_PAGE_SIZE);

  const [entries, total, facets] = await Promise.all([
    listAuditLog(viewer, filters, AUDIT_PAGE_SIZE, skip),
    countAuditLog(viewer, filters),
    listAuditFacets(viewer),
  ]);

  const pageCount = adminPageCount(total, AUDIT_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Audit jurnalı"
        description="Jurnal YALNIZ ƏLAVƏ OLUNUR. Burada silmə və redaktə yolu yoxdur — nə bu ekranda, nə servisdə, nə də API-də. Silinə bilən audit auditin özünü mənasız edərdi."
      >
        <AuditExportButton filters={filters} />
      </AdminPageHeader>

      <AuditFilters filters={filters} facets={facets} />

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Bu filtrlərlə qeyd yoxdur"
          description="Tarix aralığını genişləndirin və ya filtrləri sıfırlayın."
          action={{ href: "/admin/audit", label: "Filtrləri sıfırla" }}
        />
      ) : (
        <>
          <p className="text-small text-text-secondary">
            {total} qeyd · səhifə {Math.min(filters.page, pageCount)} / {pageCount}
          </p>

          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-small">
              <caption className="sr-only">Audit jurnalı sətirləri</caption>
              <thead className="border-b border-border bg-background text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 pl-6 font-medium">
                    Tarix
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Əməliyyat
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Obyekt
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Aktyor
                  </th>
                  <th scope="col" className="px-4 py-3 pr-6 font-medium">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>

          <PagerNav
            page={filters.page}
            pageCount={pageCount}
            hrefFor={(page) => auditHref({ ...filters, page })}
            label="Audit səhifələri"
          />
        </>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const metadata = parseAuditMetadata(entry.metadata);

  return (
    <tr className="border-b border-border/60 align-top">
      <th scope="row" className="px-4 py-3 pl-6 text-left font-normal text-text-secondary">
        {exactDateTime(entry.createdAt)}
      </th>
      <td className="px-4 py-3">
        <Badge variant="outline" className="font-normal">
          {auditActionLabel(entry.action)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {entry.entityType}
        <span className="block text-caption">{entry.entityId}</span>
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {entry.actor === null
          ? "Sistem"
          : `${entry.actor.firstName} ${entry.actor.lastName}`}
      </td>
      <td className="px-4 py-3 pr-6 text-caption text-text-secondary">
        {metadata === null ? (
          // ⚠️ Parse uğursuzdursa XAM mətn — səhifə sınmır.
          (entry.metadata ?? "—")
        ) : (
          <ul className="flex flex-col gap-1">
            {Object.entries(metadata).map(([key, value]) => (
              <li key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}
