// ============================================================================
// src/features/admin/AuditFilters.tsx
// Audit jurnalının filtrləri — SERVER komponenti, adi GET forması.
//
// ⚠️ `entityType` və `action` siyahıları DB-DƏN (facet) gəlir, sabit enum-dan
// YOX: `AuditLog.entityType` tarixən model adlarını daşıyır (`Post`, `Cohort`,
// `CohortMembership`, `Report`) və Blok 8-in nailiyyət qərarları oraya enum
// dəyəri (`ACHIEVEMENT`) yazır. Sabit siyahı yazsaydıq sətirlərin bir hissəsi
// filtrdə görünməzdi (bax `services/audit.service.ts` → `listAuditFacets`).
// ============================================================================

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUDIT_PARAMS, type AuditFilterState } from "@/lib/admin-filters";
import { auditActionLabel } from "@/lib/labels";
import type { AuditFacets } from "@/services/audit.service";

interface AuditFiltersProps {
  filters: AuditFilterState;
  facets: AuditFacets;
}

function SelectField({
  id,
  name,
  label,
  value,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-caption text-text-secondary">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ku-green"
      >
        {children}
      </select>
    </div>
  );
}

export function AuditFilters({ filters, facets }: AuditFiltersProps) {
  return (
    <form
      method="get"
      action="/admin/audit"
      aria-label="Audit filtrləri"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SelectField
          id="audit-actor"
          name={AUDIT_PARAMS.actor}
          label="Aktyor"
          value={filters.actor ?? ""}
        >
          <option value="">Hamısı</option>
          {facets.actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.label} ({actor.count})
            </option>
          ))}
        </SelectField>

        <SelectField
          id="audit-entity"
          name={AUDIT_PARAMS.entityType}
          label="Obyekt növü"
          value={filters.entityType ?? ""}
        >
          <option value="">Hamısı</option>
          {facets.entityTypes.map((entity) => (
            <option key={entity.value} value={entity.value}>
              {entity.value} ({entity.count})
            </option>
          ))}
        </SelectField>

        <SelectField
          id="audit-action"
          name={AUDIT_PARAMS.action}
          label="Əməliyyat"
          value={filters.action ?? ""}
        >
          <option value="">Hamısı</option>
          {facets.actions.map((action) => (
            <option key={action.value} value={action.value}>
              {auditActionLabel(action.value)} ({action.count})
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-from" className="text-caption text-text-secondary">
            Tarixdən
          </Label>
          <Input
            id="audit-from"
            type="date"
            name={AUDIT_PARAMS.from}
            defaultValue={filters.from ?? ""}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-to" className="text-caption text-text-secondary">
            Tarixə qədər
          </Label>
          <Input
            id="audit-to"
            type="date"
            name={AUDIT_PARAMS.to}
            defaultValue={filters.to ?? ""}
            className="rounded-input"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          Filtrlə
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/audit">Sıfırla</Link>
        </Button>
      </div>
    </form>
  );
}
