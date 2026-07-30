// ============================================================================
// src/app/(app)/class/[slug]/timeline/page.tsx
// Class Timeline [M8] — sinfin xronologiyası (spec §10).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, sistem milestone-larını
// sinxronlaşdırır, URL-i `parseTimelineParams` ilə oxuyur və
// `features/timeline`-a ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ `ensureCohortMilestones` MƏHZ BURADA — server komponentində çağırılır,
// `useEffect`-də yox: milestone-lar cohort tarixlərindən törəyən DB sətirləridir
// və brauzerdən yazıla bilməz. Funksiya idempotentdir (deterministik id +
// upsert), ona görə hər açılışda çağırmaq təhlükəsizdir.
//
// ⚠️ TƏLƏ T5: səhifə DB-dən oxuyur və nəticə viewer-dən asılıdır (görünürlük
// filtri) → `dynamic = "force-dynamic"`. Bunsuz Next build zamanı statik render
// etməyə çalışır və bir istifadəçinin xronologiyası başqasına verilə bilər.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassTimeline } from "@/features/timeline/ClassTimeline";
import { requireUser } from "@/lib/auth";
import { parseTimelineParams } from "@/lib/timeline-filters";
import { getCohortHeader } from "@/services/cohort.service";
import { ensureCohortMilestones } from "@/services/timeline.service";

export const dynamic = "force-dynamic";

interface TimelinePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: TimelinePageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Xronologiya · ${cohort.displayName}` : "Sinif xronologiyası" };
}

export default async function TimelinePage({ params, searchParams }: TimelinePageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  await ensureCohortMilestones(cohort.id);

  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır (URL əl ilə
  // dəyişdirilə bilər, bu, səhv deyil; lentdəki kateqoriya ilə eyni yanaşma).
  const filters = parseTimelineParams(rawParams);

  return <ClassTimeline cohort={cohort} filters={filters} />;
}
