// ============================================================================
// src/app/(app)/events/[id]/report/page.tsx
// Tədbirin yekun hesabatı — ÇAP üçün stillənmiş səhifə (spec §14).
//
// PDF generatoru YOXDUR (stack kilidlidir) — brauzerin «Çap → PDF olaraq
// saxla» funksiyası eyni nəticəni verir. Çap stilləri `print:` variantı ilə
// `features/events/manage/EventReport.tsx`-dədir.
//
// ⚠️ TƏLƏ T5: `dynamic = "force-dynamic"` — nəticə viewer-dən asılıdır.
// ============================================================================

import type { Metadata } from "next";

import { EventReport } from "@/features/events/manage/EventReport";
import { requireUser } from "@/lib/auth";
import { getEvent } from "@/services/event.service";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { id } = await params;
  const event = await getEvent(viewer, id);

  return { title: event ? `Hesabat · ${event.title}` : "Tədbir hesabatı" };
}

export default async function EventReportPage({ params }: ReportPageProps) {
  await requireUser();
  const { id } = await params;

  return <EventReport eventId={id} />;
}
