// ============================================================================
// src/app/(app)/class/[slug]/achievements/page.tsx
// Class Achievements [M10] — sinfin nailiyyətləri (spec §12).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, URL-i
// `parseAchievementParams` ilə oxuyur və `features/achievements`-ə ötürür.
// `prisma.*` burada YOXDUR.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (sahib öz `SUBMITTED` nailiyyətini
// görür, başqası görmür) → `dynamic = "force-dynamic"`. Bunsuz Next statik
// render edər və bir istifadəçinin siyahısı başqasına keşlənə bilər.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassAchievements } from "@/features/achievements/ClassAchievements";
import { requireUser } from "@/lib/auth";
import { parseAchievementParams } from "@/lib/achievement-filters";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface AchievementsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: AchievementsPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Nailiyyətlər · ${cohort.displayName}` : "Sinif nailiyyətləri" };
}

export default async function AchievementsPage({
  params,
  searchParams,
}: AchievementsPageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  const filters = parseAchievementParams(rawParams);

  return <ClassAchievements cohort={cohort} filters={filters} />;
}
