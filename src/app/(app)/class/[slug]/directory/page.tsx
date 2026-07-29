// ============================================================================
// src/app/(app)/class/[slug]/directory/page.tsx
// Class Directory [M6] — 13 filtr, paylaşıla bilən link (spec §8).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, URL-i
// `parseDirectoryParams` ilə oxuyur və `features/directory`-yə ötürür.
// `prisma.*` burada YOXDUR.
//
// ⚠️ TƏLƏ T5: səhifə DB-dən oxuyur və nəticə viewer-dən asılıdır (kataloq
// yalnız öz sinfini göstərir, sahələr `redactProfile`-dan keçir) →
// `dynamic = "force-dynamic"`. Bunsuz Next build zamanı statik render etməyə
// çalışır və bir istifadəçinin kataloqu keşlənib başqasına verilə bilər.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassDirectory } from "@/features/directory/ClassDirectory";
import { requireUser } from "@/lib/auth";
import { parseDirectoryParams } from "@/lib/directory-filters";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface DirectoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: DirectoryPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Kataloq · ${cohort.displayName}` : "Sinif kataloqu" };
}

export default async function DirectoryPage({ params, searchParams }: DirectoryPageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır (URL əl ilə
  // dəyişdirilə bilər, bu, səhv deyil; lentdəki kateqoriya ilə eyni yanaşma).
  const filters = parseDirectoryParams(rawParams);

  return <ClassDirectory cohort={cohort} filters={filters} />;
}
