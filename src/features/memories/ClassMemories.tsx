// ============================================================================
// src/features/memories/ClassMemories.tsx
// Share Memories ekranı [M9] — spec §11.
//
// Səhifə (`app/(app)/class/[slug]/memories/page.tsx`) NAZİKDİR: cohort-u
// yoxlayır, URL-i `parseMemoryParams` ilə oxuyur və buranı render edir. Data
// çəkilişi burada, `services/memory.service`-dən gedir — `prisma.*` yoxdur.
//
// 🔴 DÜZÜLÜŞ LENTDƏN FƏRQLİDİR (spec §11 «daha hekayəvi və vizual formada»):
// CSS `columns` ilə masonry-yə bənzər iki sütun. Paket ƏLAVƏ EDİLMƏDİ — Tailwind
// `columns-*` utilitisi kifayətdir və `break-inside-avoid` kartın sütunlar
// (və çapda səhifələr) arasında bölünməsinin qarşısını alır.
//
// ⚠️ `Suspense key` = sorğu sətri: filtr dəyişəndə skeleton yenidən görünür,
// yəni istifadəçi köhnə nəticəyə baxıb onu yeni filtrin cavabı saymır.
// ============================================================================

import { Suspense } from "react";
import Link from "next/link";
import { BookHeart, Heart } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth";
import {
  MEMORY_PAGE_SIZE,
  emptyMemoryFilters,
  hasActiveMemoryFilters,
  memoriesHref,
  memoryPageCount,
  memoryQueryString,
  memorySkipOf,
  type MemoryFilterState,
} from "@/lib/memory-filters";
import { canModerate, type Viewer } from "@/lib/visibility";
import type { CohortHeader } from "@/services/cohort.service";
import { listGuidePlaces } from "@/services/content.service";
import { countMemories, listMemories, type MemoryItem } from "@/services/memory.service";

import { MemoryCard } from "./MemoryCard";
import { MemoryComposer } from "./MemoryComposer";
import { MemoryFilters, MemoryResetButton } from "./MemoryFilters";
import type { MemoryCardView, MemoryPlaceOption } from "./types";

interface ClassMemoriesProps {
  cohort: CohortHeader;
  filters: MemoryFilterState;
}

/**
 * Servis nəticəsini client sərhədindən keçən formaya çevirir.
 * `Date` → ISO sətir (Next onsuz da seriallaşdırır, amma tip yalan olmasın).
 */
function toCardView(memory: MemoryItem, viewer: Viewer, cohortId: string): MemoryCardView {
  const isOwner = viewer.kind === "USER" && viewer.userId === memory.author.id;

  return {
    id: memory.id,
    type: memory.type as MemoryCardView["type"],
    title: memory.title,
    body: memory.body,
    dedicatedTo: memory.dedicatedTo,
    imageUrl: memory.imageUrl,
    occurredAt: memory.occurredAt.toISOString(),
    createdAt: memory.createdAt.toISOString(),
    guidePlaceId: memory.guidePlaceId,
    visibility: memory.visibility as MemoryCardView["visibility"],
    showInProfile: memory.showInProfile,
    showInFeed: memory.showInFeed,
    showInTimeline: memory.showInTimeline,
    showInYearbook: memory.showInYearbook,
    author: memory.author,
    guidePlace: memory.guidePlace,
    isOwner,
    // Müəllif üçün `false`: o, sahib yolu ilə gedir (lent kartı ilə eyni məntiq).
    canModerate:
      !isOwner &&
      canModerate(viewer, {
        ownerId: memory.author.id,
        cohortId,
        visibility: memory.visibility,
      }),
  };
}

export function ClassMemories({ cohort, filters }: ClassMemoriesProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 font-bold text-text-primary">Xatirələr</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · qısa xatirələr, təşəkkürlər və universitet hekayələri.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/class/${cohort.slug}/yearbook`}>
              <BookHeart className="h-4 w-4" aria-hidden />
              Rəqəmsal albom
            </Link>
          </Button>
        </div>
      </header>

      <Suspense key={memoryQueryString(filters)} fallback={<MemoriesSkeleton />}>
        <MemoriesBody cohort={cohort} filters={filters} />
      </Suspense>
    </div>
  );
}

async function MemoriesBody({ cohort, filters }: ClassMemoriesProps) {
  const viewer = await getViewer();

  const serviceFilters = {
    cohortId: cohort.id,
    type: filters.type ?? undefined,
    placeOnly: filters.placeOnly || undefined,
  };

  const [memories, total, places] = await Promise.all([
    listMemories(viewer, {
      ...serviceFilters,
      take: MEMORY_PAGE_SIZE,
      skip: memorySkipOf(filters),
    }),
    countMemories(viewer, serviceFilters),
    // Kompozitorun «hansı məkanla bağlıdır?» seçimi — bələdçinin ictimai
    // kataloqudur, görünürlük filtri tələb etmir.
    cohort.isMember ? listGuidePlaces() : Promise.resolve([]),
  ]);

  const placeOptions: MemoryPlaceOption[] = places.map((place) => ({
    id: place.id,
    title: place.title,
    category: place.category,
  }));

  const filtered = hasActiveMemoryFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      {cohort.isMember ? (
        <MemoryComposer
          cohortId={cohort.id}
          cohortSlug={cohort.slug}
          places={placeOptions}
        />
      ) : null}

      <MemoryFilters />

      <p className="text-small text-text-secondary" aria-live="polite">
        {total} xatirə
      </p>

      {memories.length === 0 ? (
        filtered ? (
          <div className="flex flex-col items-center gap-3">
            <EmptyState
              icon={Heart}
              title="Bu filtrə uyğun xatirə yoxdur"
              description="Seçilmiş növ və məkan kombinasiyasında xatirə tapılmadı."
              className="w-full"
            />
            <MemoryResetButton />
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="İlk xatirəni sən yaz"
            description="Yaddaqalan bir an, unudulmaz dərs və ya müəllimə təşəkkür — hamısı xatirə ola bilər."
          />
        )
      ) : (
        // Masonry-yə bənzər axın: kartlar müxtəlif hündürlükdədir və `columns`
        // onları boşluqsuz yığır (paket lazım deyil).
        <div className="columns-1 gap-6 md:columns-2">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={toCardView(memory, viewer, cohort.id)}
              cohortId={cohort.id}
              cohortSlug={cohort.slug}
              places={placeOptions}
            />
          ))}
        </div>
      )}

      <PagerNav
        page={filters.page}
        pageCount={memoryPageCount(total)}
        hrefFor={(page) => memoriesHref(cohort.slug, { ...filters, page })}
        label="Xatirə səhifələri"
      />

      {filtered ? (
        <p className="text-caption text-text-secondary">
          Bütün xatirələri görmək üçün{" "}
          <a
            href={memoriesHref(cohort.slug, emptyMemoryFilters())}
            className="text-ku-green hover:underline"
          >
            filtrləri sıfırlayın
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}

function MemoriesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full rounded-card" />
      <div className="columns-1 gap-6 md:columns-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="mb-6 h-64 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
