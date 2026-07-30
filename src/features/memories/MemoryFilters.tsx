"use client";

// ============================================================================
// src/features/memories/MemoryFilters.tsx
// Xatirələrin iki filtri (spec §11): 8 növ + «yalnız məkanla bağlı olanlar».
//
// Vəziyyət URL-dədir (`filter-state.ts` → nuqs), yəni link paylaşıla bilir,
// brauzerin geri düyməsi işləyir və server komponenti hər dəyişiklikdə süzgəci
// DB-də yenidən tətbiq edir (JS-də filtrləmə qadağandır — CLAUDE.md §5).
//
// ⚠️ Radix `Select` boş sətir dəyərini qəbul etmir → "hamısı" üçün sentinel.
// ⚠️ TƏLƏ T29: e2e-də bu seçici `getByRole("combobox")` ilə tapılır.
// ============================================================================

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemoryType } from "@/lib/enums";
import { activeMemoryFilterCount } from "@/lib/memory-filters";

import { MEMORY_TYPE_META, MEMORY_TYPE_OPTIONS } from "./catalog";
import { useMemoryFilters } from "./filter-state";

/** Radix Select "hamısı" seçimi — boş sətir işlədilə bilmir. */
const ALL_VALUE = "__all__";

export function MemoryFilters() {
  const { state, patch, clearAll } = useMemoryFilters();
  const active = activeMemoryFilterCount(state);

  return (
    <section
      aria-label="Xatirə filtrləri"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds print:hidden"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="memory-type">Xatirə növü</Label>
          <Select
            value={state.type ?? ALL_VALUE}
            onValueChange={(next) =>
              patch({ type: next === ALL_VALUE ? null : (next as MemoryType) })
            }
          >
            <SelectTrigger id="memory-type" className="rounded-input">
              <SelectValue placeholder="Bütün növlər" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Bütün növlər</SelectItem>
              {MEMORY_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {MEMORY_TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3 md:pt-8">
          <Checkbox
            id="memory-place-only"
            checked={state.placeOnly}
            onCheckedChange={(checked) => patch({ placeOnly: checked === true })}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="memory-place-only" className="font-normal">
              Yalnız məkanla bağlı olanlar
            </Label>
            <p className="text-caption text-text-secondary">
              Xankəndi bələdçisindəki bir yerə bağlanmış «sevimli yer» xatirələri.
            </p>
          </div>
        </div>
      </div>

      {active > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {state.type ? (
            <FilterChip
              label="Növ"
              value={MEMORY_TYPE_META[state.type].label}
              onClear={() => patch({ type: null })}
            />
          ) : null}
          {state.placeOnly ? (
            <FilterChip
              label="Məkan"
              value="Yalnız məkanla bağlı"
              onClear={() => patch({ placeOnly: false })}
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
export function MemoryResetButton() {
  const { clearAll } = useMemoryFilters();

  return (
    <Button type="button" variant="outline" size="sm" onClick={clearAll}>
      Filtrləri sıfırla
    </Button>
  );
}
