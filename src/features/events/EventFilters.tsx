"use client";

// ============================================================================
// src/features/events/EventFilters.tsx
// ALTI filtrin paneli (spec §15): tarix · kateqoriya · təşkilatçı · fakültə ·
// klub · onlayn/üzbəüz.
//
// Vəziyyət URL-dədir (`filter-state.ts` → nuqs), yəni link paylaşıla bilir,
// geri düyməsi işləyir və server komponenti hər dəyişiklikdə süzgəci DB-də
// yenidən tətbiq edir.
//
// 🔴 «TƏŞKİLATÇI» (`scope`) və «KATEQORİYA» (`category`) İKİ AYRI süzgəcdir.
// Onlar ORTOQONALDIR — `REUNION` təşkilatçı səviyyəsidir, `CEREMONY` isə
// tədbir növü. Bir siyahıda birləşdirilsə "Məzunlar görüşü + Mərasim" seçimi
// mümkünsüz olardı (bax `lib/enums.ts` §10).
//
// ⚠️ Fakültə və klub seçimləri SERVERDƏN gəlir (`listEventFacets`) və hər biri
// görünürlük şərtindən keçmişdir — hardcode siyahı YOXDUR, "(12)" rəqəmi də
// DB-də süzülmüş saydır.
//
// ⚠️ Radix `Select` boş sətir dəyərini qəbul etmir → "hamısı" üçün sentinel.
//
// Mobil: panel `Sheet`-ə keçir (KUDS §16).
// ============================================================================

import { SlidersHorizontal, X } from "lucide-react";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  EVENT_FORMAT_VALUES,
  EVENT_WHEN_VALUES,
  activeEventFilterCount,
  type EventFormat,
  type EventWhen,
} from "@/lib/event-filters";
import { EVENT_CATEGORY_VALUES, EVENT_SCOPE_VALUES } from "@/lib/enums";
import type { EventCategory, EventScope } from "@/lib/enums";
import { EVENT_CATEGORY_LABELS, EVENT_SCOPE_LABELS } from "@/lib/labels";
import type { EventFacetOption, EventFacets } from "@/services/event.service";

import { useEventFilters, type EventFilterController } from "./filter-state";

/** Radix Select "hamısı" seçimi — boş sətir işlədilə bilmir. */
const ALL_VALUE = "__all__";

/** «Tarix» filtrinin azərbaycanca etiketləri. */
const WHEN_LABELS: Record<EventWhen, string> = {
  UPCOMING: "Qarşıdan gələnlər",
  PAST: "Keçmiş tədbirlər",
  ALL: "Hamısı",
};

/** «Onlayn / üzbəüz» filtrinin etiketləri. */
const FORMAT_LABELS: Record<EventFormat, string> = {
  ONLINE: "Onlayn",
  IN_PERSON: "Üzbəüz",
};

const FILTER_LABELS = {
  when: "Tarix",
  category: "Kateqoriya",
  scope: "Təşkilatçı",
  faculty: "Fakültə",
  club: "Klub",
  format: "İştirak forması",
} as const;

interface EventFiltersProps {
  facets: EventFacets;
}

// ---------------------------------------------------------------------------
// Ortaq açılan siyahı
// ---------------------------------------------------------------------------

interface FilterSelectProps {
  id: string;
  label: string;
  /** "Hamısı" seçiminin mətni. */
  placeholder: string;
  value: string | null;
  options: Array<{ value: string; label: string; count?: number }>;
  onChange: (value: string | null) => void;
  /** `true` — «hamısı» seçimi göstərilmir (tarix filtrində defolt var). */
  required?: boolean;
}

function FilterSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  required = false,
}: FilterSelectProps) {
  // Boş facet-i göstərmək mənasızdır: seçim yoxdur, yalnız yer tutur.
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? ALL_VALUE}
        onValueChange={(next) => onChange(next === ALL_VALUE ? null : next)}
      >
        <SelectTrigger id={id} className="rounded-input">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {required ? null : <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.count === undefined ? "" : ` (${option.count})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function toOptions(facet: EventFacetOption[]) {
  return facet.map((option) => ({
    value: option.value,
    label: option.label,
    count: option.count,
  }));
}

// ---------------------------------------------------------------------------
// Panelin gövdəsi — masaüstü aside və mobil Sheet eyni gövdəni işlədir
// ---------------------------------------------------------------------------

function FilterPanelBody({
  facets,
  controller,
}: EventFiltersProps & { controller: EventFilterController }) {
  const { state, patch, clearAll } = controller;
  const active = activeEventFilterCount(state);

  return (
    <div className="flex flex-col gap-6">
      {/* 1 — tarix */}
      <FilterSelect
        id="events-when"
        label={FILTER_LABELS.when}
        placeholder={WHEN_LABELS.ALL}
        value={state.when}
        required
        options={EVENT_WHEN_VALUES.map((when) => ({
          value: when,
          label: WHEN_LABELS[when],
        }))}
        onChange={(value) => patch({ when: (value as EventWhen | null) ?? null })}
      />

      {/* 2 — kateqoriya (tədbirin NÖVÜ) */}
      <FilterSelect
        id="events-category"
        label={FILTER_LABELS.category}
        placeholder="Bütün kateqoriyalar"
        value={state.category}
        options={EVENT_CATEGORY_VALUES.map((category) => ({
          value: category,
          label: EVENT_CATEGORY_LABELS[category],
        }))}
        onChange={(value) => patch({ category: value as EventCategory | null })}
      />

      {/* 3 — təşkilatçı (SƏVİYYƏ, kateqoriya ilə qarışdırma) */}
      <FilterSelect
        id="events-scope"
        label={FILTER_LABELS.scope}
        placeholder="Bütün təşkilatçılar"
        value={state.scope}
        options={EVENT_SCOPE_VALUES.map((scope) => ({
          value: scope,
          label: EVENT_SCOPE_LABELS[scope],
        }))}
        onChange={(value) => patch({ scope: value as EventScope | null })}
      />

      {/* 4 — fakültə (facet: yalnız tədbiri OLAN fakültələr) */}
      <FilterSelect
        id="events-faculty"
        label={FILTER_LABELS.faculty}
        placeholder="Bütün fakültələr"
        value={state.facultyId}
        options={toOptions(facets.faculty)}
        onChange={(value) => patch({ faculty: value })}
      />

      {/* 5 — klub */}
      <FilterSelect
        id="events-club"
        label={FILTER_LABELS.club}
        placeholder="Bütün klublar"
        value={state.clubId}
        options={toOptions(facets.club)}
        onChange={(value) => patch({ club: value })}
      />

      {/* 6 — onlayn / üzbəüz */}
      <FilterSelect
        id="events-format"
        label={FILTER_LABELS.format}
        placeholder="Fərq etməz"
        value={state.format}
        options={EVENT_FORMAT_VALUES.map((format) => ({
          value: format,
          label: FORMAT_LABELS[format],
        }))}
        onChange={(value) => patch({ format: value as EventFormat | null })}
      />

      {active > 0 ? (
        <Button type="button" variant="outline" onClick={clearAll}>
          Filtrləri sıfırla ({active})
        </Button>
      ) : null}
    </div>
  );
}

export function EventFilters({ facets }: EventFiltersProps) {
  const controller = useEventFilters();
  const active = activeEventFilterCount(controller.state);

  return (
    <>
      {/* --- Masaüstü: sabit panel --- */}
      <aside
        aria-label="Tədbir filtrləri"
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
              <SheetTitle>Tədbir filtrləri</SheetTitle>
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

export function EventActiveFilters({ facets }: EventFiltersProps) {
  const { state, patch, clearAll } = useEventFilters();

  const facetLabel = (options: EventFacetOption[], value: string): string =>
    options.find((option) => option.value === value)?.label ?? value;

  const chips: Array<{ key: string; label: string; value: string; clear: () => void }> = [];

  if (state.when !== "UPCOMING") {
    chips.push({
      key: "when",
      label: FILTER_LABELS.when,
      value: WHEN_LABELS[state.when],
      clear: () => patch({ when: null }),
    });
  }
  if (state.category !== null) {
    chips.push({
      key: "category",
      label: FILTER_LABELS.category,
      value: EVENT_CATEGORY_LABELS[state.category],
      clear: () => patch({ category: null }),
    });
  }
  if (state.scope !== null) {
    chips.push({
      key: "scope",
      label: FILTER_LABELS.scope,
      value: EVENT_SCOPE_LABELS[state.scope],
      clear: () => patch({ scope: null }),
    });
  }
  if (state.facultyId !== null) {
    chips.push({
      key: "faculty",
      label: FILTER_LABELS.faculty,
      value: facetLabel(facets.faculty, state.facultyId),
      clear: () => patch({ faculty: null }),
    });
  }
  if (state.clubId !== null) {
    chips.push({
      key: "club",
      label: FILTER_LABELS.club,
      value: facetLabel(facets.club, state.clubId),
      clear: () => patch({ club: null }),
    });
  }
  if (state.format !== null) {
    chips.push({
      key: "format",
      label: FILTER_LABELS.format,
      value: FORMAT_LABELS[state.format],
      clear: () => patch({ format: null }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1 py-1 pl-3 pr-1 text-caption font-normal"
        >
          <span className="text-text-secondary">{chip.label}:</span>
          <span className="text-text-primary">{chip.value}</span>
          <button
            type="button"
            aria-label={`«${chip.value}» filtrini götür`}
            className="rounded-badge p-1 text-text-secondary hover:bg-background hover:text-text-primary"
            onClick={chip.clear}
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
