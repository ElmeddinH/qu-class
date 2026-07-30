// ============================================================================
// src/app/(app)/class/[slug]/yearbook/page.tsx
// Digital Yearbook — sinfin rəqəmsal albomu (spec §11).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır və `features/yearbook`-a
// ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ Route icazəsi: `/class` prefiksi `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də
// artıq var — əlavə qeyd LAZIM DEYİL.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (görünürlük filtri) →
// `dynamic = "force-dynamic"`. Albom keşlənsəydi bir sinfin `CLASS` xatirələri
// başqasına verilə bilərdi.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassYearbook } from "@/features/yearbook/ClassYearbook";
import { requireUser } from "@/lib/auth";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface YearbookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: YearbookPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Albom · ${cohort.displayName}` : "Rəqəmsal albom" };
}

export default async function YearbookPage({ params }: YearbookPageProps) {
  const viewer = await requireUser();
  const { slug } = await params;

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  return <ClassYearbook cohort={cohort} />;
}
