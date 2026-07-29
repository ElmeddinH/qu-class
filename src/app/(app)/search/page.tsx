// ============================================================================
// src/app/(app)/search/page.tsx
// Qlobal axtarışın tam nəticə səhifəsi [M16] — ⌘K palitrasındaki
// "Hamısına bax" buraya gətirir.
//
// Səhifə NAZİKDİR (CLAUDE.md §8): sorğu sətrini oxuyur, `search.service`-dən
// nəticəni çəkir və `features/search`-ə ötürür. `prisma.*` burada YOXDUR —
// dörd növ öz servisindən və öz görünürlük köməkçisindən keçir.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır → `dynamic = "force-dynamic"`.
// ============================================================================

import type { Metadata } from "next";

import { SearchScreen } from "@/features/search/SearchScreen";
import { requireUser } from "@/lib/auth";
import { SEARCH_PAGE_LIMIT } from "@/lib/search";
import { searchEverything } from "@/services/search.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Axtarış" };

/** URL-dən gələn sorğu sətrinin maksimum uzunluğu (API ilə eyni hədd). */
const MAX_TERM_LENGTH = 100;

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const viewer = await requireUser();
  const params = await searchParams;

  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const term = (raw ?? "").slice(0, MAX_TERM_LENGTH);

  // Qısa sorğuda servis DB-yə çıxmır (boş nəticə qaytarır) — ayrıca `if`
  // lazım deyil, ekran "axtarışa başlayın" vəziyyətini özü göstərir.
  const results = await searchEverything(viewer, term, SEARCH_PAGE_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Axtarış</h1>
        <p className="text-body text-text-secondary">
          Sinif yoldaşları, paylaşımlar, tədbirlər və nailiyyətlər — hər nəticə
          məxfilik səviyyənizə uyğun süzülür.
        </p>
      </header>

      <SearchScreen term={term} results={results} />
    </div>
  );
}
