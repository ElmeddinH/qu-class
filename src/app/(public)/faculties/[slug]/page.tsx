// ============================================================================
// src/app/(public)/faculties/[slug]/page.tsx
// /faculties/[slug] — fakültə səhifəsi [M2].
//
// ⚠️ Tapılmayan slug → `notFound()` (404), yönləndirmə YOX. Fakültə kataloqu
// ictimaidir, yəni burada "mövcudluğu gizlətmək" məsələsi yoxdur —
// `lib/api/cohort-scope.ts`-dəki 404/403 qaydası SİNİF məzmununa aiddir.
//
// ⚠️ `/faculties` prefiksi `lib/routes.ts` → `PUBLIC_DYNAMIC_PARENTS`-dədir:
// qorunan prefikslərlə kəsişmədiyi `routes.test.ts`-də maşınla yoxlanılır.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FacultyPage } from "@/features/faculties/FacultyPage";
import { getFacultyDetail } from "@/services/academic.service";

export const dynamic = "force-dynamic";

interface FacultyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FacultyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const faculty = await getFacultyDetail(slug);

  if (!faculty) return { title: "Fakültə tapılmadı — QU CLASS" };

  return {
    title: `${faculty.name} — QU CLASS`,
    description:
      faculty.description ??
      `${faculty.name} fakültəsinin ixtisasları və açılmış sinif səhifələri.`,
  };
}

export default async function Page({ params }: FacultyPageProps) {
  const { slug } = await params;
  const faculty = await getFacultyDetail(slug);

  if (!faculty) notFound();

  return <FacultyPage faculty={faculty} />;
}
