// ============================================================================
// src/features/events/EventCard.tsx
// Tədbir kartı — siyahı görünüşü (KUDS §12: Title → Description → Content →
// Actions).
//
// ⚠️ SERVER komponentidir — ikonlar birbaşa import olunur, sərhəd keçilmir.
//
// 🔴 REUNION VİZUAL FƏRQİ (spec §15, Blok 9): `scope = REUNION` kartı
// `ku-cream` accent alır. Yoxlama `category`-yə görə DEYİL — `EventCategory`-də
// `REUNION` dəyəri yoxdur (`lib/enums.ts` §10).
//
// ⚠️ KUDS §3: `ku-cream` yalnız FON kimi işlədilir, mətn `text-text-primary`
// qalır (ağ mətn kontrastı 1.1:1 olardı).
// ============================================================================

import Link from "next/link";
import Image from "next/image";
import { CalendarClock, MapPin, UserCheck, Users, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { EventStatus } from "@/lib/enums";
import { eventStatusLabel } from "@/lib/labels";
import { isFull, seatsLeft } from "@/lib/rsvp";
import { cn } from "@/lib/utils";
import type { EventItem } from "@/services/event.service";
import { dayMonth, shortDate, timeOfDay } from "@/utils/date";

import {
  EVENT_ICONS,
  REUNION_BADGE_CLASS,
  eventCategoryMeta,
  eventScopeMeta,
  isReunion,
  reunionCardAccent,
} from "./catalog";

interface EventCardProps {
  event: EventItem;
  /** Səhifənin "indi"si — server komponentindən bir dəfə ötürülür. */
  now: Date;
}

export function EventCard({ event, now }: EventCardProps) {
  const reunion = isReunion(event.scope);
  const upcoming = event.startsAt.getTime() >= now.getTime();

  const scopeMeta = eventScopeMeta(event.scope);
  const categoryMeta = eventCategoryMeta(event.category);
  const ScopeIcon = EVENT_ICONS[scopeMeta.icon];
  const CategoryIcon = EVENT_ICONS[categoryMeta.icon];

  // `attendingCount` YER TUTAN statuslarla süzülüb (dəvətlər sayılmır) — bax
  // `EventItem.attendingCount`. Xam RSVP sayı işlədilsəydi dəvət göndərilən
  // kimi hər tədbir "tutum dolub" görünərdi.
  const left = seatsLeft(event.capacity, event.attendingCount);
  const full = isFull(event.capacity, event.attendingCount);

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds",
        "transition-colors hover:border-ku-green",
        reunionCardAccent(event.scope),
      )}
    >
      {event.coverUrl ? (
        <div className="relative h-32 w-full overflow-hidden rounded-card bg-background">
          <Image
            src={event.coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : null}

      {/* --- Rozetlər: təşkilatçı · kateqoriya · görünürlük --- */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-caption font-normal",
            reunion ? REUNION_BADGE_CLASS : "text-text-secondary",
          )}
        >
          <ScopeIcon className="h-3 w-3" aria-hidden />
          {scopeMeta.label}
        </Badge>

        <Badge variant="outline" className="gap-1 text-caption font-normal text-text-secondary">
          <CategoryIcon className="h-3 w-3" aria-hidden />
          {categoryMeta.label}
        </Badge>

        <VisibilityBadge level={event.visibility} />

        {event.status === EventStatus.CANCELLED ? (
          <Badge className="bg-danger-strong text-caption font-normal text-white hover:bg-danger-strong">
            {eventStatusLabel(event.status)}
          </Badge>
        ) : null}

        {!upcoming && event.status !== EventStatus.CANCELLED ? (
          <Badge variant="outline" className="text-caption font-normal text-text-secondary">
            Keçib
          </Badge>
        ) : null}
      </div>

      {/* --- Başlıq --- */}
      <div className="flex flex-col gap-2">
        <h3 className="text-h4 font-medium text-text-primary">
          <Link href={`/events/${event.id}`} className="hover:text-ku-green hover:underline">
            {event.title}
          </Link>
        </h3>

        {event.description ? (
          <p className="line-clamp-2 text-small text-text-secondary">{event.description}</p>
        ) : null}
      </div>

      {/* --- Məlumat sətirləri --- */}
      <dl className="flex flex-col gap-2 text-small text-text-secondary">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          <dt className="sr-only">Tarix</dt>
          <dd>
            {shortDate(event.startsAt)} · {timeOfDay(event.startsAt)}
            {event.endsAt ? ` — ${timeOfDay(event.endsAt)}` : ""}
          </dd>
        </div>

        <div className="flex items-start gap-2">
          {event.isOnline ? (
            <Video className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          ) : (
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          )}
          <dt className="sr-only">Yer</dt>
          <dd className="truncate">
            {event.isOnline ? "Onlayn" : (event.location ?? "Yer dəqiqləşdirilir")}
          </dd>
        </div>

        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          <dt className="sr-only">İştirak</dt>
          <dd>
            {event.attendingCount} iştirakçı
            {event.capacity === null
              ? " · limitsiz"
              : full
                ? " · tutum dolub"
                : ` · ${left} yer qalıb`}
          </dd>
        </div>

        {event.registrationDeadline && upcoming ? (
          <div className="flex items-start gap-2">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Qeydiyyat son tarixi</dt>
            <dd>Son qeydiyyat: {dayMonth(event.registrationDeadline)}</dd>
          </div>
        ) : null}
      </dl>

      {/* --- Alt sətir: təşkilatçı --- */}
      <p className="mt-auto text-caption text-text-secondary">
        {event.club?.name ?? event.faculty?.name ?? event.cohort?.displayName ?? "Universitet"}
        {" · "}
        {event.createdBy.firstName} {event.createdBy.lastName}
      </p>
    </article>
  );
}
