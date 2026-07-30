// ============================================================================
// src/features/yearbook/ClassYearbook.tsx
// Digital Yearbook — spec §11 («gələcək Digital Yearbook-da göstərilsin»).
//
// Sinfin albomu ÜÇ SUAL bölməsindən + bağlanış sitat divarından ibarətdir:
//   I.   Yaddaqalan an   → SHORT_MEMORY · MEMORABLE_EVENT
//   II.  Unudulmaz dərs  → UNFORGETTABLE_LESSON · THANKS_TEACHER
//   III. Sevimli yer     → `guidePlaceId != null` (TİPDƏN ASILI OLMAYARAQ)
//   Bağlanış             → WHAT_UNI_GAVE_ME · MESSAGE_TO_QU (sitat divarı)
//
// ⚠️ Qalan iki növ (UNIVERSITY_STORY, THANKS_CLASSMATE) «Sinif hekayələri»
// bölməsinə düşür. Sual bölməsi deyil, amma `showInYearbook` seçmiş istifadəçi
// xatirəsinin SƏSSİZCƏ İTMƏSİNİ görməməlidir — bax `lib/yearbook.ts`.
//
// 🔴 QRUPLAŞDIRMA BURADA DEYİL: qayda saf `lib/yearbook.ts` modulundadır və
// unit testlə örtülüdür (bir xatirə iki bölmədə görünmür, naməlum növ düşmür).
// Bu fayl yalnız render edir.
//
// 🔴 ÇAP GÖRÜNÜŞÜ (spec §11 «hekayəvi və vizual»):
//   · sidebar/header `print:hidden` — qayda `layouts/DashboardShell`-dədir
//   · fon ağ, kölgə yox, link URL-ləri gizli — `globals.css` → `@media print`
//   · hər kart `break-inside-avoid` (səhifə ortasında bölünmür)
//   · hər bölmə `print:break-before-page` (yeni səhifədən başlayır)
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import { BookHeart, CalendarRange, MapPin, Quote, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PrintButton } from "@/components/shared/PrintButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { memoryTypeLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  groupByPlace,
  groupYearbook,
  yearbookEntryCount,
  type YearbookGroup,
} from "@/lib/yearbook";
import type { CohortHeader } from "@/services/cohort.service";
import { listYearbook, type MemoryItem } from "@/services/memory.service";
import { shortDate } from "@/utils/date";

/** `groupYearbook`-un gözlədiyi minimal forma + kart üçün lazım olanlar. */
interface YearbookEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  occurredAt: Date;
  guidePlaceId: string | null;
  guidePlaceTitle: string | null;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  /** Sinfin ixtisası — üzv kartındaki alt sətir. */
  programName: string | null;
}

function toEntry(memory: MemoryItem, programName: string | null): YearbookEntry {
  return {
    id: memory.id,
    type: memory.type,
    title: memory.title,
    body: memory.body,
    imageUrl: memory.imageUrl,
    occurredAt: memory.occurredAt,
    guidePlaceId: memory.guidePlaceId,
    guidePlaceTitle: memory.guidePlace?.title ?? null,
    author: memory.author,
    programName,
  };
}

