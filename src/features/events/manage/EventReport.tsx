// ============================================================================
// src/features/events/manage/EventReport.tsx
// Yekun hesabat — /events/[id]/report (spec §14).
//
// 🔴 PDF DEYİL, ÇAP ÜÇÜN STİLLƏNMİŞ SƏHİFƏDİR (PLAN.md Blok 9 tələbi).
// PDF generatoru yeni asılılıq gətirərdi (stack kilidlidir) və brauzerin
// «Çap → PDF olaraq saxla» funksiyası eyni nəticəni verir.
//
// ⚠️ ÇAP STİLLƏRİ `print:` variantı ilə yazılır — ayrıca CSS faylı yoxdur:
//   · `print:hidden`  → düymələr, naviqasiya
//   · `print:border-0 print:shadow-none` → kağızda kölgə mənasızdır
//   · `break-inside-avoid` → cədvəl sətri iki səhifəyə bölünməsin
//
// ⚠️ RƏYLƏR ANONİMDİR — servis müəllif adını ÜMUMİYYƏTLƏ qaytarmır
// (`getEventReport`). Hesabat çap olunub paylanır, ad orada olsaydı rəy
// sorğusuna etibar bitərdi.
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { PrintButton } from "@/components/shared/PrintButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth";
import { RSVP_STATUS_VALUES } from "@/lib/enums";
import {
  eventCategoryLabel,
  eventScopeLabel,
  eventStatusLabel,
  rsvpStatusLabel,
} from "@/lib/labels";
import { getEventReport } from "@/services/event.service";
import { exactDateTime, shortDate, timeOfDay } from "@/utils/date";

import { MarkdownAgenda } from "../MarkdownAgenda";

export async function EventReport({ eventId }: { eventId: string }) {
  const viewer = await requireUser();

  const result = await getEventReport(viewer, eventId);
  // İcazə yoxdursa 404 — "yoxdur" və "icazə yoxdur" ayırd edilmir.
  if (!result.ok) notFound();

  const { event, breakdown, comments } = result.value;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Ekran naviqasiyası — kağızda görünmür. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/events/${event.id}/manage`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Koordinator panelinə qayıt
          </Link>
        </Button>

        <PrintButton>
          <Printer className="h-4 w-4" aria-hidden />
          Çap et
        </PrintButton>
      </div>

      <article className="flex flex-col gap-6 rounded-card border border-border bg-surface p-8 shadow-sm-kuds print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-2">
          <p className="text-caption uppercase tracking-wide text-text-secondary">
            Qarabağ Universiteti · Tədbir hesabatı
          </p>
          <h1 className="text-h1 font-bold text-text-primary">{event.title}</h1>
          <p className="text-small text-text-secondary">
            {eventScopeLabel(event.scope)} · {eventCategoryLabel(event.category)} ·{" "}
            {eventStatusLabel(event.status)}
          </p>
        </header>

        <Separator />

        {/* ---- Əsas məlumat ---- */}
        <section className="break-inside-avoid">
          <h2 className="mb-3 text-h4 font-medium text-text-primary">Məlumatlar</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReportFact label="Tarix">
              <span title={exactDateTime(event.startsAt)}>
                {shortDate(event.startsAt)} · {timeOfDay(event.startsAt)}
                {event.endsAt ? ` — ${timeOfDay(event.endsAt)}` : ""}
              </span>
            </ReportFact>
            <ReportFact label="Yer">
              {event.isOnline ? "Onlayn" : (event.location ?? "—")}
            </ReportFact>
            <ReportFact label="Təşkilatçı">
              {event.createdBy.firstName} {event.createdBy.lastName}
            </ReportFact>
            <ReportFact label="Sinif / fakültə / klub">
              {event.cohort?.displayName ??
                event.faculty?.name ??
                event.club?.name ??
                "Universitet"}
            </ReportFact>
            <ReportFact label="Tutum">
              {event.capacity === null ? "Limitsiz" : `${event.capacity} nəfər`}
            </ReportFact>
            <ReportFact label="Foto albom">
              {result.value.photoCount} şəkil
            </ReportFact>
          </dl>
        </section>

        <Separator />

        {/* ---- Rəqəmlər ---- */}
        <section className="break-inside-avoid">
          <h2 className="mb-3 text-h4 font-medium text-text-primary">İştirak</h2>

          <dl className="grid gap-3 sm:grid-cols-3">
            <ReportFact label="Yer tutan">{breakdown.seatsTaken} nəfər</ReportFact>
            <ReportFact label="İştirak edən">{breakdown.attended} nəfər</ReportFact>
            <ReportFact label="İştirak nisbəti">
              {result.value.attendanceRate === null
                ? "—"
                : `${result.value.attendanceRate}%`}
            </ReportFact>
          </dl>

          {/* Statuslar üzrə bölgü — DİAQRAM DEYİL, cədvəl. Recharts SVG-si
              bəzi brauzerlərdə çapda boş çıxır; rəqəm cədvəli həmişə çıxır. */}
          <table className="mt-4 w-full border-collapse text-small">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th scope="col" className="py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Say
                </th>
              </tr>
            </thead>
            <tbody>
              {RSVP_STATUS_VALUES.map((status) => (
                <tr key={status} className="border-b border-border break-inside-avoid">
                  <td className="py-2 text-text-primary">{rsvpStatusLabel(status)}</td>
                  <td className="py-2 text-right text-text-primary">
                    {breakdown.byStatus[status]}
                  </td>
                </tr>
              ))}
              <tr className="break-inside-avoid">
                <td className="py-2 font-medium text-text-primary">Cəmi RSVP</td>
                <td className="py-2 text-right font-medium text-text-primary">
                  {breakdown.total}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ---- Yekun mətni ---- */}
        {result.value.summary ? (
          <>
            <Separator />
            <section className="break-inside-avoid">
              <h2 className="mb-3 text-h4 font-medium text-text-primary">Yekun</h2>
              <p className="text-small text-text-primary">{result.value.summary}</p>
            </section>
          </>
        ) : null}

        {/* ---- Proqram ---- */}
        {result.value.agenda ? (
          <>
            <Separator />
            <section className="break-inside-avoid">
              <h2 className="mb-3 text-h4 font-medium text-text-primary">Proqram</h2>
              <MarkdownAgenda source={result.value.agenda} />
            </section>
          </>
        ) : null}

        {/* ---- Rəylər (ANONİM) ---- */}
        <Separator />
        <section>
          <h2 className="mb-1 text-h4 font-medium text-text-primary">Rəylər</h2>
          <p className="mb-3 text-caption text-text-secondary">
            Orta qiymət: {result.value.averageRating ?? "—"} · {result.value.ratingCount}{" "}
            qiymət · rəylər anonimdir.
          </p>

          {comments.length === 0 ? (
            <p className="text-small text-text-secondary">Mətnli rəy yoxdur.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment, index) => (
                <li
                  key={index}
                  className="break-inside-avoid rounded-card border border-border p-3"
                >
                  <p className="text-caption text-text-secondary">
                    Qiymət: {comment.rating ?? "—"}/5
                  </p>
                  <p className="text-small text-text-primary">{comment.feedback}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-caption text-text-secondary">
          Hesabat {exactDateTime(new Date())} tarixində hazırlanıb ·
          {result.value.addedToTimeline
            ? " Tədbir sinif xronologiyasındadır."
            : " Tədbir hələ xronologiyaya əlavə edilməyib."}
        </footer>
      </article>
    </div>
  );
}

function ReportFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="text-small text-text-primary">{children}</dd>
    </div>
  );
}
