// ============================================================================
// spec §16 blok 8 — Timeline-dan son hadisələr.
//
// `TimelineEntry` TÖRƏMƏDİR (Post / Achievement / Event-dən) və öz sahib sütunu
// yoxdur — servis `timelineVisibilityWhere()` işlədir. Bura yalnız oxuyur.
// ============================================================================

import { Flag, ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { postCategoryMeta } from "@/features/feed/catalog";
import { listTimeline } from "@/services/timeline.service";
import { shortDate } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function RecentTimeline({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const { items } = await listTimeline(viewer, {
    cohortId: cohort.id,
    take: WIDGET_ITEM_LIMIT,
  });

  return (
    <WidgetCard
      headingId={headingId}
      title="Xronologiyadan son hadisələr"
      icon="timeline"
      description="Sinfin yaddaşına düşən anlar."
      action={{ href: `/class/${cohort.slug}/timeline`, label: "Xronologiya" }}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Xronologiya hələ boşdur"
          description="Paylaşımda «Xronologiyada göstər» seçimini işarələyəndə hadisə buraya düşür."
          action={{ href: `/class/${cohort.slug}/feed`, label: "Paylaşım yarat" }}
        />
      ) : (
        // Sol kənarda davamlı xətt — hadisələr onun üzərində nöqtə kimi düzülür.
        <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "relative flex flex-col gap-1",
                // Sistem milestone-u vizual olaraq FƏRQLİDİR — üslub Timeline
                // səhifəsi (`TimelineEntryItem`) ilə eynidir: sahibi və mənbəyi
                // olmayan qeyd adi paylaşımla qarışdırılmamalıdır.
                item.isSystemMilestone && "rounded-card bg-ku-cream/40 p-3",
              )}
            >
              {item.isSystemMilestone ? (
                <span
                  className="absolute -left-[27px] top-3 flex h-4 w-4 items-center justify-center rounded-avatar bg-ku-cream"
                  aria-hidden
                >
                  <Flag className="h-2.5 w-2.5 text-ku-dark" />
                </span>
              ) : (
                <span
                  className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-avatar bg-ku-green"
                  aria-hidden
                />
              )}

              <span className="text-caption text-text-secondary">
                {shortDate(item.occurredAt)} · {item.academicYear}
              </span>

              <span className="text-small font-medium text-text-primary">
                {item.title}
              </span>

              {item.summary ? (
                <p className="line-clamp-2 text-caption text-text-secondary">
                  {item.summary}
                </p>
              ) : null}

              {item.isSystemMilestone ? (
                <Badge className="w-fit bg-ku-cream text-caption font-normal text-text-primary hover:bg-ku-cream">
                  Sinif tarixçəsi
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit text-caption font-normal">
                  {postCategoryMeta(item.category).label}
                </Badge>
              )}
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}
