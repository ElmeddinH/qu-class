// ============================================================================
// spec §16 blok 5 — Qarşıdan gələn tədbirlər.
//
// ⚠️ `cohortId` DEYİL, `audienceCohortId` işlədilir: sinif səviyyəli tədbir
// azdır, tələbə isə universitet / fakültə / klub tədbirlərini də görür
// (bax `services/event.service.ts` → `EventFilters.audienceCohortId`).
// Görünürlük süzgəci sorğunun içində, `visibleWithStatus` ilə qalır.
// ============================================================================

import Link from "next/link";
import { CalendarX2, MapPin, Video } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { listEvents } from "@/services/event.service";
import { dayMonth, timeOfDay } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function UpcomingEvents({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const events = await listEvents(viewer, {
    audienceCohortId: cohort.id,
    upcoming: true,
    take: WIDGET_ITEM_LIMIT,
  });

  return (
    <WidgetCard
      headingId={headingId}
      title="Qarşıdan gələn tədbirlər"
      icon="calendar"
      description="Sinif, fakültə və universitet tədbirləri."
      action={{ href: `/class/${cohort.slug}/events`, label: "Hamısı" }}
    >
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Yaxın tarixdə tədbir yoxdur"
          description="Yeni tədbir elan olunanda burada görünəcək."
          action={{ href: `/class/${cohort.slug}/events`, label: "Keçmiş tədbirlərə bax" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              {/* PLAN.md §4.2: tədbir detalı `/events/[id]`-dədir (sinif
                  altında YOX) — siyahı isə `/class/[slug]/events`. */}
              <Link
                href={`/events/${event.id}`}
                className="flex gap-3 rounded-card border border-border p-3 transition-colors hover:border-ku-green hover:bg-ku-soft/30"
              >
                <div
                  className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-card bg-ku-soft text-ku-dark"
                  aria-hidden
                >
                  <span className="text-caption">{dayMonth(event.startsAt)}</span>
                  <span className="text-caption font-medium">
                    {timeOfDay(event.startsAt)}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-body font-medium text-text-primary">
                    {event.title}
                  </span>

                  <span className="flex items-center gap-1 truncate text-caption text-text-secondary">
                    {event.isOnline ? (
                      <>
                        <Video className="h-3 w-3 shrink-0" aria-hidden />
                        Onlayn
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {event.location ?? "Yer dəqiqləşdirilir"}
                      </>
                    )}
                  </span>

                  <Badge variant="outline" className="w-fit text-caption font-normal">
                    {event.rsvpCount} qeydiyyat
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
