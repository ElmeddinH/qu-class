"use client";

// ============================================================================
// src/features/profile/TagPicker.tsx
// Taq seçicisi — maraq / hobbi / bacarıq / dil.
//
// 🔴 İSTİFADƏÇİ YENİ TAQ YARATMIR, yalnız mövcud kataloqdan seçir.
// Səbəb `services/user.service.ts` → `updateProfile` şərhindədir: sərbəst mətn
// qəbul etsək kataloq "AI" / "ai" / "Süni intellekt" dublikatları ilə dolar və
// kataloq filtri, facet sayları, tanışlıq kartları — üçü də sınar. Taq
// kataloqunun idarəsi admin işidir (Blok 11).
//
// ⚠️ Radix Checkbox ƏVƏZİNƏ native `<input type="checkbox">` + `peer`
// işlədilir — `VisibilitySelector` ilə eyni səbəb: çip forması üçün shadcn
// primitivinin sabit ölçüsünü əzmək lazım gələrdi, `components/ui/` isə
// toxunulmazdır (CLAUDE.md §1). Native input klaviatura və ekran oxuyucu
// semantikasını pulsuz verir.
// ============================================================================

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_LEVEL_VALUES } from "@/lib/enums";
import { LANGUAGE_LEVEL_HINTS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TagCatalogEntry } from "@/services/user.service";

import type { ProfileTagInput } from "./schemas";

interface TagPickerProps {
  /** Bu seçicinin göstərdiyi taqlar (bir növ). */
  options: TagCatalogEntry[];
  /** Formadakı BÜTÜN seçilmiş taqlar (dörd növ birlikdə). */
  value: ProfileTagInput[];
  onChange: (next: ProfileTagInput[]) => void;
  /** `true` → hər seçilmiş taq üçün səviyyə seçicisi (yalnız dillər). */
  withLevel?: boolean;
  /** Sahə adı — checkbox `id`-lərini SƏHİFƏDƏ UNİKAL etmək üçün. */
  fieldName: string;
  disabled?: boolean;
}

export function TagPicker({
  options,
  value,
  onChange,
  withLevel = false,
  fieldName,
  disabled = false,
}: TagPickerProps) {
  const selectedIds = new Set(value.map((tag) => tag.tagId));

  function toggle(tagId: string): void {
    onChange(
      selectedIds.has(tagId)
        ? value.filter((tag) => tag.tagId !== tagId)
        : [...value, { tagId, level: "" }],
    );
  }

  function setLevel(tagId: string, level: string): void {
    onChange(value.map((tag) => (tag.tagId === tagId ? { ...tag, level } : tag)));
  }

  if (options.length === 0) {
    return (
      <p className="text-small text-text-secondary">
        Kataloqda hələ seçim yoxdur — universitet administratoru əlavə edəcək.
      </p>
    );
  }

  const selectedOptions = options.filter((option) => selectedIds.has(option.id));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = `${fieldName}-${option.id}`;
          const checked = selectedIds.has(option.id);

          return (
            <li key={option.id}>
              <input
                type="checkbox"
                id={id}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.id)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-1 rounded-badge border border-border",
                  "bg-surface px-3 py-1 text-small text-text-secondary transition-colors",
                  "hover:border-ku-green hover:text-ku-dark",
                  "peer-checked:border-ku-green peer-checked:bg-ku-soft peer-checked:font-medium peer-checked:text-ku-dark",
                  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                )}
              >
                {option.name}
              </label>
            </li>
          );
        })}
      </ul>

      {withLevel && selectedOptions.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-card border border-border p-3">
          <p className="text-caption text-text-secondary">
            Hər dil üçün səviyyə seçin (istəyə bağlı).
          </p>

          {selectedOptions.map((option) => {
            const current = value.find((tag) => tag.tagId === option.id)?.level ?? "";

            return (
              <div key={option.id} className="flex items-center justify-between gap-3">
                <span className="text-small text-text-primary">{option.name}</span>

                <Select
                  value={current}
                  disabled={disabled}
                  onValueChange={(next) => setLevel(option.id, next)}
                >
                  <SelectTrigger
                    className="w-48"
                    aria-label={`${option.name} səviyyəsi`}
                  >
                    <SelectValue placeholder="Səviyyə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_LEVEL_VALUES.map((level) => (
                      <SelectItem key={level} value={level}>
                        {LANGUAGE_LEVEL_HINTS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
