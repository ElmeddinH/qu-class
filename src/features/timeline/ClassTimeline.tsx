// ============================================================================
// src/features/timeline/ClassTimeline.tsx
// Class Timeline ekranı [M8] — spec §10.
//
// Səhifə (`app/(app)/class/[slug]/timeline/page.tsx`) NAZİKDİR: cohort-u
// yoxlayır, milestone-ları sinxronlaşdırır (`ensureCohortMilestones`), URL-i
// `parseTimelineParams` ilə oxuyur və buranı render edir. Data çəkilişi burada,
// `services/timeline.service`-dən gedir — `prisma.*` yoxdur.
//
// ⚠️ QRUPLAŞDIRMA JS-dədir, SÜZGƏC yox. CLAUDE.md §5 JS-də FİLTRLƏMƏNİ qadağan
// edir (pagination sınır, sızma yaranır); burada isə bütün süzgəc DB-dədir və
// JS yalnız ARTIQ SÜZÜLMÜŞ səhifəni tədris ilinə görə bölür. Sıra DB-dən gəlir
// (`occurredAt desc`), ona görə qruplar da avtomatik düzgün sıradadır.
//
// ⚠️ `Suspense key` = sorğu sətri: filtr dəyişəndə skeleton yenidən görünür,
// yəni istifadəçi köhnə nəticəyə baxıb onu yeni filtrin cavabı saymır.
// ============================================================================

import { Suspense } from "react";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth";
import {
  TIMELINE_PAGE_SIZE,
  emptyTimelineFilters,
  hasActiveTimelineFilters,
  timelineHref,
  timelinePageCount,
  timelineQueryString,
  timelineSkipOf,
  type TimelineFilterState,
} from "@/lib/timeline-filters";
import type { CohortHeader } from "@/services/cohort.service";
import { listTimeline, type TimelineItem } from "@/services/timeline.service";

import { TimelineFilters, TimelineResetButton } from "./TimelineFilters";
import { TimelineEntryItem } from "./TimelineEntryItem";

interface ClassTimelineProps {
  cohort: CohortHeader;
  filters: TimelineFilterState;
}

export function ClassTimeline({ cohort, filters }: ClassTimelineProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Sinif xronologiyası</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · paylaşımlar, nailiyyətlər, tədbirlər və sinif
          tarixçəsi bir sırada.
        </p>
      </header>

      <Suspense key={timelineQueryString(filters)} fallback={<TimelineSkeleton />}>
        <TimelineBody cohort={cohort} filters={filters} />
      </Suspense>
    </div>
  );
}

async function TimelineBody({ cohort, filters }: ClassTimelineProps) {
  const viewer = await getViewer();

  const { items, academicYears, total } = await listTimeline(viewer, {
    cohortId: cohort.id,
    academicYear: filters.academicYear ?? undefined,
    category: filters.category ?? undefined,
    sourceType: filters.sourceType ?? undefined,
    take: TIMELINE_PAGE_SIZE,
    skip: timelineSkipOf(filters),
  });

  const filtered = hasActiveTimelineFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <TimelineFilters academicYears={academicYears} />

      <p className="text-small text-text-secondary" aria-live="polite">
        {total} qeyd
      </p>

      {items.length === 0 ? (
        filtered ? (
          <div className="flex flex-col items-center gap-3">
            <EmptyState
              icon={ScrollText}
              title="Bu filtrə uyğun qeyd yoxdur"
              description="Seçilmiş tədris ili, kateqoriya və mənbə kombinasiyasında hadisə tapılmadı."
              className="w-full"
            />
            <TimelineResetButton />
          </div>
        ) : (
          <EmptyState
            icon={ScrollText}
            title="Xronologiya hələ boşdur"
            description="Paylaşımda «Xronologiyada göstər» seçimini işarələyəndə, nailiyyət təsdiqlənəndə və ya tədbir keçiriləndə hadisə buraya düşür."
            action={{ href: `/class/${cohort.slug}/feed`, label: "Paylaşım yarat" }}
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          {groupByAcademicYear(items).map((group) => (
            <section key={group.academicYear} aria-labelledby={`year-${group.academicYear}`}>
              <h2
                id={`year-${group.academicYear}`}
                className="mb-4 text-h2 font-semibold text-text-primary"
              >
                {group.academicYear} tədris ili
              </h2>

              {/* Sol kənarda davamlı xətt — hadisələr onun üzərində düzülür. */}
              <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                {group.items.map((item) => (
                  <TimelineEntryItem key={item.id} item={item} cohortSlug={cohort.slug} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <PagerNav
        page={filters.page}
        pageCount={timelinePageCount(total)}
        hrefFor={(page) => timelineHref(cohort.slug, { ...filters, page })}
        label="Xronologiya səhifələri"
      />

      {filtered ? (
        <p className="text-caption text-text-secondary">
          Bütün qeydləri görmək üçün{" "}
          <a
            href={timelineHref(cohort.slug, emptyTimelineFilters())}
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

interface TimelineGroup {
  academicYear: string;
  items: TimelineItem[];
}

/**
 * Səhifədəki qeydləri tədris ilinə görə bölür.
 * Sıra DB-dən gəldiyi üçün (occurredAt desc) qruplar da azalan sıradadır və
 * bir il yalnız BİR dəfə görünür.
 */
export function groupByAcademicYear(items: TimelineItem[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];

  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.academicYear === item.academicYear) {
      last.items.push(item);
      continue;
    }
    groups.push({ academicYear: item.academicYear, items: [item] });
  }

  return groups;
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-32 w-full rounded-card" />
      <div className="flex flex-col gap-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
