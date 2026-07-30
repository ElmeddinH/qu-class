// ============================================================================
// src/features/directory/DirectoryPagination.tsx
// Kataloq səhifələməsi — ortaq `PagerNav` üzərində nazik təbəqə.
//
// Səhifə pəncərəsi (birinci · cari±1 · sonuncu) və azərbaycanca düymə mətnləri
// Blok 8-də `components/shared/PagerNav.tsx`-ə çıxarıldı: eyni blok Timeline və
// Achievements səhifələrində də lazım oldu. Burada yalnız KATALOQA aid hissə
// qalır — link `directoryHref` ilə qurulur, yəni 13 filtr səhifə dəyişəndə
// itmir.
// ============================================================================

import { PagerNav } from "@/components/shared/PagerNav";
import {
  directoryHref,
  pageCountOf,
  type DirectoryFilterState,
} from "@/lib/directory-filters";

interface DirectoryPaginationProps {
  cohortSlug: string;
  filters: DirectoryFilterState;
  total: number;
  pageSize: number;
}

export function DirectoryPagination({
  cohortSlug,
  filters,
  total,
  pageSize,
}: DirectoryPaginationProps) {
  return (
    <PagerNav
      page={filters.page}
      pageCount={pageCountOf(total, pageSize)}
      hrefFor={(page) => directoryHref(cohortSlug, { ...filters, page })}
      label="Kataloq səhifələri"
    />
  );
}
