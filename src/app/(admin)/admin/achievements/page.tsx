import type { Metadata } from "next";

import { UniversityAchievementQueue } from "@/features/admin/UniversityAchievementQueue";

export const metadata: Metadata = {
  title: "Nailiyyət təsdiqi",
};

export const dynamic = "force-dynamic";

/**
 * `/admin/achievements` — UNİVERSİTET səviyyəli təsdiq növbəsi.
 *
 * ⚠️ Blok 8-in sinif növbəsi (`/class/[slug]/achievements/moderation`)
 * QALIR: onun qapısı `CLASS_MODERATOR`-dur. Bu səhifə AYRI servis
 * funksiyasından (`listUniversityModerationQueue`) oxuyur.
 */
export default async function AdminAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.cohort;
  const cohortId = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  return <UniversityAchievementQueue cohortId={cohortId || undefined} />;
}
