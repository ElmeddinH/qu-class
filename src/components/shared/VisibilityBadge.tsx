// ============================================================================
// src/components/shared/VisibilityBadge.tsx
// Kompakt görünürlük göstəricisi — post kartı, profil sahəsi, tədbir başlığı.
// ============================================================================

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isVisibility } from "@/lib/visibility";
import {
  UNKNOWN_VISIBILITY_META,
  VISIBILITY_ICONS,
  VISIBILITY_META,
} from "./visibility-meta";

interface VisibilityBadgeProps {
  /**
   * DB-dən gələn xam dəyər (`String` sütunu). Tanınmayan səviyyə "Naməlum"
   * kimi göstərilir — səssizcə "açıq" kimi render OLUNMUR (fail closed).
   */
  level: string;
  /** `false` olarsa yalnız ikon göstərilir (dar yerlər üçün). */
  showLabel?: boolean;
  className?: string;
}

export function VisibilityBadge({
  level,
  showLabel = true,
  className,
}: VisibilityBadgeProps) {
  const meta = isVisibility(level) ? VISIBILITY_META[level] : UNKNOWN_VISIBILITY_META;
  const Icon = VISIBILITY_ICONS[meta.icon];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 rounded-badge px-2 py-0.5 text-caption font-medium",
        meta.badgeClass,
        className,
      )}
      title={meta.audience}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {showLabel ? meta.label : <span className="sr-only">{meta.label}</span>}
    </Badge>
  );
}
