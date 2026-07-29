// ============================================================================
// src/components/shared/StatCard.tsx
// Rəqəm göstəricisi — üzv sayı, nailiyyət sayı, "İndi haradayıq?" xülasəsi.
//
// KUDS §12 kart quruluşunun kiçildilmiş variantı: ikon → dəyər → etiket.
// Kölgə YOXDUR (ağır kölgə qadağandır və bunlar adətən kartın İÇİNDƏ olur).
// ============================================================================

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  /** Böyük rəqəm və ya qısa dəyər. */
  value: string | number;
  label: string;
  /** Dəyərin altında bir sətirlik izah (məs. "razılıq verənlər"). */
  hint?: string;
  className?: string;
}

export function StatCard({ icon: Icon, value, label, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-card border border-border bg-surface p-4",
        className,
      )}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-avatar bg-ku-soft"
        aria-hidden
      >
        <Icon className="h-5 w-5 text-ku-dark" />
      </span>

      <div className="flex min-w-0 flex-col">
        <span className="text-h3 font-semibold leading-tight text-text-primary">
          {value}
        </span>
        <span className="text-small text-text-secondary">{label}</span>
        {hint ? <span className="text-caption text-text-secondary">{hint}</span> : null}
      </div>
    </div>
  );
}
