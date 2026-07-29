"use client";

// ============================================================================
// src/features/directory/DirectoryFilters.tsx
// 13 filtrin paneli (spec §8) + aktiv filtr çipləri.
//
// Vəziyyət URL-dədir (`filter-state.ts` → nuqs), yəni:
//   · link paylaşıla bilir
//   · brauzerin geri düyməsi işləyir
//   · server komponenti hər dəyişiklikdə yenidən süzgəci DB-də tətbiq edir
//
// ⚠️ Seçim siyahıları (`facets`) SERVERDƏN gəlir və hər biri məxfilik
// şərtindən keçmişdir (`listDirectoryFacets`). Burada hardcode siyahı YOXDUR —
// "Bakı (12)" yazısındaki 12 rəqəmi də DB-də süzülmüş saydır.
//
// ⚠️ Radix `Select` boş sətir dəyərini qəbul etmir (o, "seçim yoxdur" üçün
// ehtiyatdadır), ona görə "hamısı" seçimi üçün ayrı sentinel dəyər işlədilir.
//
// Mobil: panel `Sheet`-ə keçir (KUDS §16 — sidebar mobil ekranda Sheet).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DIRECTORY_FILTERS,
  DIRECTORY_FILTER_KEYS,
  activeFilterCount,
  directoryFilterDef,
  type DirectoryFilterKey,
} from "@/lib/directory-filters";
import type { DirectoryFacetOption, DirectoryFacets } from "@/services/user.service";

import { activeValueLabel, facetOptionLabel } from "./labels";
import {
  useDirectoryFilters,
  type DirectoryFilterController,
  type DirectoryUrlPatch,
} from "./filter-state";

/** Radix Select "hamısı" seçimi — boş sətir işlədilə bilmir. */
const ALL_VALUE = "__all__";

/** Ad sahəsində hər hərfdə server sorğusu getməsin. */
const NAME_DEBOUNCE_MS = 300;

interface DirectoryFiltersProps {
  facets: DirectoryFacets;
}

// ---------------------------------------------------------------------------
// Ad axtarışı — debounce ilə
// ---------------------------------------------------------------------------

