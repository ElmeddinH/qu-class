// ============================================================================
// src/features/events/EventDetail.tsx
// Tədbir detalı [M13] — /events/[id] (spec §14).
//
// Bölmələr:
//   1. Cover + başlıq + rozetlər (reunion → ku-cream accent)
//   2. Məlumat sətirləri + XƏRİTƏ LİNKİ
//   3. Proqram (markdown)
//   4. RSVP paneli (Qəbul et / Rədd et / Qeydiyyatdan keç, tutum → WAITLISTED)
//   5. İştirakçı avatarları (redactProfile-a hörmətlə)
//   6. "Təqvimə əlavə et" → /api/events/[id]/ics
//   7. Tədbirdən sonra: albom · rəy · iştirak statistikası · Timeline
//
// ⚠️ SERVER komponentidir. `AttendanceChart`, `RsvpPanel`, `FeedbackForm`,
// `EventAlbum`, `TimelinePublishCard` — client; onlara yalnız SADƏ dəyərlər
// ötürülür (funksiya və ikon komponenti YOX — CLAUDE.md §12).
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Mail,
  MapPin,
  Settings2,
  Star,
  UserRound,
  Users,
  Video,
} from "lucide-react";

import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { StatCard } from "@/components/shared/StatCard";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EventStatus } from "@/lib/enums";
import { eventStatusLabel, rsvpStatusLabel } from "@/lib/labels";
import { attendanceRate, isFull, registrationClosed, seatsLeft } from "@/lib/rsvp";
import { cn } from "@/lib/utils";
import type { EventDetail as EventDetailData } from "@/services/event.service";
import { ATTENDEE_AVATAR_LIMIT } from "@/services/event.service";
import { exactDateTime, shortDate, timeOfDay } from "@/utils/date";

import { AttendanceChart } from "./AttendanceChart.lazy";
import {
  EVENT_ICONS,
  REUNION_BADGE_CLASS,
  eventCategoryMeta,
  eventScopeMeta,
  isReunion,
  reunionCardAccent,
} from "./catalog";
import { EventAlbum } from "./EventAlbum";
import { FeedbackForm } from "./FeedbackForm";
import { MarkdownAgenda } from "./MarkdownAgenda";
import { RsvpPanel } from "./RsvpPanel";
import { TimelinePublishCard } from "./TimelinePublishCard";

interface EventDetailProps {
  event: EventDetailData;
  /** Səhifənin "indi"si — server komponentindən bir dəfə ötürülür. */
  now: Date;
  /** Viewer giriş edibmi (anonim baxış hələ yalnız `(public)/events`-dədir). */
  isAuthenticated: boolean;
}

/**
 * Xəritə keçidi (spec §14).
 *
 * ⚠️ Xarici xəritə xidmətinə YALNIZ ünvan MƏTNİ göndərilir — koordinat
 * saxlanmır və göndərilmir. `Event.location` onsuz da təşkilatçının açıq
 * yazdığı ünvandır, istifadəçinin şəxsi məkanı deyil.
 */