export async function ClassYearbook({ cohort }: { cohort: CohortHeader }) {
  const viewer = await getViewer();
  const memories = await listYearbook(viewer, cohort.id);

  const entries = memories.map((memory) => toEntry(memory, cohort.programName));
  const groups = groupYearbook(entries);
  const total = yearbookEntryCount(entries);

  /** Albomda təmsil olunan üzv sayı — eyni adam bir neçə xatirə yaza bilər. */
  const contributorCount = new Set(entries.map((entry) => entry.author.id)).size;

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------- Başlıq: sinfin kimliyi ---------------- */}
      <header className="flex flex-col gap-4 rounded-card border border-border bg-surface p-8 shadow-sm-kuds print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-caption uppercase tracking-wide text-text-secondary">
              Qarabağ Universiteti · Rəqəmsal albom
            </p>
            <h1 className="text-display font-bold text-text-primary">
              {cohort.displayName}
            </h1>
            {cohort.facultyName ? (
              <p className="text-body text-text-secondary">
                {cohort.facultyName}
                {cohort.programName ? ` · ${cohort.programName}` : ""}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/class/${cohort.slug}/memories`}>
                <BookHeart className="h-4 w-4" aria-hidden />
                Xatirələr
              </Link>
            </Button>
            <PrintButton withIcon>Çap et / PDF kimi saxla</PrintButton>
          </div>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-text-secondary">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Akademik illər</dt>
            <dd>
              {cohort.admissionYear}—{cohort.graduationYear}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Üzv sayı</dt>
            <dd>{cohort.memberCount} üzv</dd>
          </div>
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Albomdakı xatirə sayı</dt>
            <dd>
              {total} xatirə · {contributorCount} müəllif
            </dd>
          </div>
        </dl>
      </header>

      {total === 0 ? (
        <EmptyState
          icon={BookHeart}
          title="Hələ heç kim albom üçün xatirə seçməyib"
          description="Xatirə yazarkən «Albomda (Yearbook) göstər» seçimini işarələ — həmin xatirə bu səhifəyə düşür."
          action={{ href: `/class/${cohort.slug}/memories`, label: "Xatirə yaz" }}
        />
      ) : (
        groups.map((group) =>
          group.meta.layout === "wall" ? (
            <QuoteWall key={group.section} group={group} />
          ) : (
            <CardSection key={group.section} group={group} />
          ),
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kart bölməsi (I · II · III · sinif hekayələri)
// ---------------------------------------------------------------------------

function CardSection({ group }: { group: YearbookGroup<YearbookEntry> }) {
  const headingId = `yearbook-${group.section.toLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      // Hər bölmə çapda YENİ SƏHİFƏDƏN başlayır.
      className="flex flex-col gap-6 print:break-before-page"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-h2 font-semibold text-text-primary">
          {group.meta.title}
        </h2>
        <p className="text-body text-text-secondary">{group.meta.question}</p>
      </div>

      {group.items.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-6 py-4 text-small text-text-secondary">
          Bu sual hələ cavabsızdır.
        </p>
      ) : group.section === "PLACE" ? (
        // «Sevimli yer» məkan adına görə alt-qruplara bölünür.
        <div className="flex flex-col gap-6">
          {groupByPlace(group.items).map((place) => (
            <div key={place.placeId} className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-h4 font-medium text-text-primary">
                <MapPin className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
                {place.title}
              </h3>
              <EntryGrid items={place.items} />
            </div>
          ))}
        </div>
      ) : (
        <EntryGrid items={group.items} />
      )}
    </section>
  );
}

function EntryGrid({ items }: { items: YearbookEntry[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
      {items.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

/** Üzv kartı: avatar + ad + ixtisas + seçdiyi sitat. */
function EntryCard({ entry }: { entry: YearbookEntry }) {
  return (
    <article
      // Kart nə sütunlar, nə də ÇAP SƏHİFƏLƏRİ arasında bölünmür.
      className={cn(
        "flex break-inside-avoid flex-col gap-4 overflow-hidden rounded-card",
        "border border-border bg-surface shadow-sm-kuds print:shadow-none",
      )}
    >
      {entry.imageUrl ? (
        <div className="relative aspect-[3/2] w-full">
          <Image
            src={entry.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-6">
        <Badge
          variant="outline"
          className="w-fit text-caption font-normal text-text-primary"
        >
          {memoryTypeLabel(entry.type)}
        </Badge>

        <h4 className="text-h4 font-medium text-text-primary">{entry.title}</h4>

        <p className="whitespace-pre-line break-words text-body leading-relaxed text-text-primary">
          {entry.body}
        </p>

        <MemberIdentityLine entry={entry} />
      </div>
    </article>
  );
}

function MemberIdentityLine({ entry }: { entry: YearbookEntry }) {
  return (
    <div className="flex items-center gap-3 border-t border-border pt-4">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={entry.author.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
          {entry.author.firstName.charAt(0)}
          {entry.author.lastName.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-small font-medium text-text-primary">
          {entry.author.firstName} {entry.author.lastName}
        </span>
        <span className="truncate text-caption text-text-secondary">
          {entry.programName ?? "Qarabağ Universiteti"} ·{" "}
          <time dateTime={entry.occurredAt.toISOString()}>
            {shortDate(entry.occurredAt)}
          </time>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bağlanış — sitat divarı
// ---------------------------------------------------------------------------

function QuoteWall({ group }: { group: YearbookGroup<YearbookEntry> }) {
  const headingId = `yearbook-${group.section.toLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-6 print:break-before-page"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-h2 font-semibold text-text-primary">
          {group.meta.title}
        </h2>
        <p className="text-body text-text-secondary">{group.meta.question}</p>
      </div>

      {group.items.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-6 py-4 text-small text-text-secondary">
          Bu sual hələ cavabsızdır.
        </p>
      ) : (
        <div className="columns-1 gap-6 md:columns-2">
          {group.items.map((entry) => (
            <figure
              key={entry.id}
              className="mb-6 flex break-inside-avoid flex-col gap-3 rounded-card bg-ku-cream p-6 print:shadow-none"
            >
              <Quote className="h-5 w-5 shrink-0 text-text-primary/60" aria-hidden />

              <blockquote className="whitespace-pre-line break-words text-h3 font-semibold leading-snug text-text-primary">
                {entry.title}
              </blockquote>

              <p className="whitespace-pre-line break-words text-body text-text-primary">
                {entry.body}
              </p>

              <figcaption className="text-small text-text-primary/80">
                — {entry.author.firstName} {entry.author.lastName}
                {entry.programName ? `, ${entry.programName}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
