// ============================================================================
// src/app/(app)/class/[slug]/memories/page.tsx
// Share Memories [M9] — sinfin xatirələri (spec §11).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, URL-i `parseMemoryParams`
// ilə oxuyur və `features/memories`-ə ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ Route icazəsi: `/class` prefiksi `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də
// artıq var, yəni bu alt-səhifə üçün əlavə qeyd LAZIM DEYİL.
//
// ⚠️ TƏLƏ T5: səhifə DB-dən oxuyur və nəticə viewer-dən asılıdır (görünürlük
// filtri) → `dynamic = "force-dynamic"`.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassMemories } from "@/features/memories/ClassMemories";
import { requireUser } from "@/lib/auth";
import { parseMemoryParams } from "@/lib/memory-filters";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface MemoriesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: MemoriesPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Xatirələr · ${cohort.displayName}` : "Sinif xatirələri" };
}

export default async function MemoriesPage({ params, searchParams }: MemoriesPageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır.
  const filters = parseMemoryParams(rawParams);

  return <ClassMemories cohort={cohort} filters={filters} />;
}
