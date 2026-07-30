// ============================================================================
// src/features/achievements/ModerationQueue.tsx
// Nailiyyət təsdiq növbəsi — SİNİF MODERATORU üçün (spec §17).
//
// 🔴 Bu ekran `listAchievements` İLƏ QURULA BİLMƏZ (TƏLƏ A). Həmin funksiya
// status filtrini yalnız sahibə tətbiq etmir, yəni moderator BAŞQASININ
// `SUBMITTED` nailiyyətini orada GÖRMÜR — və görməməlidir, çünki o, adi oxu
// yoludur. Növbə ayrı funksiyadan gəlir: `listModerationQueue`, girişində
// rol qapısı var və görünürlük filtri yoxdur (moderasiya ayrı axındır).
//
// Səhifə (`…/achievements/moderation/page.tsx`) əvvəlcə
// `requireCohortRole(cohortId, [CLASS_MODERATOR])` ilə 403 sərhədini qurur —
// bu komponent artıq icazəli kontekstdə render olunur.
// ============================================================================

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { achievementCategoryMeta } from "@/features/feed/catalog";
import { listModerationQueue } from "@/services/achievement.service";
import type { CohortHeader } from "@/services/cohort.service";
import { shortDate } from "@/utils/date";

import { ModerationActions } from "./ModerationActions";

interface ModerationQueueProps {
  cohort: CohortHeader;
}

export async function ModerationQueue({ cohort }: ModerationQueueProps) {
  const viewer = await getViewer();
  const items = await listModerationQueue(viewer, cohort.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Nailiyyət təsdiqi</h1>
          <p className="text-body text-text-secondary">
            {cohort.displayName} · təsdiq gözləyən {items.length} nailiyyət. Hər qərar
            audit jurnalına yazılır və sahibinə bildiriş göndərilir.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/class/${cohort.slug}/achievements`}>Nailiyyətlərə qayıt</Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Növbə boşdur"
          description="Təsdiq gözləyən nailiyyət yoxdur. Yeni nailiyyət göndəriləndə burada görünəcək."
          action={{ href: `/class/${cohort.slug}/achievements`, label: "Nailiyyətlər" }}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const meta = achievementCategoryMeta(item.category);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <h2 className="text-h4 font-medium text-text-primary">{item.title}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-caption font-normal">
                        {meta.label}
                      </Badge>
                      <VisibilityBadge level={item.visibility} />
                      <span className="text-caption text-text-secondary">
                        {shortDate(item.awardedAt)}
                      </span>
                    </div>
                  </div>

                  <MemberIdentity
                    id={item.owner.id}
                    firstName={item.owner.firstName}
                    lastName={item.owner.lastName}
                    avatarUrl={item.owner.avatarUrl}
                    subtitle={item.organization}
                  />
                </div>

                {item.description ? (
                  <p className="text-small text-text-secondary">{item.description}</p>
                ) : null}

                {item.proofUrl ? (
                  <a
                    href={item.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-caption text-ku-green hover:underline"
                  >
                    Təsdiq sənədinə bax
                  </a>
                ) : null}

                <ModerationActions
                  achievementId={item.id}
                  cohortSlug={cohort.slug}
                  title={item.title}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
