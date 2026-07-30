// ============================================================================
// src/app/(app)/class/[slug]/achievements/moderation/page.tsx
// Nailiyyət təsdiq növbəsi — SİNİF səviyyəsi (spec §17: "sinif moderatoru
// rəsmi nailiyyətləri təsdiqləyir").
//
// ⚠️ Universitet səviyyəli panel BAŞQADIR (`/admin/achievements`, Blok 11B) —
// bu səhifə yalnız BİR cohort-un növbəsidir.
//
// 🔴 İCAZƏ: `requireCohortRole(cohort.id, [CLASS_MODERATOR])` — rol yoxdursa
// 403 (`forbidden()` → `app/forbidden.tsx`). `UNIVERSITY_ADMIN` istisnadır
// (funksiyanın özündə). Adi üzv və sinif nümayəndəsi BURAXILMIR.
//
// İkinci qat servisdədir: `listModerationQueue` və hər qərar funksiyası
// `canModerateCohort` ilə icazəni YENİDƏN yoxlayır — səhifə qapısı tək qoruma
// deyil, çünki server action-lar birbaşa çağırıla bilər.
//
// ⚠️ TƏLƏ T5: force-dynamic.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ModerationQueue } from "@/features/achievements/ModerationQueue";
import { requireCohortRole, requireUser } from "@/lib/auth";
import { CohortRole } from "@/lib/enums";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface ModerationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ModerationPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Nailiyyət təsdiqi · ${slug}` };
}

export default async function AchievementModerationPage({ params }: ModerationPageProps) {
  const viewer = await requireUser();
  const { slug } = await params;

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  await requireCohortRole(cohort.id, [CohortRole.CLASS_MODERATOR]);

  return <ModerationQueue cohort={cohort} />;
}
