"use client";

// ============================================================================
// src/features/search/useSearchQuery.ts
// `/api/search` sorğusu — debounce + köhnə cavabın ləğvi.
//
// ⚠️ DEBOUNCE 250ms: `CommandInput` hər hərfdə dəyişir və hər hərf DÖRD DB
// sorğusuna çevrilir (istifadəçi · paylaşım · tədbir · nailiyyət). Debounce
// olmadan palitra yazı sürətində serveri döyür.
//
// 🔴 NİYƏ TanStack Query DEYİL: palitra `DashboardShell` header-indədir, yəni
// HƏM `(app)`, HƏM `(admin)` qrupunda render olunur. `QueryClientProvider`
// isə yalnız `(app)/layout.tsx`-dədir → admin səhifəsi SSR zamanı
// "No QueryClient set" ilə 500 verirdi. Header komponenti provider TƏLƏB
// ETMƏMƏLİDİR; ona görə adi `fetch` + `AbortController` işlədilir.
//
// ⚠️ YARIŞ ŞƏRTİ: sürətli yazıda cavablar sıra ilə gəlməyə bilər. Köhnə sorğu
// `AbortController` ilə ləğv edilir və nəticə YALNIZ cari sorğu sətri üçün
// tətbiq olunur — əks halda "aysel" yazıb "ays" nəticəsini görürsən.
//
// ⚠️ Məxfilik SERVERDƏDİR. Burada heç bir süzgəc yoxdur və olmamalıdır —
// endpoint yalnız viewer-in görməli olduğu nəticələri qaytarır.
// ============================================================================

import { useEffect, useState } from "react";

import { EMPTY_SEARCH_RESULTS, isSearchable, type SearchResults } from "@/lib/search";

export const SEARCH_DEBOUNCE_MS = 250;

/** Sorğu sətrini gecikdirir — hər hərfdə deyil, dayanandan sonra oxunur. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export interface SearchQueryResult {
  results: SearchResults;
  isLoading: boolean;
  /** Sorğu çox qısadır (axtarış başlamayıb) — "nəticə yoxdur"dan fərqlidir. */
  isTooShort: boolean;
}

interface Snapshot {
  term: string;
  results: SearchResults;
}

export function useSearchQuery(term: string, take?: number): SearchQueryResult {
  const trimmed = term.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const isTooShort = !isSearchable(debounced);

  const [snapshot, setSnapshot] = useState<Snapshot>({
    term: "",
    results: EMPTY_SEARCH_RESULTS,
  });

  useEffect(() => {
    if (!isSearchable(debounced)) {
      setSnapshot({ term: debounced, results: EMPTY_SEARCH_RESULTS });
      return;
    }

    const controller = new AbortController();

    async function run() {
      const params = new URLSearchParams({ q: debounced });
      if (take !== undefined) params.set("take", String(take));

      try {
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const results = response.ok
          ? ((await response.json()) as SearchResults)
          : EMPTY_SEARCH_RESULTS;

        setSnapshot({ term: debounced, results });
      } catch {
        // Ləğv edilmiş sorğu səhv deyil — yeni sorğu onsuz da yoldadır.
        if (controller.signal.aborted) return;
        setSnapshot({ term: debounced, results: EMPTY_SEARCH_RESULTS });
      }
    }

    void run();
    return () => controller.abort();
  }, [debounced, take]);

  const isSettled = snapshot.term === debounced && debounced === trimmed;

  return {
    // Köhnə sorğunun nəticəsi göstərilmir: yazı davam edirsə siyahı boşdur və
    // yükləmə göstəricisi görünür.
    results: isSettled ? snapshot.results : EMPTY_SEARCH_RESULTS,
    isLoading: !isTooShort && !isSettled,
    isTooShort,
  };
}
