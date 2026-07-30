"use client";

// ============================================================================
// src/features/events/filter-state.ts
// Tədbir filtrlərinin URL vəziyyəti — `nuqs` (adapter: `app/providers.tsx`).
//
// 🔴 PARAMETR ADLARI VƏ FORMATI `src/lib/event-filters.ts` İLƏ EYNİ OLMALIDIR.
// Server tərəf URL-i `parseEventParams` ilə oxuyur, səhifələmə linkləri
// `serializeEventParams` ilə qurulur, bu fayl isə həmin URL-i client-dən yazır.
// Üçü ayrılsa filtr "işləyir, amma nəticə dəyişmir" olur — ən çətin tapılan
// səhv növü. Dövrə testlə bərkidilib (`event-filters.test.ts`).
//
// ⚠️ `shallow: false` MƏCBURİDİR: süzgəc DB-dədir, server komponenti yenidən
// işə düşməlidir. `shallow: true` qoysan URL dəyişər, nəticə köhnə qalar.
//
// ⚠️ `when` filtrinin DEFOLTU `UPCOMING`-dir və `parseAsStringLiteral`-a
// `withDefault` ilə verilir — `clearOnDefault` sayəsində URL-ə yazılmır.
// ============================================================================

import { useCallback, useMemo } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  DEFAULT_EVENT_WHEN,
  EVENT_FORMAT_VALUES,
  EVENT_PARAMS,
  EVENT_WHEN_VALUES,
  FIRST_EVENT_PAGE,
  type EventFilterState,
  type EventFormat,
  type EventWhen,
} from "@/lib/event-filters";
import { EVENT_CATEGORY_VALUES, EVENT_SCOPE_VALUES } from "@/lib/enums";
import type { EventCategory, EventScope } from "@/lib/enums";

export const EVENT_PARSERS = {
  [EVENT_PARAMS.when]: parseAsStringLiteral(EVENT_WHEN_VALUES).withDefault(
    DEFAULT_EVENT_WHEN,
  ),
  [EVENT_PARAMS.category]: parseAsStringLiteral(EVENT_CATEGORY_VALUES),
  [EVENT_PARAMS.scope]: parseAsStringLiteral(EVENT_SCOPE_VALUES),
  [EVENT_PARAMS.faculty]: parseAsString,
  [EVENT_PARAMS.club]: parseAsString,
  [EVENT_PARAMS.format]: parseAsStringLiteral(EVENT_FORMAT_VALUES),
  [EVENT_PARAMS.page]: parseAsInteger,
};

/** Bir dəfəyə yazıla bilən dəyişikliklər. `null` → parametr URL-dən silinir. */
export interface EventUrlPatch {
  when?: EventWhen | null;
  category?: EventCategory | null;
  scope?: EventScope | null;
  faculty?: string | null;
  club?: string | null;
  format?: EventFormat | null;
  page?: number | null;
}

/** «Hamısını təmizlə» — 6 filtr + səhifə. */
const RESET_PATCH: EventUrlPatch = {
  when: null,
  category: null,
  scope: null,
  faculty: null,
  club: null,
  format: null,
  page: null,
};

export interface EventFilterController {
  /** Cari vəziyyət — serverdəki `parseEventParams` nəticəsi ilə EYNİ forma. */
  state: EventFilterState;
  /** Bir və ya bir neçə filtri dəyişir; səhifə həmişə 1-ə qayıdır. */
  patch: (values: EventUrlPatch) => void;
  clearAll: () => void;
}

export function useEventFilters(): EventFilterController {
  const [values, setValues] = useQueryStates(EVENT_PARSERS, {
    shallow: false,
    clearOnDefault: true,
  });

  const state = useMemo<EventFilterState>(
    () => ({
      when: (values.when as EventWhen | null) ?? DEFAULT_EVENT_WHEN,
      category: (values.category as EventCategory | null) ?? null,
      scope: (values.scope as EventScope | null) ?? null,
      // ⚠️ Server tərəfdə açar `facultyId` / `clubId`-dir, URL parametri isə
      // `faculty` / `club`. Ad fərqi qəsdəndir (URL qısa qalır) və məhz burada
      // bir dəfə körpülənir.
      facultyId: (values.faculty as string | null) ?? null,
      clubId: (values.club as string | null) ?? null,
      format: (values.format as EventFormat | null) ?? null,
      page: (values.page as number | null) ?? FIRST_EVENT_PAGE,
    }),
    [values],
  );

  const patch = useCallback(
    (next: EventUrlPatch) => {
      // Filtr dəyişəndə səhifə SIFIRLANIR: 3-cü səhifədə kateqoriyanı dəyişən
      // istifadəçi çox vaxt boş səhifəyə düşərdi.
      void setValues({ page: null, ...next });
    },
    [setValues],
  );

  const clearAll = useCallback(() => {
    void setValues(RESET_PATCH);
  }, [setValues]);

  return { state, patch, clearAll };
}
