// ============================================================================
// src/features/events/PublicEventList.tsx
// `/events` — ictimai tədbir siyahısı (spec §2, 8-ci bənd; spec §15).
//
// 🔴 ANONİM VIEWER İLƏ OXUNUR — hətta giriş etmiş istifadəçi üçün də.
// `listEvents(ANONYMOUS, …)` → `visibleWithStatus` yalnız `visibility = PUBLIC`
// və `PUBLISHED | COMPLETED` seçir. Səbəb açılış səhifəsi ilə eynidir: ictimai
// səhifənin məzmunu ziyarətçidən ziyarətçiyə DƏYİŞMƏMƏLİDİR — sinif tədbirləri
// `/class/[slug]/events`-dədir. Bu, "girişdən sonra ictimai siyahıda sinif
// tədbiri göründü" sızmasını struktur olaraq bağlayır.
//
// ⚠️ Səhifədə ƏLAVƏ FİLTR YOXDUR — mühərrik hazırdır, düzgün viewer ötürülür
// (CLAUDE.md §5: ikinci məxfilik məntiqi qadağandır).
//
// ⚠️ Vaxt filtri URL-dədir (`?when=past`) və defolt `upcoming`-dir. Kanonik
// ünvan `/events`-dir: defolt dəyər URL-ə yazılmır (`lib/public-event-filters`).
// ============================================================================

import Link from "next/link";
import { CalendarDays, History } from "lucide-react";

import { PublicEventCards } from "@/components/shared/PublicEventCards";
import { PageHeader } from "@/features/content/PageHeader";
import {
  publicEventsHref,
  type PublicEventFilterState,
} from "@/lib/public-event-filters";
import { FILTER_CHIP_BASE, filterChipTone } from "@/components/shared/filter-chip";
import { cn } from "@/lib/utils";
import type { EventItem } from "@/services/event.service";

interface PublicEventListProps {
  events: EventItem[];
  filters: PublicEventFilterState;
  total: number;
}

export function PublicEventList({ events, filters, total }: PublicEventListProps) {
  const upcoming = filters.when === "upcoming";

  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Tədbirlər"
        title="Açıq tədbirlər"
        description="Universitet, fakültə və klub səviyyəsində ictimaiyyətə açıq tədbirlər. Sinif tədbirlərini görmək üçün daxil olun."
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/events", label: "Tədbirlər" },
        ]}
      />

      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
        <nav aria-label="Tarix filtri" className="flex flex-wrap gap-2">
          <TimeChip
            href={publicEventsHref({ when: "upcoming" })}
            label="Qarşıdan gələn"
            icon={CalendarDays}
            active={upcoming}
          />
          <TimeChip
            href={publicEventsHref({ when: "past" })}
            label="Keçmiş tədbirlər"
            icon={History}
            active={!upcoming}
          />
        </nav>

        <p className="text-small text-text-secondary" role="status">
          {upcoming
            ? `${total} qarşıdan gələn açıq tədbir`
            : `${total} keçmiş açıq tədbir`}
        </p>
      </div>

      {/* T22 / WCAG 1.3.1: kart başlıqları `<h3>`-dür, ona görə siyahının
          üstündə `<h2>` MƏCBURİDİR — yoxsa `PageHeader`-in `<h1>`-indən sonra
          səviyyə atlanır (h1 → h3). Açılış səhifəsində eyni kartlar onsuz da
          bölmə `<h2>`-sinin altındadır. */}
      <section aria-labelledby="public-events-list" className="flex flex-col gap-4">
        <h2
          id="public-events-list"
          className="text-h2 font-semibold text-text-primary"
        >
          {upcoming ? "Qarşıdan gələn tədbirlər" : "Keçmiş tədbirlər"}
        </h2>

        <PublicEventCards
          events={events}
          // ⚠️ Detal səhifəsi AUTH ARXASINDADIR (`(app)/events/[id]`) — anonim
          // ziyarətçi `/login?callbackUrl=/events/<id>`-ə düşür və girişdən sonra
          // MƏHZ həmin tədbirə qayıdır. Bu, qərardır: detalda RSVP və iştirakçı
          // siyahısı var (`routes.ts` → `PUBLIC_EXACT_PATHS` şərhi).
          hrefFor={(event) => `/events/${event.id}`}
          emptyTitle={upcoming ? "Açıq tədbir yoxdur" : "Keçmiş açıq tədbir yoxdur"}
          emptyDescription={
            upcoming
              ? "Hazırda ictimaiyyətə açıq qarşıdan gələn tədbir elan olunmayıb. Sinif, fakültə və universitet tədbirlərini görmək üçün daxil olun."
              : "Arxivdə ictimaiyyətə açıq tədbir qeydi yoxdur."
          }
        />
      </section>

      <p className="text-small text-text-secondary">
        Tədbirin təfərrüatını görmək və qeydiyyatdan keçmək üçün{" "}
        <Link href="/login" className="text-ku-green hover:underline">
          daxil ol
        </Link>
        . Sinif tədbirləri yalnız həmin sinfin üzvlərinə göstərilir.
      </p>
    </div>
  );
}

function TimeChip({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center gap-2",
        FILTER_CHIP_BASE,
        filterChipTone(active),
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
