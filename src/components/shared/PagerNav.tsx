// ============================================================================
// src/components/shared/PagerNav.tsx
// Səhifələmə (KUDS §14 — siyahı/cədvəl üçün məcburi funksiya).
//
// NİYƏ `shared/`-dədir: eyni blok ÜÇ yerdə lazımdır — Class Directory,
// Class Timeline, Class Achievements. Blok 6-da məntiq `features/directory/`
// içində idi; Blok 8-də ikinci və üçüncü istifadəçi yarandı, ona görə ortaq
// hissə bura çıxarıldı (istiqamət həmişə features → shared).
//
// SERVER komponentidir və hər düymə ƏSL `href`-dir: filtr kombinasiyası link-də
// qorunur, yəni "3-cü səhifə + 2026-2027 + nailiyyət" vəziyyəti də paylaşıla
// bilən ünvandır. Client düyməsi ilə qursaydıq sağ klik → "linki kopyala"
// işləməzdi.
//
// ⚠️ CLAUDE.md §1: `PaginationPrevious` / `PaginationNext` primitivlərində mətn
// ingiliscə HARDCODE olunub ("Previous" / "Next"). `ui/` faylına toxunmaq
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

/** Cari səhifənin hər tərəfində göstərilən qonşu sayı. */
const WINDOW = 1;

export const FIRST_PAGE_NUMBER = 1;

/**
 * Göstərilən səhifə nömrələri: birinci, sonuncu, cari ± WINDOW.
 * Aralar `null` (ellipsis) ilə işarələnir.
 */
export function pageWindow(current: number, pageCount: number): (number | null)[] {
  const pages = new Set<number>([FIRST_PAGE_NUMBER, pageCount]);

  for (let page = current - WINDOW; page <= current + WINDOW; page += 1) {
    if (page >= FIRST_PAGE_NUMBER && page <= pageCount) pages.add(page);
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

interface PagerNavProps {
  /** URL-dən oxunmuş cari səhifə (diapazondan kənar dəyər sıxılır). */
  page: number;
  pageCount: number;
  /** Səhifə nömrəsindən link qurur — filtrləri saxlamaq çağıranın işidir. */
  hrefFor: (page: number) => string;
  label?: string;
}

export function PagerNav({ page, pageCount, hrefFor, label }: PagerNavProps) {
  if (pageCount <= 1) return null;

  // Diapazondan kənar `?page=99` son səhifə kimi göstərilir.
  const current = Math.min(Math.max(page, FIRST_PAGE_NUMBER), pageCount);

  return (
    <Pagination aria-label={label}>
      <PaginationContent>
        <PaginationItem>
          {current > FIRST_PAGE_NUMBER ? (
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

        {pageWindow(current, pageCount).map((item, index) =>
          item === null ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={hrefFor(item)}
                isActive={item === current}
                aria-label={`Səhifə ${item}`}
              >
                {item}
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
