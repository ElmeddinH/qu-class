// ============================================================================
// src/app/(app)/class/[slug]/support/page.tsx
// Dəstək təklifləri səthi (spec §9).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır və `features/support`-a
// ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ Route icazəsi: `/class` prefiksi `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də
// artıq var — əlavə qeyd LAZIM DEYİL.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (üzvlük qapısı) → `force-dynamic`.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassSupport } from "@/features/support/ClassSupport";
import { requireUser } from "@/lib/auth";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface SupportPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SupportPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return {
    title: cohort ? `Dəstək təklifləri · ${cohort.displayName}` : "Dəstək təklifləri",
  };
}

export default async function SupportPage({ params }: SupportPageProps) {
  const viewer = await requireUser();
  const { slug } = await params;

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  return <ClassSupport cohort={cohort} />;
}
