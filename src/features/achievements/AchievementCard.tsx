// ============================================================================
// src/features/achievements/AchievementCard.tsx
// Nailiyyət kartı — qrid və vurğu (featured) variantı.
//
// SERVER komponentidir: ikon birbaşa işlədilir, sərhəd keçilmir (CLAUDE.md §12).
//
// KUDS §12 kart quruluşu: Title → Description → Content → Actions.
//
// ⚠️ STATUS ROZETİ SAHİB ÜÇÜNDÜR. Adi siyahıda başqasının `SUBMITTED`
// nailiyyəti onsuz da görünmür (`visibleWithStatus` status filtrini yalnız
// sahibə tətbiq etmir), yəni "Təsdiq gözləyir" rozetini praktikada yalnız
// nailiyyətin sahibi görür.
// ============================================================================

import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { AchievementStatus } from "@/lib/enums";
import { achievementStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { achievementCategoryMeta, FEED_ICONS } from "@/features/feed/catalog";
import type { AchievementItem } from "@/services/achievement.service";
import { shortDate } from "@/utils/date";

interface AchievementCardProps {
  achievement: AchievementItem;
  /** `true` — səhifənin başındakı vurğu qridi (daha böyük kart). */
  featured?: boolean;
}

/** Statusa görə rozet: yalnız `VERIFIED` rozetsiz göstərilir (adi haldır). */
function StatusBadge({ status }: { status: string }) {
  if (status === AchievementStatus.VERIFIED) return null;

  const isFeatured = status === AchievementStatus.FEATURED;

  return (
    <Badge
      className={cn(
        "text-caption font-normal",
        isFeatured
          ? "bg-ku-cream text-text-primary hover:bg-ku-cream"
          : "bg-ku-blue text-text-primary hover:bg-ku-blue",
      )}
    >
      {achievementStatusLabel(status)}
    </Badge>
  );
}

export function AchievementCard({ achievement, featured = false }: AchievementCardProps) {
  const meta = achievementCategoryMeta(achievement.category);
  const Icon = FEED_ICONS[meta.icon];

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 rounded-card border p-6 shadow-sm-kuds",
        featured ? "border-ku-green bg-ku-cream/30" : "border-border bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-avatar",
            featured ? "h-12 w-12 bg-ku-cream" : "h-10 w-10 bg-ku-soft",
          )}
          aria-hidden
        >
          <Icon className={cn("text-ku-dark", featured ? "h-6 w-6" : "h-5 w-5")} />
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <StatusBadge status={achievement.status} />
          <VisibilityBadge level={achievement.visibility} showLabel={false} />
        </div>
      </div>

      <h3
        className={cn(
          "font-semibold text-text-primary",
          featured ? "text-h3" : "text-h4 font-medium",
        )}
      >
        {achievement.title}
      </h3>

      {achievement.description ? (
        <p className="line-clamp-3 text-small text-text-secondary">
          {achievement.description}
        </p>
      ) : null}

      <div className="flex flex-col gap-1 text-caption text-text-secondary">
        {achievement.organization ? <span>{achievement.organization}</span> : null}
        <span>{shortDate(achievement.awardedAt)}</span>
        <Badge variant="outline" className="w-fit text-caption font-normal">
          {meta.label}
        </Badge>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
        <MemberIdentity
          id={achievement.owner.id}
          firstName={achievement.owner.firstName}
          lastName={achievement.owner.lastName}
          avatarUrl={achievement.owner.avatarUrl}
        />

        {achievement.proofUrl ? (
          <a
            href={achievement.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-ku-green hover:underline"
          >
            Təsdiq sənədinə bax
          </a>
        ) : null}
      </div>
    </article>
  );
}
