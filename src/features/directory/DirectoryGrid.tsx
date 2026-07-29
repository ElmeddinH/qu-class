// ============================================================================
// src/features/directory/DirectoryGrid.tsx
// Kataloq grid-i + boş vəziyyət + skeleton.
//
// KUDS: kart radius 12 (`rounded-card`), shadow SM, padding 24 (`p-6`),
// kartlar arası boşluq 24 (`gap-6`).
//
// Boş vəziyyət İKİ FƏRQLİ SƏBƏBDƏN yarana bilər və mətn fərqlidir:
//   · filtr çox dardır → "filtrləri sıfırla" təklif olunur
//   · sinif boşdur / viewer üzv deyil → sıfırlamağın faydası yoxdur
// ============================================================================

import { SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { DirectoryEntry } from "@/services/user.service";

import { DirectoryCard } from "./DirectoryCard";

const GRID_CLASS = "grid gap-6 sm:grid-cols-2 xl:grid-cols-3";

interface DirectoryGridProps {
  members: DirectoryEntry[];
  /** Filtr aktivdirsə boş vəziyyət sıfırlama düyməsi göstərir. */
  hasFilters: boolean;
  /** Filtrsiz kataloq linki — "filtrləri sıfırla" düyməsi buraya aparır. */
  resetHref: string;
}

export function DirectoryGrid({ members, hasFilters, resetHref }: DirectoryGridProps) {
  if (members.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="Filtrə uyğun nəticə yoxdur"
        description="Seçilmiş filtr kombinasiyası ilə heç bir sinif yoldaşı tapılmadı. Filtrləri azaldıb yenidən yoxlayın."
        action={{ href: resetHref, label: "Filtrləri sıfırla" }}
      />
    ) : (
      <EmptyState
        icon={Users}
        title="Kataloq boşdur"
        description="Sinif kataloqu yalnız həmin sinfin üzvlərinə göstərilir və hazırda göstəriləcək üzv yoxdur."
      />
    );
  }

  return (
    <ul className={GRID_CLASS}>
      {members.map((member) => (
        <DirectoryCard key={member.id} member={member} />
      ))}
    </ul>
  );
}

/** Suspense fallback-i — grid-in real ölçüsünü təqlid edir (sıçrayış olmasın). */
export function DirectoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={GRID_CLASS} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-avatar" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16 rounded-badge" />
            <Skeleton className="h-5 w-20 rounded-badge" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Filtr paneli üçün skeleton — facet sorğuları da DB-yə gedir. */
export function DirectoryFiltersSkeleton() {
  return (
    <div
      className="hidden flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-sm-kuds lg:flex"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-input" />
        </div>
      ))}
    </div>
  );
}
