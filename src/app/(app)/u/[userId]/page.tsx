import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/features/profile/PreviewBanner";
import { ProfileStory } from "@/features/profile/ProfileStory";
import { buildPreviewViewer, parsePreviewMode, PREVIEW_PARAM } from "@/features/profile/preview";
import { requireUser } from "@/lib/auth";
import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";
import { getFieldVisibility, getProfile } from "@/services/user.service";

/**
 * `/u/[userId]` — My Class Story [M7].
 *
 * Səhifə nazikdir (CLAUDE.md §8): viewer-i qurur, "Preview as" rejimini oxuyur
 * və `features/profile`-a ötürür. Bütün gizlətmə qərarları `getProfile()` →
 * `redactProfile()` içindədir.
 */

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { userId } = await params;
  const result = await getProfile(viewer, userId);

  return {
    title: result
      ? `${result.profile.firstName} ${result.profile.lastName}`
      : "Profil",
  };
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const viewer = await requireUser();
  const { userId } = await params;
  const query = await searchParams;

  const isSelf = viewer.userId === userId;

  // ⚠️ "Preview as" YALNIZ öz profilində. Başqasının profilində icazə versək
  // istifadəçi məhz ondan gizlədilmiş sahələri "sinif gözü ilə" görərdi.
  const previewMode = isSelf ? parsePreviewMode(query[PREVIEW_PARAM]) : null;

  // Sintetik viewer eyni `getProfile()`-ə ötürülür — ayrıca "preview" məntiqi
  // yoxdur, ekranda görünən şey əsl məxfilik yolundan keçir.
  const effectiveViewer = previewMode
    ? buildPreviewViewer(previewMode, viewer.cohortIds)
    : viewer;

  const result = await getProfile(effectiveViewer, userId);
  if (!result) notFound();

  // Sahə səviyyələri yalnız sahibə və yalnız preview SÖNÜLÜ olanda göstərilir —
  // nümayiş rejimində badge-lər "kənar adam bunu görür" illüziyası yaradardı.
  const levels = isSelf && !previewMode ? await getFieldVisibility(viewer) : null;

  const hiddenFieldCount = CONTROLLED_PROFILE_FIELDS.filter(
    (field) => !(field in result.profile),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {isSelf ? (
        <PreviewBanner
          userId={userId}
          mode={previewMode}
          hiddenFieldCount={hiddenFieldCount}
        />
      ) : null}

      <ProfileStory result={result} levels={levels} />

      {isSelf && !previewMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
          <p className="flex-1 text-small text-text-secondary">
            Bu səhifədə {CONTROLLED_PROFILE_FIELDS.length} sahənin görünürlüyünü
            ayrıca idarə edə bilərsiniz.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/me/privacy">Məxfilik tənzimləmələri</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
