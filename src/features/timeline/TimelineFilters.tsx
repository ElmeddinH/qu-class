"use client";

// ============================================================================
// src/features/timeline/TimelineFilters.tsx
// Xronologiyanın üç filtri (spec §10): tədris ili · kateqoriya · mənbə növü.
//
// Vəziyyət URL-dədir (`filter-state.ts` → nuqs), yəni link paylaşıla bilir,
// brauzerin geri düyməsi işləyir və server komponenti hər dəyişiklikdə süzgəci
// DB-də yenidən tətbiq edir.
//
// ⚠️ TƏDRİS İLİ SİYAHISI SERVERDƏN gəlir (`listTimeline` → `academicYears`) və
// məxfilik şərtindən keçmişdir. Burada hardcode il siyahısı YOXDUR: görünməyən
// qeydin ili panelə düşsəydi, "həmin ildə nəsə var" faktı sızardı.
//
// ⚠️ Radix `Select` boş sətir dəyərini qəbul etmir → "hamısı" üçün sentinel.
// ============================================================================

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POST_CATEGORY_VALUES, TIMELINE_SOURCE_TYPE_VALUES } from "@/lib/enums";
import type { PostCategory, TimelineSourceType } from "@/lib/enums";
import { timelineSourceLabel } from "@/lib/labels";
import { activeTimelineFilterCount } from "@/lib/timeline-filters";
import { POST_CATEGORY_META } from "@/features/feed/catalog";

import { useTimelineFilters } from "./filter-state";

/** Radix Select "hamısı" seçimi — boş sətir işlədilə bilmir. */
const ALL_VALUE = "__all__";

interface TimelineFiltersProps {
  /** Serverdən gələn, məxfilikdən keçmiş tədris illəri. */
  academicYears: string[];
}

export function TimelineFilters({ academicYears }: TimelineFiltersProps) {
  const { state, patch, clearAll } = useTimelineFilters();
  const active = activeTimelineFilterCount(state);

  return (
    <section
      aria-label="Xronologiya filtrləri"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="timeline-year">Tədris ili</Label>
          <Select
            value={state.academicYear ?? ALL_VALUE}
            onValueChange={(next) =>
              patch({ year: next === ALL_VALUE ? null : next })
            }
          >
            <SelectTrigger id="timeline-year" className="rounded-input">
              <SelectValue placeholder="Bütün illər" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Bütün illər</SelectItem>
              {academicYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timeline-category">Kateqoriya</Label>
          <Select
            value={state.category ?? ALL_VALUE}
            onValueChange={(next) =>
              patch({ category: next === ALL_VALUE ? null : (next as PostCategory) })
            }
          >
            <SelectTrigger id="timeline-category" className="rounded-input">
              <SelectValue placeholder="Bütün kateqoriyalar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Bütün kateqoriyalar</SelectItem>
              {POST_CATEGORY_VALUES.map((category) => (
                <SelectItem key={category} value={category}>
                  {POST_CATEGORY_META[category].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timeline-source">Mənbə</Label>
          <Select
            value={state.sourceType ?? ALL_VALUE}
            onValueChange={(next) =>
              patch({ source: next === ALL_VALUE ? null : (next as TimelineSourceType) })
            }
          >
            <SelectTrigger id="timeline-source" className="rounded-input">
              <SelectValue placeholder="Bütün mənbələr" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Bütün mənbələr</SelectItem>
              {TIMELINE_SOURCE_TYPE_VALUES.map((source) => (
                <SelectItem key={source} value={source}>
                  {timelineSourceLabel(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {active > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {state.academicYear ? (
            <FilterChip label="Tədris ili" value={state.academicYear} onClear={() => patch({ year: null })} />
          ) : null}
          {state.category ? (
            <FilterChip
              label="Kateqoriya"
              value={POST_CATEGORY_META[state.category].label}
              onClear={() => patch({ category: null })}
            />
          ) : null}
          {state.sourceType ? (
            <FilterChip
              label="Mənbə"
              value={timelineSourceLabel(state.sourceType)}
              onClear={() => patch({ source: null })}
            />
          ) : null}

          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            Filtrləri sıfırla
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <Badge variant="outline" className="gap-1 py-1 pl-3 pr-1 text-caption font-normal">
      <span className="text-text-secondary">{label}:</span>
      <span className="text-text-primary">{value}</span>
      <button
        type="button"
        aria-label={`«${value}» filtrini götür`}
        className="rounded-badge p-1 text-text-secondary hover:bg-background hover:text-text-primary"
        onClick={onClear}
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </Badge>
  );
}

/** Boş vəziyyətdə göstərilən "filtrləri sıfırla" düyməsi (client — nuqs). */
export function TimelineResetButton() {
  const { clearAll } = useTimelineFilters();

  return (
    <Button type="button" variant="outline" size="sm" onClick={clearAll}>
      Filtrləri sıfırla
    </Button>
  );
}
