// ============================================================================
// src/features/welcome/ContentPageCards.tsx
// Redaksiya səhifələrinin kart qridi — «Universitet haqqında» və «Kampus
// həyatı» bölmələri EYNİ komponenti işlədir (dublikat yoxdur).
//
// ⚠️ KUDS §12 kart quruluşu: Title → Description → Content → Actions.
// Fon ağ, radius 12, border 1px, shadow SM, padding 24.
//
// ⚠️ Şəkil `next/image`-dir və `alt` MƏCBURİDİR. `alt` səhifənin başlığından
// TÖRƏYİR (dekorativ deyil — şəkil məzmunu təmsil edir).
//
// ⚠️ `sizes` verilmədən `fill` şəkil bütün ekran genişliyində yüklənərdi;
// qrid 1→2→3 sütun olduğu üçün breakpoint-lər açıq yazılır.
//
// ⚠️ Kartın öz keçidi YOXDUR: `/about`, `/campus-life` kimi detal səhifələri
// BLOK 11-in işidir. Link qoysaydıq 404 verərdi (bax `layouts/nav.ts`
// başlığındaki qeyd). Kart hazırda MƏTN xülasəsidir.
// ============================================================================

import Image from "next/image";

import { EmptyState } from "@/components/shared/EmptyState";
import { FileText } from "lucide-react";
import type { ContentPageCard } from "@/services/content.service";

interface ContentPageCardsProps {
  pages: ContentPageCard[];
  /** Boş halda göstərilən mətn — bölmədən bölməyə fərqlidir. */
  emptyDescription: string;
}

export function ContentPageCards({ pages, emptyDescription }: ContentPageCardsProps) {
  if (pages.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Məzmun hazırlanır"
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map((page) => (
        <li
          key={page.id}
          className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds"
        >
          {page.coverUrl ? (
            <div className="relative aspect-[12/5] w-full bg-muted">
              <Image
                src={page.coverUrl}
                alt={page.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-2 p-6">
            <h3 className="text-h4 font-medium text-text-primary">{page.title}</h3>
            {page.excerpt ? (
              <p className="text-small text-text-secondary">{page.excerpt}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
