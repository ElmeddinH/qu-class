// ============================================================================
// src/app/(app)/events/[id]/manage/page.tsx
// Event Coordinator paneli [M13] — spec §14.
//
// Səhifə NAZİKDİR (CLAUDE.md §8): URL-i `parseAttendeeParams` ilə oxuyur və
// `features/events/manage`-ə ötürür. `prisma.*` burada YOXDUR.
//
// 🔴 İCAZƏ: `EventManager` tədbiri `getEventDetail` ilə gətirir və
// `viewerCanManage` yoxlanır; servis isə hər əməliyyatda qapını TƏKRAR
// yoxlayır (`loadManageableEvent`). İki qat — server action səhifədən
// keçmədən çağırıla bilər.
//
// ⚠️ TƏLƏ T5: `dynamic = "force-dynamic"` — nəticə viewer-dən asılıdır.
// ============================================================================

import type { Metadata } from "next";

import { EventManager } from "@/features/events/manage/EventManager";
import { requireUser } from "@/lib/auth";
import { parseAttendeeParams } from "@/lib/event-filters";
import { getEvent } from "@/services/event.service";

export const dynamic = "force-dynamic";

interface ManagePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ManagePageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { id } = await params;
  const event = await getEvent(viewer, id);

  return { title: event ? `Koordinator paneli · ${event.title}` : "Koordinator paneli" };
}

export default async function EventManagePage({ params, searchParams }: ManagePageProps) {
  await requireUser();
  const [{ id }, rawParams] = await Promise.all([params, searchParams]);

  return <EventManager eventId={id} filters={parseAttendeeParams(rawParams)} />;
}
