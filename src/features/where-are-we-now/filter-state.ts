"use client";

// ============================================================================
// src/features/where-are-we-now/filter-state.ts
// Görünüş (tab) vəziyyəti URL-də — `nuqs` (adapter: `app/providers.tsx`).
//
// 🔴 PARAMETR ADLARI `src/lib/map-filters.ts` İLƏ EYNİ OLMALIDIR (`MAP_PARAMS`).
// Server tərəf URL-i `parseMapParams` ilə oxuyur (ilk render doğru tabla açılsın),
// bu fayl isə həmin URL-i client-dən yazır.
//
// 🔴 `shallow: true` — VƏ BU, XRONOLOGİYA / XATİRƏ FİLTRLƏRİNDƏN FƏRQLİDİR.
//
// Orada `shallow: false` MƏCBURİDİR, çünki süzgəc DB-dədir və server komponenti
// yenidən işləməlidir. Burada isə aqreqasiya TƏK keçiddə, BİR DƏFƏ hesablanır
// (🔴 TƏLƏ A — xanalar bir-birindən asılıdır və ayrı sorğularla yenidən
// hesablanmamalıdır); səkkiz görünüş EYNİ nəticənin fərqli təsviridir. Server
// sorğusu yeni məlumat GƏTİRMƏZ, yalnız gecikmə əlavə edərdi.
//
// ⚠️ Ona görə bu faylı "digər filtrlərdə false idi" deyib dəyişmə —
// `lib/map-filters.ts` başlığında da eyni qeyd var.
// ============================================================================

import { useCallback, useMemo } from "react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  DEFAULT_MAP_TAB,
  MAP_PARAMS,
  MAP_TAB_VALUES,
  type MapFilterState,
  type MapTab,
} from "@/lib/map-filters";

export const MAP_PARSERS = {
  [MAP_PARAMS.tab]: parseAsStringLiteral(MAP_TAB_VALUES),
};

export interface MapFilterController {
  /** Serverdəki `parseMapParams` nəticəsi ilə EYNİ forma. */
  state: MapFilterState;
  setTab: (tab: MapTab) => void;
}

/**
 * @param fallback serverdə `parseMapParams` ilə oxunmuş görünüş.
 *
 * ⚠️ NİYƏ ARQUMENT VAR: URL-də tab olmadıqda (və ya hidrasiyadan əvvəl) client
 * DEFAULT görünüşə düşür. Server isə URL-i onsuz da oxuyub — həmin nəticəni
 * buraya ötürməsək paylaşılan `?tab=education` linki bir kadr «Dünya»
 * göstərib sonra sıçrayardı. İki tərəf EYNİ saf funksiyanın nəticəsini işlədir.
 */
export function useMapFilters(fallback: MapTab = DEFAULT_MAP_TAB): MapFilterController {
  const [values, setValues] = useQueryStates(MAP_PARSERS, {
    shallow: true,
    clearOnDefault: true,
  });

  const state = useMemo<MapFilterState>(
    () => ({ tab: (values.tab as MapTab | null) ?? fallback }),
    [values, fallback],
  );

  const setTab = useCallback(
    (tab: MapTab) => {
      // Default görünüş URL-dən SİLİNİR (`clearOnDefault`) — paylaşılan link
      // təmiz qalır və `parseMapParams` onsuz da defaulta düşür.
      void setValues({ tab: tab === DEFAULT_MAP_TAB ? null : tab });
    },
    [setValues],
  );

  return { state, setTab };
}
