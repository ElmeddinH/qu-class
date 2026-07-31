// ============================================================================
// src/features/timeline/TimelineEntryItem.tsx
// Xronologiyanın bir qeydi — şaquli xəttin üzərində nöqtə + kart.
//
// SERVER komponentidir: ikon birbaşa komponent kimi işlədilir (server → client
// sərhədi keçilmir, CLAUDE.md §12 pozulmur).
//
// ⚠️ SİSTEM MİLESTONE-U VİZUAL OLARAQ FƏRQLİDİR (ku-cream fon + bayraq ikonu).
// Səbəb yalnız estetik deyil: milestone-un sahibi və mənbəyi YOXDUR, ona görə
// "kim paylaşdı?" sualının cavabı da yoxdur — istifadəçi onu adi paylaşımla
// qarışdırmamalıdır.
//
// ⚠️ MƏNBƏYƏ KEÇİD `sourceType`-a görə deyil, MÖVCUD `*Id` sütununa görə
// qurulur: silinmiş postun qeydi `deletePost` ilə onsuz da silinir, amma
// arxivlənmiş nailiyyət halında sətir bir müddət mənbəsiz qala bilər — belə
// qeyd sadəcə keçidsiz göstərilir, "səhifə tapılmadı" verən link yox.
// ============================================================================

import Link from "next/link";
import { Flag } from "lucide-react";

import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timelineSourceLabel } from "@/lib/labels";
import { FEED_ICONS, postCategoryMeta } from "@/features/feed/catalog";
import type { TimelineItem } from "@/services/timeline.service";
import { shortDate } from "@/utils/date";

interface TimelineEntryItemProps {
  item: TimelineItem;
  cohortSlug: string;
}

/** Qeydin mənbəyinə keçid — mənbə yoxdursa `null` (keçidsiz göstərilir). */
function sourceHref(item: TimelineItem, cohortSlug: string): string | null {
  if (item.postId) return `/class/${cohortSlug}/feed`;
  if (item.achievementId) return `/class/${cohortSlug}/achievements`;
  if (item.eventId) return `/events/${item.eventId}`;
  return null;
}

export function TimelineEntryItem({ item, cohortSlug }: TimelineEntryItemProps) {
  const meta = postCategoryMeta(item.category);
  const Icon = item.isSystemMilestone ? Flag : FEED_ICONS[meta.icon];
  const href = sourceHref(item, cohortSlug);

  /**
   * 🔴 KUDS kontrast qaydası (CLAUDE.md): `ku-cream` fonunda YALNIZ
   * `text-text-primary`. Milestone kartının fonu `ku-cream/40`-dır (ağın
   * üzərində ≈ #F9FAE5) və orada `text-text-secondary` (#64748B) **4.49:1**
   * verir — WCAG AA-nın 4.5:1 həddindən bir qırıntı AŞAĞI. axe bunu
   * `color-contrast` (serious) kimi bildirir. Adi kartda (ağ fon) eyni rəng
   * 4.76:1-dir və qalır — ona görə ton ŞƏRTLİDİR, qlobal deyil.
   */
  const mutedTone = item.isSystemMilestone
    ? "text-text-primary"
    : "text-text-secondary";

  return (
    <li className="relative pl-12">
      {/* Xəttin üzərindəki nöqtə — milestone daha iri və accent rəngdədir. */}
      <span
        className={cn(
          "absolute left-0 top-4 flex h-8 w-8 items-center justify-center rounded-avatar border border-border",
          item.isSystemMilestone ? "bg-ku-cream" : "bg-ku-soft",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4 text-ku-dark" />
      </span>

      <article
        className={cn(
          "flex flex-col gap-2 rounded-card border border-border p-4 shadow-xs-kuds",
          item.isSystemMilestone ? "bg-ku-cream/40" : "bg-surface",
        )}
      >
        <div className={cn("flex flex-wrap items-center gap-2 text-caption", mutedTone)}>
          <time dateTime={item.occurredAt.toISOString()}>{shortDate(item.occurredAt)}</time>
          <span aria-hidden>·</span>
          <span>{item.academicYear}</span>
        </div>

        <h3 className="text-h4 font-medium text-text-primary">{item.title}</h3>

        {item.summary ? (
          <p className={cn("line-clamp-3 text-small", mutedTone)}>{item.summary}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {item.isSystemMilestone ? (
            <Badge className="bg-ku-cream text-caption font-normal text-text-primary hover:bg-ku-cream">
              Sinif tarixçəsi
            </Badge>
          ) : (
            <Badge variant="outline" className="text-caption font-normal">
              {meta.label}
            </Badge>
          )}

          <Badge variant="outline" className="text-caption font-normal">
            {timelineSourceLabel(item.sourceType)}
          </Badge>

          <VisibilityBadge level={item.visibility} />

          {href ? (
            <Link
              href={href}
              className="text-caption text-ku-green hover:underline"
              aria-label={`«${item.title}» — mənbəyə keçid`}
            >
              Mənbəyə bax
            </Link>
          ) : null}
        </div>
      </article>
    </li>
  );
}