function mapHref(location: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`;
}

export function EventDetail({ event, now, isAuthenticated }: EventDetailProps) {
  const reunion = isReunion(event.scope);
  const finished = event.startsAt.getTime() < now.getTime();

  const scopeMeta = eventScopeMeta(event.scope);
  const categoryMeta = eventCategoryMeta(event.category);
  const ScopeIcon = EVENT_ICONS[scopeMeta.icon];
  const CategoryIcon = EVENT_ICONS[categoryMeta.icon];

  const seatsTaken = event.breakdown.seatsTaken;
  const full = isFull(event.capacity, seatsTaken);
  const left = seatsLeft(event.capacity, seatsTaken);
  const rate = attendanceRate(event.breakdown);

  return (
    <div className="flex flex-col gap-6">
      {/* ================= 1. Başlıq ================= */}
      <header
        className={cn(
          "flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds",
          reunionCardAccent(event.scope),
        )}
      >
        {event.coverUrl ? (
          <div className="relative h-48 w-full overflow-hidden rounded-card bg-background sm:h-64">
            <Image
              src={event.coverUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

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

          <Badge
            variant="outline"
            className="gap-1 text-caption font-normal text-text-secondary"
          >
            <CategoryIcon className="h-3 w-3" aria-hidden />
            {categoryMeta.label}
          </Badge>

          <VisibilityBadge level={event.visibility} />

          {event.status !== EventStatus.PUBLISHED ? (
            <Badge
              variant="outline"
              className={cn(
                "text-caption font-normal",
                event.status === EventStatus.CANCELLED
                  ? "border-danger text-danger-strong"
                  : "text-text-secondary",
              )}
            >
              {eventStatusLabel(event.status)}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-h1 font-bold text-text-primary">{event.title}</h1>
            {event.description ? (
              <p className="text-body text-text-secondary">{event.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* 6 — Təqvimə əlavə et */}
            <Button asChild variant="outline" className="gap-2">
              {/* `download` atributu ilə brauzer faylı ENDİRİR, açmır. */}
              <a href={`/api/events/${event.id}/ics`} download>
                <CalendarDays className="h-4 w-4" aria-hidden />
                Təqvimə əlavə et
              </a>
            </Button>

            {event.viewerCanManage ? (
              <Button asChild className="gap-2">
                <Link href={`/events/${event.id}/manage`}>
                  <Settings2 className="h-4 w-4" aria-hidden />
                  Koordinator paneli
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          {/* ================= 2. Məlumatlar ================= */}
          <section
            aria-labelledby="event-facts"
            className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
          >
            <h2 id="event-facts" className="text-h4 font-medium text-text-primary">
              Məlumatlar
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact icon={CalendarClock} label="Tarix və saat">
                <span title={exactDateTime(event.startsAt)}>
                  {shortDate(event.startsAt)} · {timeOfDay(event.startsAt)}
                  {event.endsAt ? ` — ${timeOfDay(event.endsAt)}` : ""}
                </span>
              </Fact>

              <Fact icon={event.isOnline ? Video : MapPin} label="Yer">
                {event.isOnline ? (
                  event.onlineUrl ? (
                    <a
                      href={event.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-ku-green hover:underline"
                    >
                      Onlayn keçid
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    "Onlayn"
                  )
                ) : event.location ? (
                  <span className="flex flex-col gap-1">
                    {event.location}
                    <a
                      href={mapHref(event.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-1 text-caption text-ku-green hover:underline"
                    >
                      Xəritədə göstər
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </span>
                ) : (
                  "Yer dəqiqləşdirilir"
                )}
              </Fact>

              <Fact icon={Users} label="İştirak">
                {seatsTaken} nəfər
                {event.capacity === null
                  ? " · limitsiz"
                  : full
                    ? " · tutum dolub"
                    : ` · ${left} yer qalıb`}
              </Fact>

              <Fact icon={CalendarDays} label="Qeydiyyat son tarixi">
                {event.registrationDeadline
                  ? shortDate(event.registrationDeadline)
                  : "Son tarix yoxdur"}
              </Fact>

              <Fact icon={UserRound} label="Təşkilatçı">
                {event.createdBy.firstName} {event.createdBy.lastName}
                {event.cohort ? ` · ${event.cohort.displayName}` : ""}
                {event.faculty ? ` · ${event.faculty.name}` : ""}
                {event.club ? ` · ${event.club.name}` : ""}
              </Fact>

              {event.contact ? (
                <Fact icon={Mail} label="Əlaqələndirici">
                  <Link
                    href={`/u/${event.contact.id}`}
                    className="text-ku-green hover:underline"
                  >
                    {event.contact.firstName} {event.contact.lastName}
                  </Link>
                </Fact>
              ) : null}
            </dl>
          </section>

          {/* ================= 3. Proqram ================= */}
          {event.agenda ? (
            <section
              aria-labelledby="event-agenda"
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
            >
              <h2 id="event-agenda" className="text-h4 font-medium text-text-primary">
                Proqram
              </h2>
              <MarkdownAgenda source={event.agenda} />
            </section>
          ) : null}

          {/* ================= 5. İştirakçılar ================= */}
          <section
            aria-labelledby="event-attendees"
            className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="event-attendees" className="text-h4 font-medium text-text-primary">
                İştirakçılar
              </h2>
              <span className="text-small text-text-secondary">
                {seatsTaken} nəfər yer tutub
              </span>
            </div>

            {event.attendees.length === 0 ? (
              <p className="text-small text-text-secondary">
                Hələ heç kim qeydiyyatdan keçməyib — ilk siz olun.
              </p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-3">
                  {event.attendees.map((attendee) => (
                    <li key={attendee.id}>
                      <Link
                        href={`/u/${attendee.id}`}
                        title={`${attendee.firstName} ${attendee.lastName} · ${rsvpStatusLabel(attendee.status)}`}
                        className="block rounded-avatar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {/* ⚠️ `avatarUrl` `redactProfile`-dan keçib: gizlədilibsə
                            `null` gəlir və baş hərflər göstərilir. */}
                        <Avatar className="h-10 w-10">
                          {attendee.avatarUrl ? (
                            <AvatarImage src={attendee.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                            {attendee.firstName.charAt(0)}
                            {attendee.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="sr-only">
                          {attendee.firstName} {attendee.lastName}
                        </span>
                      </Link>
                    </li>
                  ))}

                  {seatsTaken > ATTENDEE_AVATAR_LIMIT ? (
                    <li
                      className="flex h-10 w-10 items-center justify-center rounded-avatar bg-background text-caption text-text-secondary"
                      aria-label={`və daha ${seatsTaken - ATTENDEE_AVATAR_LIMIT} nəfər`}
                    >
                      +{seatsTaken - ATTENDEE_AVATAR_LIMIT}
                    </li>
                  ) : null}
                </ul>

                <p className="text-caption text-text-secondary">
                  Dəvəti rədd edənlər və hələ cavab verməyənlər burada göstərilmir.
                </p>
              </>
            )}
          </section>

          {/* ================= 7. Tədbirdən sonra ================= */}
          {finished ? (
            <>
              <Separator />

              <section aria-labelledby="event-after" className="flex flex-col gap-6">
                <h2 id="event-after" className="text-h2 font-semibold text-text-primary">
                  Tədbirdən sonra
                </h2>

                {event.summary ? (
                  <p className="rounded-card border border-border bg-surface p-6 text-body text-text-primary shadow-sm-kuds">
                    {event.summary}
                  </p>
                ) : null}

                <EventAlbum
                  eventId={event.id}
                  photos={event.photos}
                  canManage={event.viewerCanManage}
                />

                {/* İştirak statistikası — Recharts */}
                <section
                  aria-labelledby="event-stats"
                  className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
                >
                  <h3 id="event-stats" className="text-h4 font-medium text-text-primary">
                    İştirak statistikası
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard icon={Users} value={seatsTaken} label="Yer tutan" />
                    <StatCard
                      icon={CalendarClock}
                      value={rate === null ? "—" : `${rate}%`}
                      label="İştirak nisbəti"
                      hint={`${event.breakdown.attended} nəfər gəlib`}
                    />
                    <StatCard
                      icon={Star}
                      value={event.averageRating ?? "—"}
                      label="Orta qiymət"
                      hint="1—5 arası"
                    />
                  </div>

                  <AttendanceChart byStatus={event.breakdown.byStatus} />
                </section>

                {event.viewerCanReview ? (
                  <FeedbackForm
                    eventId={event.id}
                    initialRating={event.viewerRsvp?.rating ?? null}
                    initialFeedback={event.viewerRsvp?.feedback ?? null}
                  />
                ) : null}

                {event.viewerCanManage ? (
                  <TimelinePublishCard
                    eventId={event.id}
                    cohortSlug={event.cohort?.slug ?? null}
                    visibility={event.visibility}
                    addedToTimeline={event.addedToTimeline}
                  />
                ) : null}
              </section>
            </>
          ) : null}
        </div>

        {/* ================= Sağ sütun ================= */}
        <aside className="flex flex-col gap-6">
          {/* 4 — RSVP */}
          {isAuthenticated ? (
            <RsvpPanel
              eventId={event.id}
              currentStatus={event.viewerRsvp?.status ?? null}
              full={full}
              seatsLeft={left}
              registrationClosed={registrationClosed(event.registrationDeadline, now)}
              finished={finished}
              eventStatus={event.status}
            />
          ) : null}

          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-sm-kuds">
            <h2 className="text-h4 font-medium text-text-primary">Təşkilatçı</h2>
            <MemberIdentity
              id={event.createdBy.id}
              firstName={event.createdBy.firstName}
              lastName={event.createdBy.lastName}
              avatarUrl={event.createdBy.avatarUrl}
              subtitle={scopeMeta.label}
            />

            {event.cohort ? (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link href={`/class/${event.cohort.slug}/events`}>
                  Sinfin bütün tədbirləri
                </Link>
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Məlumat sətri
// ---------------------------------------------------------------------------

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarClock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-avatar bg-ku-soft"
        aria-hidden
      >
        <Icon className="h-4 w-4 text-ku-dark" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-caption text-text-secondary">{label}</dt>
        <dd className="text-small text-text-primary">{children}</dd>
      </div>
    </div>
  );
}
