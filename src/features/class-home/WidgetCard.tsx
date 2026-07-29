// ============================================================================
// src/features/class-home/WidgetCard.tsx
// Class Page widget-lərinin ORTAQ çərçivəsi + yüklənmə skeleti.
//
// KUDS §12 kart quruluşu: Title → Description → Content → Actions.
// Fon ağ, radius 12 (`rounded-xl` = 12px), border 1px, kölgə SM, padding 24.
// shadcn `Card` default `shadow` verir — KUDS §7-ə görə `shadow-sm-kuds` ilə
// əvəz olunur (ui/ faylına toxunmadan, wrapper səviyyəsində).
//
// ⚠️ TƏLƏ: shadcn `CardTitle` <div> render edir, başlıq SEMANTİKASI yoxdur.
// Widget başlığı burada əl ilə `<h2>` verilir və `id` ilə `<section>`-a
// bağlanır — ekran oxuyucu ana səhifəni bölmə-bölmə gəzə bilsin.
// ============================================================================

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { CLASS_HOME_ICONS, type ClassHomeIconName } from "./icons";

interface WidgetCardProps {
  /** `<section aria-labelledby>` üçün — ClassHome widget id-sindən qurulur. */
  headingId: string;
  title: string;
  icon: ClassHomeIconName;
  description?: string;
  /** Başlığın sağındakı "hamısına bax" keçidi. */
  action?: { href: string; label: string };
  children: React.ReactNode;
  /** Kartın altındakı əlavə düymələr (KUDS: Actions). */
  footer?: React.ReactNode;
}

export function WidgetCard({
  headingId,
  title,
  icon,
  description,
  action,
  children,
  footer,
}: WidgetCardProps) {
  const Icon = CLASS_HOME_ICONS[icon];

  return (
    <Card className="flex h-full flex-col shadow-sm-kuds">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
            <h2 id={headingId} className="text-h3 font-semibold text-text-primary">
              {title}
            </h2>
          </div>
          {description ? (
            <p className="text-small text-text-secondary">{description}</p>
          ) : null}
        </div>

        {action ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1">
            <Link href={action.href}>
              {action.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">{children}</CardContent>

      {footer ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-6">{footer}</div>
      ) : null}
    </Card>
  );
}

/**
 * `<Suspense fallback>` — hər widget öz məlumatını müstəqil çəkir, ona görə
 * biri gec gələndə səhifənin qalanı gözləmir (Next.js streaming).
 *
 * ⚠️ `headingId` MƏCBURİDİR. Widget-i saran `<section aria-labelledby={id}>`
 * yüklənmə anında hələ real başlığa malik olmur; id boşda qalsa ekran oxuyucu
 * adsız bölmə elan edər. Skeleton həmin id ilə gizli mətn verir və etiket
 * zənciri qırılmır.
 */
export function WidgetSkeleton({
  headingId,
  rows = 3,
}: {
  headingId: string;
  rows?: number;
}) {
  return (
    <Card className="flex h-full flex-col shadow-sm-kuds" aria-busy="true">
      <CardHeader className="space-y-0">
        <span id={headingId} className="sr-only">
          Bölmə yüklənir
        </span>
        <Skeleton className="h-5 w-40 rounded-btn" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-avatar" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-1/2 rounded-btn" />
              <Skeleton className="h-3 w-3/4 rounded-btn" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
