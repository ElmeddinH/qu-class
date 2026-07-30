// ============================================================================
// src/components/kuds/SectionCard.tsx
// KUDS kart wrapper-i — T22-nin bağlanışı.
//
// 🔴 TƏLƏ T22. shadcn `CardTitle` `<div>` render edir (`ui/card.tsx:32`), yəni
// kartın başlığı sənədin başlıq iyerarxiyasına DÜŞMÜR: ekran oxuyucunun
// "başlıqlar üzrə gəz" siyahısı boş qalır və WCAG 1.3.1 (Info & Relationships)
// pozulur. `src/components/ui/` TOXUNULMAZDIR (CLAUDE.md §1), ona görə düzəliş
// wrapper səviyyəsindədir.
//
// `CardTitle` prop-larını `<div>`-ə SPREAD etdiyi üçün `role="heading"` +
// `aria-level` ona kənardan verilə bilir: DOM eyni qalır, stil eyni qalır,
// yalnız accessibility ağacında düyün `<h2>`/`<h3>` kimi görünür.
//
// ⚠️ Səviyyə ATLANMIR. Səhifədə `<h1>` var (adətən `AdminPageHeader` və ya
// səhifənin öz başlığı) → kartlar `level={2}` → kart içindəki alt başlıqlar
// `level={3}`. `level` prop-u məcburi deyil, defaultu 2-dir; `<h1>` olmayan
// nadir səhifədə (məs. `/home` boş vəziyyəti) açıq şəkildə `level={1}` verilir.
// ============================================================================

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** WCAG başlıq səviyyələri. `<h1>`–`<h6>` ilə eyni diapazon. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface CardHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sənəddəki başlıq səviyyəsi. Default 2 — kart adətən `<h1>`-in altındadır. */
  level?: HeadingLevel;
}

/**
 * `CardTitle`-ın başlıq semantikası olan variantı.
 *
 * Vizual olaraq `CardTitle` ilə EYNİDİR (eyni komponenti render edir, əlavə
 * sinif qoymur) — fərq yalnız accessibility ağacındadır.
 */
export function CardHeading({ level = 2, ...props }: CardHeadingProps) {
  return <CardTitle role="heading" aria-level={level} {...props} />;
}

interface SectionCardProps {
  /** Başlıq mətni (və ya ikon + mətn kimi tərkib). */
  title: React.ReactNode;
  /** Sənəddəki səviyyə — bax yuxarıdakı "səviyyə atlanmır" qeydi. */
  level?: HeadingLevel;
  /** `<section aria-labelledby>` bağlaması üçün başlığın `id`-si. */
  headingId?: string;
  /** KUDS §12: Title → Description → Content → Actions. */
  description?: React.ReactNode;
  /** Başlıq sətrinin sağındakı əməliyyat (düymə, keçid). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
}

/**
 * Təkrarlanan `Card > CardHeader > CardTitle > CardContent` qəlibi.
 *
 * KUDS §12 kart quruluşunu və `shadow-sm-kuds` kölgəsini bir yerdə saxlayır
 * (shadcn `Card` default `shadow` verir — KUDS §7-yə görə ağırdır).
 */
export function SectionCard({
  title,
  level = 2,
  headingId,
  description,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
  titleClassName,
}: SectionCardProps) {
  return (
    <Card className={cn("shadow-sm-kuds", className)}>
      <CardHeader
        className={cn(
          action ? "flex-row items-start justify-between gap-4 space-y-0" : undefined,
          headerClassName,
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <CardHeading level={level} id={headingId} className={titleClassName}>
            {title}
          </CardHeading>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>

      <CardContent className={cn("flex flex-col gap-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
