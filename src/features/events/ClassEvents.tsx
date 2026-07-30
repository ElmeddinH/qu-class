// ============================================================================
// src/features/events/ClassEvents.tsx
// Sinif tədbirləri ekranı [M12] — spec §15.
//
// Struktur:
//   1. Başlıq + "Yeni tədbir" (yalnız `EVENT_MANAGER_ROLES`)
//   2. Statistika zolağı
//   3. 6 filtrli panel (sol sütun) + nəticə qridi (sağ sütun)
//
// ⚠️ `cohortId` DEYİL, `audienceCohortId` işlədilir: sinif səviyyəli tədbir
// azdır, tələbə isə universitet / fakültə / klub tədbirlərini də görür
// (bax `services/event.service.ts` → `EventFilters.audienceCohortId`).
// Görünürlük süzgəci sorğunun içində, `visibleWithStatus` ilə qalır.
//
// ⚠️ Bütün sorğular servisdəndir (`prisma.*` yoxdur) və hər biri məxfilikdən
// keçir — SAYLAR da daxil olmaqla.
// ============================================================================

import { Suspense } from "react";
import { CalendarClock, CalendarX2, PartyPopper, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, requireUser } from "@/lib/auth";
import { EventScope } from "@/lib/enums";
import {
  EVENT_PAGE_SIZE,
  eventPageCount,
  eventQueryString,
  eventSkipOf,
  classEventsHref,
  emptyEventFilters,
  isOnlineFlagOf,
  upcomingFlagOf,
  type EventFilterState,
} from "@/lib/event-filters";
import {
  countEvents,
  listContactOptions,
  listEventFacets,
  listEvents,
} from "@/services/event.service";
import { listClubCatalog } from "@/services/user.service";
import { listFacultyOptions } from "@/services/academic.service";
import type { CohortHeader } from "@/services/cohort.service";

import { canCreateEvents } from "@/features/class-home/catalog";
import { EventActiveFilters, EventFilters } from "./EventFilters";
import { EventCard } from "./EventCard";
import { EventComposer } from "./EventComposer";

interface ClassEventsProps {
  cohort: CohortHeader;
  filters: EventFilterState;
}

export function ClassEvents({ cohort, filters }: ClassEventsProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Tədbirlər</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · sinif, fakültə, klub və universitet tədbirləri.
        </p>
      </header>

      {/* Kompozitor `Suspense`-dən KƏNARDADIR: filtr dəyişəndə form yenidən
          qurulmamalıdır (istifadəçinin yarımçıq doldurduğu sahələr itərdi). */}
      <ComposerSlot cohort={cohort} />

      <Suspense key={eventQueryString(filters)} fallback={<EventsSkeleton />}>
        <EventsBody cohort={cohort} filters={filters} />
      </Suspense>
    </div>
  );
}

/**
 * "Yeni tədbir" formu.
 *
 * ⚠️ Görünmə qərarı `canCreateEvents`-dədir, ƏSL icazə isə servisdə
 * (`createEvent` → `hasEventManagerRole`). Düyməni gizlətmək qoruma DEYİL.
 */
async function ComposerSlot({ cohort }: { cohort: CohortHeader }) {
  if (!canCreateEvents(cohort.viewerRole)) return null;

  const viewer = await requireUser();

  const [faculties, clubs, contacts] = await Promise.all([
    listFacultyOptions(),
    listClubCatalog(viewer),
    listContactOptions(viewer, cohort.id),
  ]);

  return (
    <EventComposer
      cohortId={cohort.id}
      cohortSlug={cohort.slug}
      faculties={faculties.map((faculty) => ({ id: faculty.id, label: faculty.name }))}
      clubs={clubs.map((club) => ({ id: club.id, label: club.name }))}
      contacts={contacts.map((contact) => ({
        id: contact.id,
        label: `${contact.firstName} ${contact.lastName}`,
      }))}
    />
  );
}

async function EventsBody({ cohort, filters }: ClassEventsProps) {
  const viewer = await getViewer();

  // ⚠️ "İndi" BİR DƏFƏ hesablanır və bütün sorğulara ötürülür: siyahı, say və
  // kartların "keçib" rozeti eyni ana baxmalıdır, yoxsa sərhəddəki tədbir
  // sayda var, siyahıda yox olur.
  const now = new Date();

  const serviceFilters = {
    audienceCohortId: cohort.id,
    category: filters.category ?? undefined,
    scope: filters.scope ?? undefined,
    facultyId: filters.facultyId ?? undefined,
    clubId: filters.clubId ?? undefined,
    isOnline: isOnlineFlagOf(filters.format),
    upcoming: upcomingFlagOf(filters.when),
  };

  const [events, total, facets, upcomingCount, reunionCount] = await Promise.all([
    listEvents(
      viewer,
      {
        ...serviceFilters,
        take: EVENT_PAGE_SIZE,
        skip: eventSkipOf(filters, EVENT_PAGE_SIZE),
      },
      now,
    ),
    countEvents(viewer, serviceFilters, now),
    listEventFacets(viewer, { audienceCohortId: cohort.id }, now),
    countEvents(viewer, { audienceCohortId: cohort.id, upcoming: true }, now),
    countEvents(
      viewer,
      { audienceCohortId: cohort.id, scope: EventScope.REUNION },
      now,
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Tədbir statistikası" className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} value={upcomingCount} label="Qarşıdan gələn tədbir" />
        <StatCard icon={Users} value={total} label="Filtrə uyğun tədbir" />
        <StatCard
          icon={PartyPopper}
          value={reunionCount}
          label="Məzunlar görüşü"
          hint="Təşkilatçı səviyyəsi: REUNION"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <EventFilters facets={facets} />

        {/* ⚠️ WCAG 1.3.1 — `<h2>` MƏCBURİDİR: səhifənin `<h1>`-i «Tədbirlər»dir,
            `EventCard` isə hər tədbiri `<h3>` ilə başlıqlandırır. Aralıq başlıq
            olmasa iyerarxiya h1 → h3 ATLAYIR. `sr-only`, çünki `<h1>` eyni
            mənanı ekranda onsuz da verir. */}
        <section aria-labelledby="event-results" className="flex flex-col gap-4">
          <h2 id="event-results" className="sr-only">
            Tədbir siyahısı
          </h2>

          <EventActiveFilters facets={facets} />

          <p className="text-small text-text-secondary" aria-live="polite">
            {total} tədbir
          </p>

          {events.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Filtrə uyğun tədbir yoxdur"
              description="Başqa kateqoriya, təşkilatçı və ya tarix seçin — sinif səhifəsində universitet tədbirləri də görünür."
              action={{
                href: classEventsHref(cohort.slug, emptyEventFilters()),
                label: "Filtrləri sıfırla",
              }}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} now={now} />
              ))}
            </div>
          )}

          <PagerNav
            page={filters.page}
            pageCount={eventPageCount(total, EVENT_PAGE_SIZE)}
            hrefFor={(page) => classEventsHref(cohort.slug, { ...filters, page })}
            label="Tədbir səhifələri"
          />
        </section>
      </div>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="hidden h-96 w-full rounded-card lg:block" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-64 w-full rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
