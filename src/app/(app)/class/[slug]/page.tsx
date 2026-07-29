// ============================================================================
// src/app/(app)/class/[slug]/page.tsx
// Class Page ana səhifəsi [M4] — spec §16 (14 blok) + PLAN.md §4.6 (mərhələ).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort başlığını çəkir və `ClassHome`-a
// ötürür. Widget-lərin hər biri öz məlumatını `services/`-dən özü çəkir və öz
// `<Suspense>` sərhədində gəlir — burada `prisma.*` YOXDUR.
//
// ⚠️ TƏLƏ T5: səhifə DB-dən oxuyur və nəticə viewer-dən asılıdır →
// `dynamic = "force-dynamic"`. Bunsuz Next build zamanı statik render etməyə
// çalışır və bir istifadəçinin sinif səhifəsi keşlənib başqasına verilə bilər.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassHome } from "@/features/class-home/ClassHome";
import { requireUser } from "@/lib/auth";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface ClassPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClassPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort?.displayName ?? "Sinif səhifəsi" };
}

export default async function ClassPage({ params }: ClassPageProps) {
  const viewer = await requireUser();
  const { slug } = await params;

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  return <ClassHome cohort={cohort} />;
}
