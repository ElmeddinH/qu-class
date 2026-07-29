"use client";

// ============================================================================
// src/components/shared/VisibilitySelector.tsx
// 4 səviyyəli görünürlük seçicisi (seqment idarəedicisi).
//
// ⚠️ Radix RadioGroup ƏVƏZİNƏ native `<input type="radio">` işlədilir.
// Səbəb: shadcn `RadioGroupItem` öz mənbəyində sabit ölçü (`h-4 w-4
// aspect-square rounded-full`) və daxili nöqtə indikatoru daşıyır; seqment
// forması üçün onu əzmək lazım gələrdi, `src/components/ui/` isə TOXUNULMAZDIR
// (CLAUDE.md §1). Native radio qrupu klaviatura naviqasiyasını (ox düymələri,
// tək tab dayanacağı) və ekran oxuyucu semantikasını onsuz da PULSUZ verir.
// ============================================================================

import { cn } from "@/lib/utils";
import { type Visibility } from "@/lib/visibility";
import { VISIBILITY_ICONS, VISIBILITY_META, VISIBILITY_OPTIONS } from "./visibility-meta";

interface VisibilitySelectorProps {
  value: Visibility;
  onValueChange: (value: Visibility) => void;
  /**
   * Radio qrupunun `name`-i — SƏHİFƏDƏ UNİKAL olmalıdır. Eyni ad iki sahədə
   * işlədilsə brauzer onları TƏK qrup sayar və biri digərini sıfırlayar.
   */
  name: string;
  /** Ekran oxuyucu üçün qrup başlığı — hansı sahənin görünürlüyü. */
  legend: string;
  disabled?: boolean;
  className?: string;
}

export function VisibilitySelector({
  value,
  onValueChange,
  name,
  legend,
  disabled = false,
  className,
}: VisibilitySelectorProps) {
  return (
    <fieldset className={cn("min-w-0", className)} disabled={disabled}>
      <legend className="sr-only">{legend}</legend>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VISIBILITY_OPTIONS.map((level) => {
          const meta = VISIBILITY_META[level];
          const Icon = VISIBILITY_ICONS[meta.icon];
          const id = `${name}-${level}`;

          return (
            <div key={level} className="min-w-0">
              <input
                type="radio"
                id={id}
                name={name}
                value={level}
                checked={value === level}
                onChange={() => onValueChange(level)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={meta.audience}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-btn border border-border",
                  "bg-surface px-3 py-2 text-small text-text-secondary transition-colors",
                  "hover:border-ku-green hover:text-ku-dark",
                  "peer-checked:border-ku-green peer-checked:bg-ku-soft peer-checked:font-medium peer-checked:text-ku-dark",
                  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{meta.label}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