function NameFilter({ controller }: { controller: DirectoryFilterController }) {
  const { state, patch } = controller;
  const [draft, setDraft] = useState(state.name ?? "");

  /**
   * URL-dən gələn dəyər xaricdən dəyişəndə (geri düyməsi, "təmizlə") input
   * sinxronlaşdırılmalıdır. `pushed` referansı bizim özümüzün yazdığımız
   * dəyəri saxlayır ki, öz yazımız yazı zamanı kursoru geri atmasın.
   */
  const pushed = useRef(state.name ?? "");

  useEffect(() => {
    const urlValue = state.name ?? "";
    if (urlValue !== pushed.current) {
      pushed.current = urlValue;
      setDraft(urlValue);
    }
  }, [state.name]);

  useEffect(() => {
    if (draft === pushed.current) return;

    const timer = setTimeout(() => {
      pushed.current = draft;
      patch({ name: draft.trim() === "" ? null : draft.trim() });
    }, NAME_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, patch]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="directory-name">{DIRECTORY_FILTERS.name.label}</Label>
      <Input
        id="directory-name"
        type="search"
        value={draft}
        placeholder="Məsələn: Aysel"
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tək seçim (select)
// ---------------------------------------------------------------------------

interface SelectFilterProps {
  filterKey: Exclude<DirectoryFilterKey, "name" | "interest" | "language" | "club">;
  options: DirectoryFacetOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

function SelectFilter({ filterKey, options, value, onChange }: SelectFilterProps) {
  const def = directoryFilterDef(filterKey);

  // Boş facet-i göstərmək mənasızdır: seçim yoxdur, yer tutur.
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`directory-${filterKey}`}>{def.label}</Label>
      <Select
        value={value ?? ALL_VALUE}
        onValueChange={(next) => onChange(next === ALL_VALUE ? null : next)}
      >
        <SelectTrigger id={`directory-${filterKey}`} className="rounded-input">
          <SelectValue placeholder={def.placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{def.placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {facetOptionLabel(filterKey, option)} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Çox seçim (multi)
// ---------------------------------------------------------------------------

interface MultiFilterProps {
  filterKey: "interest" | "language" | "club";
  options: DirectoryFacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

function MultiFilter({ filterKey, options, selected, onToggle }: MultiFilterProps) {
  const def = directoryFilterDef(filterKey);

  if (options.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-small font-medium text-text-primary">{def.label}</legend>
      <div className="scrollbar-thin flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
        {options.map((option) => {
          const id = `directory-${filterKey}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
              <Label htmlFor={id} className="text-small font-normal text-text-secondary">
                {facetOptionLabel(filterKey, option)} ({option.count})
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Panelin gövdəsi — masaüstü aside və mobil Sheet eyni gövdəni işlədir
// ---------------------------------------------------------------------------

function FilterPanelBody({
  facets,
  controller,
}: DirectoryFiltersProps & { controller: DirectoryFilterController }) {
  const { state, patch, toggleMulti, clearAll } = controller;
  const active = activeFilterCount(state);

  return (
    <div className="flex flex-col gap-6">
      <NameFilter controller={controller} />

      <SelectFilter
        filterKey="faculty"
        options={facets.faculty}
        value={state.faculty}
        onChange={(value) => patch({ faculty: value })}
      />
      <SelectFilter
        filterKey="program"
        options={facets.program}
        value={state.program}
        onChange={(value) => patch({ program: value })}
      />
      <SelectFilter
        filterKey="admissionYear"
        options={facets.admissionYear}
        value={state.admissionYear === null ? null : String(state.admissionYear)}
        onChange={(value) =>
          patch({ admissionYear: value === null ? null : Number.parseInt(value, 10) })
        }
      />
      <SelectFilter
        filterKey="graduationYear"
        options={facets.graduationYear}
        value={state.graduationYear === null ? null : String(state.graduationYear)}
        onChange={(value) =>
          patch({ graduationYear: value === null ? null : Number.parseInt(value, 10) })
        }
      />
      <SelectFilter
        filterKey="status"
        options={facets.status}
        value={state.status}
        onChange={(value) =>
          // `parseAsStringLiteral` yalnız `UserStage` dəyərlərini qəbul edir;
          // facet-lər onsuz da `resolveStage`-dən gəlir, ona görə çevirmə
          // təhlükəsizdir.
          patch({ status: value as (typeof state)["status"] })
        }
      />
      <SelectFilter
        filterKey="city"
        options={facets.city}
        value={state.city}
        onChange={(value) => patch({ city: value })}
      />
      <SelectFilter
        filterKey="country"
        options={facets.country}
        value={state.country}
        onChange={(value) => patch({ country: value })}
      />
      <SelectFilter
        filterKey="industry"
        options={facets.industry}
        value={state.industry}
        onChange={(value) => patch({ industry: value })}
      />
      <SelectFilter
        filterKey="company"
        options={facets.company}
        value={state.company}
        onChange={(value) => patch({ company: value })}
      />

      <MultiFilter
        filterKey="interest"
        options={facets.interest}
        selected={state.interest}
        onToggle={(value) => toggleMulti("interest", value)}
      />
      <MultiFilter
        filterKey="language"
        options={facets.language}
        selected={state.language}
        onToggle={(value) => toggleMulti("language", value)}
      />
      <MultiFilter
        filterKey="club"
        options={facets.club}
        selected={state.club}
        onToggle={(value) => toggleMulti("club", value)}
      />

      {active > 0 ? (
        <Button type="button" variant="outline" onClick={clearAll}>
          Filtrləri sıfırla ({active})
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// İxrac olunan panel
// ---------------------------------------------------------------------------

export function DirectoryFilters({ facets }: DirectoryFiltersProps) {
  const controller = useDirectoryFilters();
  const active = activeFilterCount(controller.state);

  return (
    <>
      {/* --- Masaüstü: sabit panel --- */}
      <aside
        aria-label="Kataloq filtrləri"
        className="hidden rounded-card border border-border bg-surface p-6 shadow-sm-kuds lg:block"
      >
        <FilterPanelBody facets={facets} controller={controller} />
      </aside>

      {/* --- Mobil / tablet: Sheet --- */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="w-full gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtrlər{active > 0 ? ` (${active})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Kataloq filtrləri</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterPanelBody facets={facets} controller={controller} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Aktiv filtr çipləri — nəticələrin üstündə
// ---------------------------------------------------------------------------

interface ActiveChip {
  key: DirectoryFilterKey;
  value: string;
  label: string;
}

/** `name` filtrinin facet-i yoxdur (mətn sahəsidir) — boş siyahı qaytarılır. */
function facetsFor(facets: DirectoryFacets, key: DirectoryFilterKey): DirectoryFacetOption[] {
  return key === "name" ? [] : facets[key];
}

export function DirectoryActiveFilters({ facets }: DirectoryFiltersProps) {
  const { state, patch, toggleMulti, clearAll } = useDirectoryFilters();

  const chips: ActiveChip[] = DIRECTORY_FILTER_KEYS.flatMap((key) => {
    const value = state[key];
    const options = facetsFor(facets, key);

    if (Array.isArray(value)) {
      return value.map((item) => ({
        key,
        value: item,
        label: activeValueLabel(key, item, options),
      }));
    }

    if (value === null) return [];

    return [
      {
        key,
        value: String(value),
        label: activeValueLabel(key, String(value), options),
      },
    ];
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge
          key={`${chip.key}:${chip.value}`}
          variant="outline"
          className="gap-1 py-1 pl-3 pr-1 text-caption font-normal"
        >
          <span className="text-text-secondary">{directoryFilterDef(chip.key).label}:</span>
          <span className="text-text-primary">{chip.label}</span>
          <button
            type="button"
            aria-label={`«${chip.label}» filtrini götür`}
            className="rounded-badge p-1 text-text-secondary hover:bg-background hover:text-text-primary"
            onClick={() => {
              if (chip.key === "interest" || chip.key === "language" || chip.key === "club") {
                toggleMulti(chip.key, chip.value);
                return;
              }
              // Hesablanmış açar — bax `filter-state.ts`-dəki eyni qeyd.
              patch({ [chip.key]: null } as DirectoryUrlPatch);
            }}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}

      <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
        Hamısını təmizlə
      </Button>
    </div>
  );
}
