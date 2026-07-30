// ============================================================================
// src/features/admin/ReportFilters.tsx
// Şikayət növbəsinin filtrləri — SERVER komponenti, hər çip ƏSL `href`-dir.
//
// ⚠️ nuqs / TanStack Query İŞLƏDİLMİR: `(admin)` route qrupunda `Providers`
// YOXDUR (T18 — `QueryClientProvider` yalnız `(app)`-dədir və `NuqsAdapter` də
// orada qurulur). Client filtri əlavə etsək panel «No QueryClient set» ilə 500
// verərdi. Üstəlik link-əsaslı filtr admin üçün daha yaxşıdır: vəziyyət
// paylaşıla bilən ünvandır və sağ klik → «linki kopyala» işləyir.
//
// ⚠️ Filtr dəyişəndə səhifə 1-ə qayıdır — 5-ci səhifədə status dəyişdirsək
// nəticə boş görünərdi (klassik səhifələmə tələsi).
// ============================================================================

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  FIRST_ADMIN_PAGE,
  moderationHref,
  type ModerationFilterState,
} from "@/lib/admin-filters";
import {
  REPORT_ENTITY_TYPE_VALUES,
  REPORT_REASON_VALUES,
  REPORT_STATUS_VALUES,
} from "@/lib/enums";
import {
  reportEntityTypeLabel,
  reportReasonLabel,
  reportStatusLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  filters: ModerationFilterState;
  /** Status üzrə saylar — çipin yanında göstərilir. */
  counts: Record<string, number>;
}

interface ChipGroupProps {
  label: string;
  options: Array<{ value: string; label: string; count?: number }>;
  active: string | null;
  hrefFor: (value: string | null) => string;
}

function ChipGroup({ label, options, active, hrefFor }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-text-secondary">{label}</span>
      <div className="flex flex-wrap gap-2">
        <FilterChip href={hrefFor(null)} isActive={active === null}>
          Hamısı
        </FilterChip>
        {options.map((option) => (
          <FilterChip
            key={option.value}
            href={hrefFor(option.value)}
            isActive={active === option.value}
          >
            {option.label}
            {option.count === undefined ? null : (
              <Badge variant="outline" className="ml-2 font-normal">
                {option.count}
              </Badge>
            )}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "inline-flex items-center rounded-badge border px-3 py-1 text-caption transition-colors",
        isActive
          ? "border-ku-green bg-ku-green text-white"
          : "border-border bg-surface text-text-primary hover:bg-ku-soft",
      )}
    >
      {children}
    </Link>
  );
}

export function ReportFilters({ filters, counts }: ReportFiltersProps) {
  const reset = { ...filters, page: FIRST_ADMIN_PAGE };

  return (
    <section
      aria-label="Şikayət filtrləri"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <ChipGroup
        label="Status"
        active={filters.status}
        options={REPORT_STATUS_VALUES.map((value) => ({
          value,
          label: reportStatusLabel(value),
          count: counts[value] ?? 0,
        }))}
        hrefFor={(value) =>
          moderationHref({
            ...reset,
            status: value as ModerationFilterState["status"],
          })
        }
      />

      <ChipGroup
        label="Növ"
        active={filters.entityType}
        options={REPORT_ENTITY_TYPE_VALUES.map((value) => ({
          value,
          label: reportEntityTypeLabel(value),
        }))}
        hrefFor={(value) =>
          moderationHref({
            ...reset,
            entityType: value as ModerationFilterState["entityType"],
          })
        }
      />

      <ChipGroup
        label="Səbəb"
        active={filters.reason}
        options={REPORT_REASON_VALUES.map((value) => ({
          value,
          label: reportReasonLabel(value),
        }))}
        hrefFor={(value) =>
          moderationHref({
            ...reset,
            reason: value as ModerationFilterState["reason"],
          })
        }
      />
    </section>
  );
}
