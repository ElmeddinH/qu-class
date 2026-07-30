"use client";

// ============================================================================
// src/features/memories/filter-state.ts
// Xatirə filtrlərinin URL vəziyyəti — `nuqs` (adapter: `app/providers.tsx`).
//
// 🔴 PARAMETR ADLARI `src/lib/memory-filters.ts` İLƏ EYNİ OLMALIDIR
// (`MEMORY_PARAMS`). Server tərəf URL-i `parseMemoryParams` ilə oxuyur,
// səhifələmə linkləri `memoriesHref` ilə qurulur, bu fayl isə həmin URL-i
// client-dən yazır. Üçü ayrılsa filtr "işləyir, amma nəticə dəyişmir" olur.
//
// ⚠️ `shallow: false` MƏCBURİDİR: süzgəc DB-dədir (JS-də filtrləmə qadağandır),
// yəni server komponenti yenidən işə düşməlidir. `shallow: true` qoysan URL
// dəyişər, nəticə köhnə qalar.
// ============================================================================

import { useCallback, useMemo } from "react";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { MEMORY_TYPE_VALUES, type MemoryType } from "@/lib/enums";
import {
  FIRST_MEMORY_PAGE,
  MEMORY_PARAMS,
  MEMORY_PLACE_FLAG,
  type MemoryFilterState,
} from "@/lib/memory-filters";

/**
 * ⚠️ `place` BAYRAQDIR, bulean deyil: URL-də `?place=1` görünür və server
 * tərəfdəki `parseMemoryParams` məhz bu dəyəri gözləyir. `parseAsBoolean`
 * `?place=true` yazardı və iki tərəf səssizcə ayrılardı.
 */
export const MEMORY_PARSERS = {
  [MEMORY_PARAMS.type]: parseAsStringLiteral(MEMORY_TYPE_VALUES),
  [MEMORY_PARAMS.place]: parseAsStringLiteral([MEMORY_PLACE_FLAG] as const),
  [MEMORY_PARAMS.page]: parseAsInteger,
};

/** `null` → parametr URL-dən silinir. */
export interface MemoryUrlPatch {
  type?: MemoryType | null;
  placeOnly?: boolean;
  page?: number | null;
}

export interface MemoryFilterController {
  /** Serverdəki `parseMemoryParams` nəticəsi ilə EYNİ forma. */
  state: MemoryFilterState;
  patch: (values: MemoryUrlPatch) => void;
  clearAll: () => void;
}

export function useMemoryFilters(): MemoryFilterController {
  const [values, setValues] = useQueryStates(MEMORY_PARSERS, {
    shallow: false,
    clearOnDefault: true,
  });

  const state = useMemo<MemoryFilterState>(
    () => ({
      type: (values.type as MemoryType | null) ?? null,
      placeOnly: values.place === MEMORY_PLACE_FLAG,
      page: (values.page as number | null) ?? FIRST_MEMORY_PAGE,
    }),
    [values],
  );

  const patch = useCallback(
    (next: MemoryUrlPatch) => {
      const { placeOnly, ...rest } = next;

      // Filtr dəyişəndə səhifə SIFIRLANIR: 3-cü səhifədə növü dəyişən
      // istifadəçi çox vaxt boş səhifəyə düşərdi.
      void setValues({
        page: null,
        ...rest,
        ...(placeOnly === undefined
          ? {}
          : { [MEMORY_PARAMS.place]: placeOnly ? MEMORY_PLACE_FLAG : null }),
      });
    },
    [setValues],
  );

  const clearAll = useCallback(() => {
    void setValues({ type: null, place: null, page: null });
  }, [setValues]);

  return { state, patch, clearAll };
}
