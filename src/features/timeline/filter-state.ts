"use client";

// ============================================================================
// src/features/timeline/filter-state.ts
// Xronologiya filtrlərinin URL vəziyyəti — `nuqs` (adapter: `app/providers.tsx`).
//
// 🔴 PARAMETR ADLARI `src/lib/timeline-filters.ts` İLƏ EYNİ OLMALIDIR
// (`TIMELINE_PARAMS`). Server tərəf URL-i `parseTimelineParams` ilə oxuyur,
// səhifələmə linkləri `timelineHref` ilə qurulur, bu fayl isə həmin URL-i
// client-dən yazır. Üçü ayrılsa filtr "işləyir, amma nəticə dəyişmir" olur.
//
// ⚠️ `shallow: false` MƏCBURİDİR: süzgəc DB-dədir (JS-də filtrləmə qadağandır),
// yəni server komponenti yenidən işə düşməlidir. `shallow: true` qoysan URL
// dəyişər, nəticə köhnə qalar.
// ============================================================================

import { useCallback, useMemo } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  POST_CATEGORY_VALUES,
  TIMELINE_SOURCE_TYPE_VALUES,
  type PostCategory,
  type TimelineSourceType,
} from "@/lib/enums";
import {
  FIRST_TIMELINE_PAGE,
  TIMELINE_PARAMS,
  type TimelineFilterState,
} from "@/lib/timeline-filters";

export const TIMELINE_PARSERS = {
  [TIMELINE_PARAMS.year]: parseAsString,
  [TIMELINE_PARAMS.category]: parseAsStringLiteral(POST_CATEGORY_VALUES),
  [TIMELINE_PARAMS.source]: parseAsStringLiteral(TIMELINE_SOURCE_TYPE_VALUES),
  [TIMELINE_PARAMS.page]: parseAsInteger,
};

/** `null` → parametr URL-dən silinir. */
export interface TimelineUrlPatch {
  year?: string | null;
  category?: PostCategory | null;
  source?: TimelineSourceType | null;
  page?: number | null;
}

const RESET_PATCH: TimelineUrlPatch = {
  year: null,
  category: null,
  source: null,
  page: null,
};

export interface TimelineFilterController {
  /** Serverdəki `parseTimelineParams` nəticəsi ilə EYNİ forma. */
  state: TimelineFilterState;
  patch: (values: TimelineUrlPatch) => void;
  clearAll: () => void;
}

export function useTimelineFilters(): TimelineFilterController {
  const [values, setValues] = useQueryStates(TIMELINE_PARSERS, {
    shallow: false,
    clearOnDefault: true,
  });

  const state = useMemo<TimelineFilterState>(
    () => ({
      academicYear: (values.year as string | null) ?? null,
      category: (values.category as PostCategory | null) ?? null,
      sourceType: (values.source as TimelineSourceType | null) ?? null,
      page: (values.page as number | null) ?? FIRST_TIMELINE_PAGE,
    }),
    [values],
  );

  const patch = useCallback(
    (next: TimelineUrlPatch) => {
      // Filtr dəyişəndə səhifə SIFIRLANIR: 3-cü səhifədə ili dəyişən istifadəçi
      // çox vaxt boş səhifəyə düşərdi.
      void setValues({ page: null, ...next });
    },
    [setValues],
  );

  const clearAll = useCallback(() => {
    void setValues(RESET_PATCH);
  }, [setValues]);

  return { state, patch, clearAll };
}
