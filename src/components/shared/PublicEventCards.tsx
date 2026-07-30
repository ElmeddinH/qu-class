// ============================================================================
// src/components/shared/PublicEventCards.tsx
// «Açıq tədbirlər» kart qridi — YALNIZ ictimai tədbirlər.
//
// ⚠️ Blok 11A-da `features/welcome/`-dan bura köçdü: `/events` səhifəsi ikinci
// istifadəçi oldu və `features/*` bir-birindən import etmir (istiqamət həmişə
// features → shared, `PrintButton` və `MapSkeleton` ilə eyni yol).
//
// 🔴 SIZMA NÖQTƏSİ. Siyahı `listEvents(ANONYMOUS, …)` ilə çəkilir və
// `visibleWithStatus` anonim viewer üçün yalnız `visibility = PUBLIC` seçir.
// Burada ƏLAVƏ FİLTR YOXDUR və olmamalıdır: ikinci filtr yazsaydıq iki
// müstəqil məxfilik məntiqi yaranardı və biri köhnələrdi (CLAUDE.md §5).
//
// ⚠️ Açılış səhifəsi və `/events` ANONİM viewer-lə oxuyur — hətta giriş etmiş
// istifadəçi üçün də. Səbəb: bunlar ictimai səhifələrdir və məzmunları
// ziyarətçidən ziyarətçiyə dəyişməməlidir; sinif tədbirləri
// `/class/[slug]/events`-dədir. Bu, "girişdən sonra ictimai səhifədə sinif
// tədbiri göründü" sızmasını struktur olaraq bağlayır.
//
// ⚠️ Kartda RSVP və iştirakçı sayı GÖSTƏRİLMİR: `attendingCount` sinif daxili
// məlumatdır (kim gəlir sualına yaxınlaşır) və ictimai səhifədə yeri yoxdur.
//
// ⚠️ `hrefFor` OPSİYONALDIR. Açılış səhifəsində kart LİNKSİZDİR (tam siyahı
// `/events`-dədir), `/events` səhifəsində isə `/events/[id]`-yə keçir. Həmin
// detal səhifəsi AUTH ARXASINDADIR və bu, qəsdəndir: orada RSVP və iştirakçı
// siyahısı var. Anonim ziyarətçi `/login?callbackUrl=…`-ə düşür, yəni girişdən
// sonra MƏHZ həmin tədbirə qayıdır.
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Monitor } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { eventCategoryLabel, eventScopeLabel } from "@/lib/labels";
import type { EventItem } from "@/services/event.service";

interface PublicEventCardsProps {
  events: EventItem[];
  /** Kart başlığından keçid — verilməzsə kart mətn kartı olaraq qalır. */
  hrefFor?: (event: EventItem) => string;
  /** Boş halda göstərilən mətn — səhifədən səhifəyə fərqlidir. */
  emptyTitle?: string;
  emptyDescription?: string;
}

/** Tarix formatı: "12 sentyabr 2026, 13:00". */
const DATE_FORMAT = new Intl.DateTimeFormat("az-AZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("az-AZ", {
  hour: "2-digit",
  minute: "2-digit",
});

export function PublicEventCards({
  events,
  hrefFor,
  emptyTitle = "Açıq tədbir yoxdur",
  emptyDescription = "Hazırda ictimaiyyətə açıq qarşıdan gələn tədbir elan olunmayıb. Sinif, fakültə və universitet tədbirlərini görmək üçün daxil olun.",
}: PublicEventCardsProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={{ href: "/login", label: "Daxil ol" }}
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds"
        >
          {event.coverUrl ? (
            <div className="relative aspect-[12/5] w-full bg-muted">
              <Image
                src={event.coverUrl}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-badge bg-ku-soft px-3 py-1 text-caption text-ku-dark">
                {eventScopeLabel(event.scope)}
              </span>
              <span className="rounded-badge bg-ku-blue px-3 py-1 text-caption text-text-primary">
                {eventCategoryLabel(event.category)}
              </span>
            </div>

            <h3 className="text-h4 font-medium text-text-primary">
              {hrefFor ? (
                <Link
                  href={hrefFor(event)}
                  className="transition-colors hover:text-ku-green"
                >
                  {event.title}
                </Link>
              ) : (
                event.title
              )}
            </h3>

            {event.description ? (
              <p className="line-clamp-3 text-small text-text-secondary">
                {event.description}
              </p>
            ) : null}

            <dl className="mt-auto flex flex-col gap-1 text-small text-text-secondary">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Tarix</dt>
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                <dd>
                  {DATE_FORMAT.format(event.startsAt)}, {TIME_FORMAT.format(event.startsAt)}
                </dd>
              </div>

              <div className="flex items-center gap-2">
                <dt className="sr-only">Yer</dt>
                {event.isOnline ? (
                  <>
                    <Monitor className="h-4 w-4 shrink-0" aria-hidden />
                    <dd>Onlayn</dd>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <dd>{event.location ?? "Yer sonra açıqlanacaq"}</dd>
                  </>
                )}
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
