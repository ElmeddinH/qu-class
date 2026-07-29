// ============================================================================
// ALUMNI widget-i — məzunlar görüşləri (spec §15, PLAN.md §4.6).
//
// ⚠️ Reunion `Event.scope = "REUNION"` ilə işarələnir, `Event.category` ilə YOX
// (`enums.ts` xəbərdarlığı). `category` tədbirin NÖVÜDÜR, `scope` isə
// təşkilatçı səviyyəsi.
//
// `upcoming` filtri QƏSDƏN verilmir: keçmiş görüşlər də sinfin yaddaşının
// bir hissəsidir və məzun səhifəsində göstərilməlidir. Sıralama gələcəkdən
// keçmişə doğrudur.
// ============================================================================

import Link from "next/link";
import { PartyPopper } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { EventScope } from "@/lib/enums";
import { listEvents } from "@/services/event.service";
import { shortDate } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function Reunions({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const now = new Date();

  const reunions = await listEvents(viewer, {
    audienceCohortId: cohort.id,
    scope: EventScope.REUNION,
    take: WIDGET_ITEM_LIMIT,
  });

  // Servis `startsAt asc` qaytarır; məzun səhifəsində əvvəlcə GƏLƏCƏK görüş
  // maraqlıdır, keçmişlər isə yaxından uzağa doğru.
  const sorted = [...reunions].sort((a, b) => {
    const aUpcoming = a.startsAt >= now;
    const bUpcoming = b.startsAt >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming
      ? a.startsAt.getTime() - b.startsAt.getTime()
      : b.startsAt.getTime() - a.startsAt.getTime();
  });

  return (
    <WidgetCard
      headingId={headingId}
      title="Məzunlar görüşləri"
      icon="reunion"
      description="Sinfin illik görüşləri və məzun tədbirləri."
      action={{ href: `/class/${cohort.slug}/events`, label: "Tədbirlər" }}
    >
      {sorted.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Hələ görüş planlaşdırılmayıb"
          description="Məzunlar görüşünü tədbir koordinatoru və ya sinif nümayəndəsi elan edir."
          action={{ href: `/class/${cohort.slug}/events`, label: "Tədbirlərə bax" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((event) => {
            const upcoming = event.startsAt >= now;

            return (
              <li key={event.id}>
                {/* PLAN.md §4.2 — tədbir detalı `/events/[id]`. */}
                <Link
                  href={`/events/${event.id}`}
                  className="flex flex-col gap-1 rounded-card border border-border p-3 transition-colors hover:border-ku-green hover:bg-ku-soft/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        upcoming
                          ? "bg-ku-soft text-caption font-normal text-ku-dark hover:bg-ku-soft"
                          : "bg-background text-caption font-normal text-text-secondary hover:bg-background"
                      }
                      variant={upcoming ? "default" : "outline"}
                    >
                      {upcoming ? "Qarşıdadır" : "Keçib"}
                    </Badge>
                    <span className="text-caption text-text-secondary">
                      {shortDate(event.startsAt)}
                    </span>
                  </div>

                  <span className="text-small font-medium text-text-primary">
                    {event.title}
                  </span>

                  <span className="text-caption text-text-secondary">
                    {event.location ?? "Yer dəqiqləşdirilir"} · {event.rsvpCount} iştirakçı
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
