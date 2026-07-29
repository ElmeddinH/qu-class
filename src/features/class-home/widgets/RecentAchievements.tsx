// ============================================================================
// spec §16 blok 7 — Son nailiyyətlər.
//
// ⚠️ `listAchievements` içəridə `visibleWithStatus(viewer, [VERIFIED, FEATURED])`
// işlədir — `activeVisibleWhere` DEYİL. `Achievement`-də `ACTIVE` statusu yoxdur
// və səhv köməkçi sıfır nəticə verərdi (CLAUDE.md məxfilik bölməsi).
// ============================================================================

import Link from "next/link";
import { Trophy } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { AchievementStatus } from "@/lib/enums";
import { achievementCategoryMeta, FEED_ICONS } from "@/features/feed/catalog";
import { listAchievements } from "@/services/achievement.service";
import { shortDate } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function RecentAchievements({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const achievements = await listAchievements(viewer, {
    cohortId: cohort.id,
    take: WIDGET_ITEM_LIMIT,
  });

  return (
    <WidgetCard
      headingId={headingId}
      title="Son nailiyyətlər"
      icon="trophy"
      description="Təsdiqlənmiş sinif nailiyyətləri."
      action={{ href: `/class/${cohort.slug}/achievements`, label: "Hamısı" }}
    >
      {achievements.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Hələ təsdiqlənmiş nailiyyət yoxdur"
          description="Nailiyyət paylaşımda «Nailiyyətlərdə göstər» seçimi ilə göndərilir və moderator təsdiqindən sonra burada görünür."
          action={{ href: `/class/${cohort.slug}/feed`, label: "Nailiyyət göndər" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {achievements.map((achievement) => {
            const meta = achievementCategoryMeta(achievement.category);
            const Icon = FEED_ICONS[meta.icon];

            return (
              <li key={achievement.id} className="flex gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-avatar bg-ku-cream"
                  aria-hidden
                >
                  <Icon className="h-4 w-4 text-ku-dark" />
                </span>

                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-small font-medium text-text-primary">
                    {achievement.title}
                  </span>

                  <span className="truncate text-caption text-text-secondary">
                    <Link
                      href={`/u/${achievement.owner.id}`}
                      className="hover:text-ku-green hover:underline"
                    >
                      {achievement.owner.firstName} {achievement.owner.lastName}
                    </Link>
                    {" · "}
                    {shortDate(achievement.awardedAt)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-caption font-normal">
                      {meta.label}
                    </Badge>
                    {achievement.status === AchievementStatus.FEATURED ? (
                      <Badge className="bg-ku-cream text-caption font-normal text-text-primary hover:bg-ku-cream">
                        Seçilmiş
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
