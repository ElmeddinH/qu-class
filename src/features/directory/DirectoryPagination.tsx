// ============================================================================
// src/features/directory/DirectoryPagination.tsx
// Səhifələmə (KUDS §14 — cədvəl/kataloq üçün məcburi funksiya).
//
// SERVER komponentidir və hər düymə ƏSL `href`-dir: filtr kombinasiyası
// `serializeDirectoryParams` ilə qorunur, yəni "3-cü səhifə + Bakı + klub"
// vəziyyəti də paylaşıla bilən linkdir. Client tərəfdə düymə kimi qursaydıq
// URL yenə dəyişərdi, amma HTML-də paylaşıla bilən keçid qalmazdı (sağ klik →
// "linki kopyala" işləməzdi).
//
// ⚠️ CLAUDE.md §1: `PaginationPrevious` / `PaginationNext` primitivlərində mətn
// ingiliscə HARDCODE olunub ("Previous" / "Next"). `ui/` faylını redaktə etmək
// əvəzinə aşağı səviyyəli `PaginationLink` azərbaycanca children ilə işlədilir.
// ============================================================================

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  FIRST_PAGE,
  directoryHref,
  pageCountOf,
  type DirectoryFilterState,
} from "@/lib/directory-filters";

/** Cari səhifənin hər tərəfində göstərilən qonşu sayı. */
const WINDOW = 1;

/**
 * Göstərilən səhifə nömrələri: birinci, sonuncu, cari ± WINDOW.
 * Aralar `null` (ellipsis) ilə işarələnir.
 */
function pageWindow(current: number, pageCount: number): (number | null)[] {
  const pages = new Set<number>([FIRST_PAGE, pageCount]);

  for (let page = current - WINDOW; page <= current + WINDOW; page += 1) {
    if (page >= FIRST_PAGE && page <= pageCount) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];

  for (const [index, page] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push(null);
    result.push(page);
  }

  return result;
}

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
  const pageCount = pageCountOf(total, pageSize);
  if (pageCount <= 1) return null;

  // Diapazondan kənar `?page=99` son səhifə kimi davranır — servis `skip`-i
  // sıxdığı üçün göstərilən nəticə də sonuncu səhifədir.
  const current = Math.min(Math.max(filters.page, FIRST_PAGE), pageCount);
  const hrefFor = (page: number): string =>
    directoryHref(cohortSlug, { ...filters, page });

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          {current > FIRST_PAGE ? (
            <PaginationLink
              href={hrefFor(current - 1)}
              size="default"
              aria-label="Əvvəlki səhifə"
              className="gap-1 pl-2.5"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span>Əvvəlki</span>
            </PaginationLink>
          ) : null}
        </PaginationItem>

        {pageWindow(current, pageCount).map((page, index) =>
          page === null ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href={hrefFor(page)}
                isActive={page === current}
                aria-label={`Səhifə ${page}`}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {current < pageCount ? (
            <PaginationLink
              href={hrefFor(current + 1)}
              size="default"
              aria-label="Növbəti səhifə"
              className="gap-1 pr-2.5"
            >
              <span>Növbəti</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </PaginationLink>
          ) : null}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
