"use client";

// ============================================================================
// src/features/privacy/PrivacySettings.tsx
// Məxfilik paneli [M14] — hər profil sahəsi üçün 4 səviyyəli seçici.
//
// Optimistik UI: seçim DƏRHAL görünür, server action arxa planda işləyir.
// Xəta olarsa `savedLevels` dəyişmədiyi üçün `useOptimistic` avtomatik köhnə
// dəyərə qayıdır və toast xətanı göstərir — istifadəçi "saxlanıldı" zənn edib
// yanılmır.
// ============================================================================

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { VisibilitySelector } from "@/components/shared/VisibilitySelector";
import { VISIBILITY_META, VISIBILITY_OPTIONS } from "@/components/shared/visibility-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { ControlledField, Visibility } from "@/lib/visibility";
import type { FieldVisibilityMap } from "@/services/user.service";
import { updateFieldVisibilityAction, updateFieldVisibilityManyAction } from "./actions";
import { FIELD_LABELS, isRelationalField, PRIVACY_SECTIONS } from "./fields";

interface PrivacySettingsProps {
  initialLevels: FieldVisibilityMap;
}

type LevelPatch = Partial<Record<ControlledField, Visibility>>;

export function PrivacySettings({ initialLevels }: PrivacySettingsProps) {
  // Müştəri tərəfdəki HƏQİQƏT: yalnız server təsdiqindən sonra yenilənir.
  const [savedLevels, setSavedLevels] = useState<FieldVisibilityMap>(initialLevels);

  const [levels, applyOptimistic] = useOptimistic(
    savedLevels,
    (state: FieldVisibilityMap, patch: LevelPatch) => ({ ...state, ...patch }),
  );

  const [isPending, startTransition] = useTransition();
  const [pendingField, setPendingField] = useState<string | null>(null);

  function changeField(field: ControlledField, level: Visibility) {
    if (levels[field] === level) return;

    startTransition(async () => {
      applyOptimistic({ [field]: level });
      setPendingField(field);

      const result = await updateFieldVisibilityAction(field, level);

      setPendingField(null);
      if (!result.ok) {
        toast.error(result.message ?? "Dəyişiklik saxlanmadı.");
        return;
      }

      setSavedLevels((prev) => ({ ...prev, [field]: level }));
      toast.success(`"${FIELD_LABELS[field]}" → ${VISIBILITY_META[level].label}`);
    });
  }

  function changeSection(sectionFields: readonly ControlledField[], level: Visibility) {
    startTransition(async () => {
      const patch: LevelPatch = Object.fromEntries(
        sectionFields.map((field) => [field, level]),
      );
      applyOptimistic(patch);

      const result = await updateFieldVisibilityManyAction([...sectionFields], level);

      if (!result.ok) {
        toast.error(result.message ?? "Dəyişiklik saxlanmadı.");
        return;
      }

      setSavedLevels((prev) => ({ ...prev, ...patch }));
      toast.success(`${sectionFields.length} sahə → ${VISIBILITY_META[level].label}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {PRIVACY_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending} className="shrink-0">
                  Hamısını dəyiş
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  «{section.title}» bölməsinin {section.fields.length} sahəsi
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {VISIBILITY_OPTIONS.map((level) => (
                  <DropdownMenuItem
                    key={level}
                    onSelect={() => changeSection(section.fields, level)}
                  >
                    {VISIBILITY_META[level].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            {section.fields.map((field, index) => {
              const level = levels[field];

              return (
                <div key={field} className="flex flex-col gap-3">
                  {index > 0 ? <Separator /> : null}

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-text-primary">
                        {FIELD_LABELS[field]}
                      </span>
                      {pendingField === field ? (
                        <LoaderCircle
                          className="h-4 w-4 animate-spin text-text-secondary"
                          aria-label="Saxlanılır"
                        />
                      ) : null}
                    </div>

                    {isRelationalField(field) ? (
                      <p className="text-caption text-text-secondary">
                        Siyahıdakı bütün qeydlərə birlikdə tətbiq olunur.
                      </p>
                    ) : null}
                  </div>

                  <VisibilitySelector
                    name={`visibility-${field}`}
                    legend={`${FIELD_LABELS[field]} sahəsinin görünürlüyü`}
                    value={level}
                    onValueChange={(next) => changeField(field, next)}
                  />

                  <p className="text-small text-text-secondary">
                    {VISIBILITY_META[level].audience}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex-row items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-avatar bg-ku-soft"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5 text-ku-dark" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-h4">Nəzərə alın</CardTitle>
            <CardDescription>
              Ad və soyadınız həmişə görünür — platformanın işləməsi üçün minimum
              məlumatdır. «Yalnız mən» səviyyəsindəki sahəni universitet
              administratoru da oxuya bilmir.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
