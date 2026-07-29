// ============================================================================
// spec §16 blok 10 — Son xatirələr.
//
// ⚠️ `Memory`-nin görünürlük SƏVİYYƏSİ (kim görə bilər) və GÖSTƏRİLMƏ
// seçimləri (harada görünür) fərqli şeylərdir. Burada `surface: "feed"`
// verilir — yalnız müəllifin lentdə göstərilməsinə razı olduğu xatirələr.
// ============================================================================

import Link from "next/link";
import { Heart } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { FEED_ICONS, memoryTypeMeta } from "@/features/feed/catalog";
import { listMemories } from "@/services/memory.service";
import { shortDate } from "@/utils/date";

import { WidgetCard } from "../WidgetCard";
import { WIDGET_ITEM_LIMIT, type ClassHomeWidgetProps } from "../types";

export async function RecentMemories({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const memories = await listMemories(viewer, {
    cohortId: cohort.id,
    surface: "feed",
    take: WIDGET_ITEM_LIMIT,
  });

  return (
    <WidgetCard
      headingId={headingId}
      title="Son xatirələr"
      icon="heart"
      description="Sinif yoldaşlarının yazdıqları."
      action={{ href: `/class/${cohort.slug}/memories`, label: "Hamısı" }}
    >
      {memories.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Hələ xatirə paylaşılmayıb"
          description="Yaddaqalan bir an, unudulmaz dərs və ya müəllimə təşəkkür — hamısı xatirə ola bilər."
          action={{ href: `/class/${cohort.slug}/memories`, label: "Xatirə yaz" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {memories.map((memory) => {
            const meta = memoryTypeMeta(memory.type);
            const Icon = FEED_ICONS[meta.icon];

            return (
              <li
                key={memory.id}
                className="flex flex-col gap-2 rounded-card border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1 bg-ku-blue text-caption font-normal text-text-primary hover:bg-ku-blue">
                    <Icon className="h-3 w-3" aria-hidden />
                    {meta.label}
                  </Badge>
                  <span className="text-caption text-text-secondary">
                    {shortDate(memory.occurredAt)}
                  </span>
                </div>

                <span className="text-small font-medium text-text-primary">
                  {memory.title}
                </span>

                <p className="line-clamp-2 text-caption text-text-secondary">
                  {memory.body}
                </p>

                <span className="text-caption text-text-secondary">
                  <Link
                    href={`/u/${memory.author.id}`}
                    className="hover:text-ku-green hover:underline"
                  >
                    {memory.author.firstName} {memory.author.lastName}
                  </Link>
                  {memory.dedicatedTo ? ` → ${memory.dedicatedTo}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
