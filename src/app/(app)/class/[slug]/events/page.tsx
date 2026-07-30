// ============================================================================
// src/app/(app)/class/[slug]/events/page.tsx
// Sinif tədbirləri [M12] — spec §15 (6 filtr).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, URL-i `parseEventParams`
// ilə oxuyur və `features/events`-ə ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (görünürlük filtri + yaradıcı öz
// DRAFT tədbirini görür) → `dynamic = "force-dynamic"`. Bunsuz Next statik
// render edər və bir istifadəçinin siyahısı başqasına keşlənə bilər.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassEvents } from "@/features/events/ClassEvents";
import { requireUser } from "@/lib/auth";
import { parseEventParams } from "@/lib/event-filters";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface EventsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Tədbirlər · ${cohort.displayName}` : "Sinif tədbirləri" };
}

export default async function ClassEventsPage({ params, searchParams }: EventsPageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır (URL əl ilə
  // dəyişdirilə bilər, bu, səhv deyil; xronologiya ilə eyni yanaşma).
  const filters = parseEventParams(rawParams);

  return <ClassEvents cohort={cohort} filters={filters} />;
}
