// ============================================================================
// src/features/welcome/PublicEventCards.tsx
// «Qarşıdan gələn tədbirlər» — YALNIZ ictimai tədbirlər.
//
// 🔴 TƏLƏ E — SIZMA NÖQTƏSİ. Siyahı `listEvents(ANONYMOUS, …)` ilə çəkilir və
// `visibleWithStatus` anonim viewer üçün yalnız `visibility = PUBLIC` seçir.
// Burada ƏLAVƏ FİLTR YOXDUR və olmamalıdır: ikinci filtr yazsaydıq iki
// müstəqil məxfilik məntiqi yaranardı və biri köhnələrdi (CLAUDE.md §5).
//
// ⚠️ Açılış səhifəsi ANONİM viewer-lə oxuyur — hətta giriş etmiş istifadəçi
// üçün də. Səbəb: `/` ictimai səhifədir və məzmunu ziyarətçidən ziyarətçiyə
// dəyişməməlidir; sinif məzmununu görmək üçün `/home` var. Bu, həm keşləməni
// sadələşdirir, həm də "girişdən sonra açılışda sinif postu göründü" kimi
// gözlənilməz sızmanı struktur olaraq bağlayır.
//
// ⚠️ Kartda RSVP və iştirakçı sayı GÖSTƏRİLMİR: `attendingCount` sinif daxili
// məlumatdır (kim gəlir sualına yaxınlaşır) və ictimai səhifədə yeri yoxdur.
// ============================================================================

import Image from "next/image";
import { CalendarDays, Clock, MapPin, Monitor } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { eventCategoryLabel, eventScopeLabel } from "@/lib/labels";
import type { EventItem } from "@/services/event.service";

interface PublicEventCardsProps {
  events: EventItem[];
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

export function PublicEventCards({ events }: PublicEventCardsProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Açıq tədbir yoxdur"
        description="Hazırda ictimaiyyətə açıq qarşıdan gələn tədbir elan olunmayıb. Sinif, fakültə və universitet tədbirlərini görmək üçün daxil olun."
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

            <h3 className="text-h4 font-medium text-text-primary">{event.title}</h3>

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
