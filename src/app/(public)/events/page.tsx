// ============================================================================
// src/app/(public)/events/page.tsx
// /events — ictimai tədbir siyahısı.
//
// 🔴 BU SƏHİFƏ BLOK 9-DAN BƏRİ GÖZLƏNİLİRDİ: `lib/routes.ts` →
// `PUBLIC_EXACT_PATHS` DƏQİQ `/events` yolunu auth-dan azad etmişdi, amma
// səhifənin özü yox idi (naviqasiya müvəqqəti olaraq `/#events` anchor-una
// baxırdı). İstisnanı SİLMƏ — indi ona real səhifə gəldi.
//
// ⚠️ `/events/<id>` YENƏ DƏ QORUNUR: istisna yalnız DƏQİQ bərabərlikdir
// (`isPublicExactPath`), prefiks deyil. Tədbir detalında RSVP və iştirakçı
// siyahısı var.
//
// 🔴 ANONİM VIEWER — `getViewer()` ÇAĞIRILMIR (səbəb: `PublicEventList`
// başlığı). Giriş etmiş istifadəçi də burada yalnız `PUBLIC` tədbirləri görür.
//
// ⚠️ `force-dynamic` — siyahı DB-dən gəlir və `?when=` filtri hər sorğuda
// dəyişir.
// ============================================================================

import type { Metadata } from "next";

import { PublicEventList } from "@/features/events/PublicEventList";
import {
  parsePublicEventParams,
  upcomingFlagOf,
} from "@/lib/public-event-filters";
import { ANONYMOUS } from "@/lib/visibility";
import { countEvents, listEvents } from "@/services/event.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Açıq tədbirlər — QU CLASS",
  description:
    "Qarabağ Universitetinin ictimaiyyətə açıq tədbirləri: seminarlar, mərasimlər, karyera günləri.",
};

/** Bir səhifədə göstərilən tədbir sayı (üç sütunlu qrid). */
const PUBLIC_EVENT_LIMIT = 24;

interface EventsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  // 🔴 Anonim viewer — ictimai səhifə, məzmun ziyarətçidən asılı deyil.
  const viewer = ANONYMOUS;

  const filters = parsePublicEventParams(await searchParams);
  const eventFilters = { upcoming: upcomingFlagOf(filters), take: PUBLIC_EVENT_LIMIT };

  // "İndi" BİR DƏFƏ hesablanır: siyahı və say eyni ana baxmalıdır, yoxsa
  // sərhəddəki tədbir birində olub digərində olmaz.
  const now = new Date();

  const [events, total] = await Promise.all([
    listEvents(viewer, eventFilters, now),
    countEvents(viewer, { upcoming: eventFilters.upcoming }, now),
  ]);

  return <PublicEventList events={events} filters={filters} total={total} />;
}
