// ============================================================================
// src/app/(app)/events/[id]/page.tsx
// Tədbir detalı [M13] — spec §14.
//
// Səhifə NAZİKDİR (CLAUDE.md §8): tədbiri servisdən gətirir və
// `features/events`-ə ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ ROUTE PREFİKSİ: `/events` `src/lib/routes.ts` → `APP_ROUTE_PREFIXES`-ə
// əlavə olunub. DƏQİQ `/events` isə istisnadır (`PUBLIC_EXACT_PATHS`) —
// ictimai tədbir siyahısı `(public)/events`-də qalır və auth tələb etmir.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (görünürlük + öz RSVP-si) →
// `dynamic = "force-dynamic"`.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventDetail } from "@/features/events/EventDetail";
import { requireUser } from "@/lib/auth";
import { getEventDetail } from "@/services/event.service";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { id } = await params;
  const event = await getEventDetail(viewer, id);

  return { title: event ? event.title : "Tədbir" };
}

export default async function EventPage({ params }: EventPageProps) {
  const viewer = await requireUser();
  const { id } = await params;

  // "İndi" BİR DƏFƏ hesablanır: servis (rəy icazəsi) və UI (keçib/keçməyib)
  // eyni ana baxmalıdır.
  const now = new Date();

  // Görünmürsə 404 — "yoxdur" və "icazə yoxdur" ayırd edilmir (mövcudluğun
  // özü də məlumatdır).
  const event = await getEventDetail(viewer, id, now);
  if (!event) notFound();

  return <EventDetail event={event} now={now} isAuthenticated />;
}
