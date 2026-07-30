// ============================================================================
// src/features/events/manage/EventManager.tsx
// Event Coordinator paneli [M13] — /events/[id]/manage (spec §14).
//
// Bölmələr:
//   1. Xülasə göstəriciləri (StatCard)
//   2. Tədbiri tamamla + yekun mətni
//   3. İştirakçı cədvəli (KUDS §14: sort · filter · pagination · search ·
//      export CSV · responsive) + qeydiyyat təsdiqi + check-in
//   4. Toplu bildiriş
//   5. Yekun hesabata keçid (çap üçün stillənmiş səhifə)
//
// 🔴 İCAZƏ İKİ QATDIR: səhifə `canManageEvent` ilə açılır (aşağıdakı `page.tsx`),
// SERVİS isə hər əməliyyatda qapını yenidən yoxlayır (`loadManageableEvent`).
// Server action birbaşa çağırıla bilər — səhifə qapısı TƏK qoruma deyil.
//
// ⚠️ Bu ekranda `redactProfile` YOXDUR və bu, QƏSDƏNDİR: iştirakçı cədvəli
// idarəetmə axınıdır (eynilə Blok 8-dəki moderasiya növbəsi), koordinator
// qeydiyyatı təsdiqləmək üçün e-poçtu görməlidir. Səbəb servisdə də yazılıb.
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, FileText, Star, UserCheck, Users } from "lucide-react";

import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { attendanceRate } from "@/lib/rsvp";
import { type AttendeeFilterState } from "@/lib/event-filters";
import { rsvpStatusLabel } from "@/lib/labels";
import {
  ATTENDEE_PAGE_SIZE,
  getEventDetail,
  listEventAttendees,
} from "@/services/event.service";
import { shortDate, timeOfDay } from "@/utils/date";

import { AttendeeTable } from "./AttendeeTable";
import { BulkNotify } from "./BulkNotify";
import { CompleteEventForm } from "./CompleteEventForm";

interface EventManagerProps {
  eventId: string;
  filters: AttendeeFilterState;
}

export async function EventManager({ eventId, filters }: EventManagerProps) {
  const viewer = await requireUser();
  const now = new Date();

  const event = await getEventDetail(viewer, eventId, now);
  // ⚠️ `getEventDetail` GÖRÜNÜRLÜK filtrindən keçir. Koordinator öz `DRAFT`
  // tədbirini də görür (sahib şaxəsi), yəni bu şərt paneli bloklamır.
  if (!event) notFound();
  if (!event.viewerCanManage) notFound();

  const table = await listEventAttendees(viewer, eventId, {
    status: filters.status === null ? undefined : (filters.status as never),
    search: filters.search,
    take: ATTENDEE_PAGE_SIZE,
    skip: (Math.max(filters.page, 1) - 1) * ATTENDEE_PAGE_SIZE,
  });

  // Servis qapısı səhifə qapısı ilə razılaşmalıdır; ayrılsa bu, səhvdir.
  if (!table.ok) notFound();

  const rate = attendanceRate(event.breakdown);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-small text-text-secondary">
            <Link href={`/events/${event.id}`} className="text-ku-green hover:underline">
              {event.title}
            </Link>
            {" · "}
            {shortDate(event.startsAt)} · {timeOfDay(event.startsAt)}
          </p>
          <h1 className="text-h1 font-bold text-text-primary">Koordinator paneli</h1>
        </div>

        <Button asChild variant="outline" className="gap-2">
          <Link href={`/events/${event.id}/report`}>
            <FileText className="h-4 w-4" aria-hidden />
            Yekun hesabat
          </Link>
        </Button>
      </header>

      {/* ---- 1. Xülasə ---- */}
      <section aria-label="Tədbir göstəriciləri" className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={Users}
          value={event.breakdown.seatsTaken}
          label="Yer tutan"
          hint={event.capacity === null ? "Limitsiz" : `Tutum: ${event.capacity}`}
        />
        <StatCard
          icon={UserCheck}
          value={event.breakdown.attended}
          label="İştirak edib"
          hint={rate === null ? undefined : `${rate}% iştirak`}
        />
        <StatCard
          icon={CalendarClock}
          value={event.breakdown.waitlisted}
          label={rsvpStatusLabel("WAITLISTED")}
        />
        <StatCard
          icon={Star}
          value={event.averageRating ?? "—"}
          label="Orta qiymət"
          hint="1—5 arası"
        />
      </section>

      {/* ---- 2. Tədbiri tamamla ---- */}
      <CompleteEventForm
        eventId={event.id}
        status={event.status}
        summary={event.summary}
        finished={event.startsAt.getTime() < now.getTime()}
      />

      {/* ---- 3. İştirakçı cədvəli ---- */}
      <AttendeeTable
        eventId={event.id}
        // ⚠️ `Date` obyektləri client komponentinə ISO SƏTRİ kimi ötürülür:
        // server → client sərhədindən keçən dəyər seriallaşdırıla bilməlidir
        // və formatlama `utils/date.ts`-də onsuz da `string | Date` qəbul edir.
        rows={table.value.rows.map((row) => ({
          userId: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          cohortRole: row.cohortRole,
          status: row.status,
          registeredAt: row.registeredAt?.toISOString() ?? null,
          checkedInAt: row.checkedInAt?.toISOString() ?? null,
          rating: row.rating,
        }))}
        total={table.value.total}
        pageSize={ATTENDEE_PAGE_SIZE}
      />

      {/* ---- 4. Toplu bildiriş ---- */}
      <BulkNotify eventId={event.id} byStatus={table.value.breakdown.byStatus} />
    </div>
  );
}
