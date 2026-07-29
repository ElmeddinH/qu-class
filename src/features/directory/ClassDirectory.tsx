// ============================================================================
// src/features/directory/ClassDirectory.tsx
// Class Directory ekranı [M6] — spec §8.
//
// Səhifə (`app/(app)/class/[slug]/directory/page.tsx`) NAZİKDİR: cohort-u
// yoxlayır, URL-i `parseDirectoryParams` ilə oxuyur və buranı render edir.
// Data çəkilişi bu faylın içindəki server komponentindədir (`prisma.*` yoxdur —
// yalnız `services/user.service`).
//
// ⚠️ FACET-LƏR VƏ NƏTİCƏ BİR ARADA çəkilir (`Promise.all`): facet-ləri ayrı
// `Suspense` sərhədinə qoysaydıq iki sorğu ARDICIL gedərdi (panel gəlir, sonra
// nəticə) — burada ikisi paralel gedir və tək skeleton göstərilir.
//
// ⚠️ `Suspense key` = sorğu sətri. Filtr dəyişəndə React köhnə ağacı saxlamır,
// skeleton yenidən görünür — yəni istifadəçi köhnə nəticəyə baxıb onu yeni
// filtrin cavabı saymır.
// ============================================================================

import { Suspense } from "react";

import { getViewer } from "@/lib/auth";
import {
  DIRECTORY_PAGE_SIZE,
  activeFilterCount,
  directoryHref,
  directoryQueryString,
  emptyDirectoryFilters,
  skipOf,
  type DirectoryFilterState,
} from "@/lib/directory-filters";
import type { CohortHeader } from "@/services/cohort.service";
import { listDirectory, listDirectoryFacets } from "@/services/user.service";

import { DirectoryActiveFilters, DirectoryFilters } from "./DirectoryFilters";
import {
  DirectoryFiltersSkeleton,
  DirectoryGrid,
  DirectoryGridSkeleton,
} from "./DirectoryGrid";
import { DirectoryPagination } from "./DirectoryPagination";

interface ClassDirectoryProps {
  cohort: CohortHeader;
  filters: DirectoryFilterState;
}

/** İki sütunlu düzülüş — masaüstündə 280px panel + nəticələr (KUDS §8). */
const LAYOUT_CLASS = "grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]";

export function ClassDirectory({ cohort, filters }: ClassDirectoryProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Sinif kataloqu</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · {cohort.memberCount} üzv
        </p>
      </header>

      <Suspense
        key={directoryQueryString(filters)}
        fallback={
          <div className={LAYOUT_CLASS}>
            <DirectoryFiltersSkeleton />
            <DirectoryGridSkeleton />
          </div>
        }
      >
        <DirectoryBody cohort={cohort} filters={filters} />
      </Suspense>
    </div>
  );
}

async function DirectoryBody({ cohort, filters }: ClassDirectoryProps) {
  const viewer = await getViewer();

  const [facets, page] = await Promise.all([
    listDirectoryFacets(viewer, { cohortId: cohort.id, filters }),
    listDirectory(viewer, {
      cohortId: cohort.id,
      filters,
      take: DIRECTORY_PAGE_SIZE,
      skip: skipOf(filters),
    }),
  ]);

  const activeCount = activeFilterCount(filters);
  const resetHref = directoryHref(cohort.slug, emptyDirectoryFilters());

  return (
    <div className={LAYOUT_CLASS}>
      <DirectoryFilters facets={facets} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-small text-text-secondary" aria-live="polite">
            {activeCount > 0
              ? `${page.total} nəticə · ${activeCount} filtr aktivdir`
              : `${page.total} nəticə`}
          </p>
          <DirectoryActiveFilters facets={facets} />
        </div>

        <DirectoryGrid
          members={page.items}
          hasFilters={activeCount > 0}
          resetHref={resetHref}
        />

        <DirectoryPagination
          cohortSlug={cohort.slug}
          filters={filters}
          total={page.total}
          pageSize={DIRECTORY_PAGE_SIZE}
        />
      </div>
    </div>
  );
}
