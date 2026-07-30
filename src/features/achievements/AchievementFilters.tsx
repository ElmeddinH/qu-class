"use client";

// ============================================================================
// src/features/achievements/AchievementFilters.tsx
// 12 nailiyyət kateqoriyasının filtri (spec §12) — vəziyyət URL-dədir (nuqs).
//
// 🔴 PARAMETR ADI `src/lib/achievement-filters.ts` (`ACHIEVEMENT_PARAMS`) ilə
// EYNİDİR: server komponenti URL-i həmin moduldan oxuyur, səhifələmə linkləri
// də oradan qurulur.
//
// ⚠️ `shallow: false` — süzgəc DB-dədir, server komponenti yenidən işə düşməlidir.
//
// ⚠️ Çiplər `AchievementCategory` üzərində dövr edir, `PostCategory` üzərində
// YOX. İkisi ayrı enum-dur və yalnız `COMPETITION` adı kəsişir.
// ============================================================================

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENT_CATEGORY_VALUES, type AchievementCategory } from "@/lib/enums";
import { ACHIEVEMENT_PARAMS } from "@/lib/achievement-filters";
import { cn } from "@/lib/utils";
import { ACHIEVEMENT_CATEGORY_META, FEED_ICONS } from "@/features/feed/catalog";

export const ACHIEVEMENT_PARSERS = {
  [ACHIEVEMENT_PARAMS.category]: parseAsStringLiteral(ACHIEVEMENT_CATEGORY_VALUES),
  [ACHIEVEMENT_PARAMS.page]: parseAsInteger,
};

export function AchievementFilters() {
  const [values, setValues] = useQueryStates(ACHIEVEMENT_PARSERS, {
    shallow: false,
    clearOnDefault: true,
  });

  const active = (values.category as AchievementCategory | null) ?? null;

  // Kateqoriya dəyişəndə səhifə SIFIRLANIR — 3-cü səhifədə filtr dəyişən
  // istifadəçi çox vaxt boş səhifəyə düşərdi.
  const select = (category: AchievementCategory | null) =>
    void setValues({ category, page: null });

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Nailiyyət kateqoriyaları"
    >
      <CategoryChip
        label="Hamısı"
        selected={active === null}
        onSelect={() => select(null)}
      />

      {ACHIEVEMENT_CATEGORY_VALUES.map((category) => {
        const meta = ACHIEVEMENT_CATEGORY_META[category];
        const Icon = FEED_ICONS[meta.icon];

        return (
          <CategoryChip
            key={category}
            label={meta.label}
            icon={<Icon className="h-3 w-3" aria-hidden />}
            selected={active === category}
            onSelect={() => select(active === category ? null : category)}
          />
        );
      })}
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}>
      <Badge
        variant="outline"
        className={cn(
          "gap-1 px-3 py-1 text-caption font-normal",
          selected
            ? "border-ku-green bg-ku-soft text-text-primary"
            : "text-text-secondary hover:bg-background",
        )}
      >
        {icon}
        {label}
      </Badge>
    </button>
  );
}
