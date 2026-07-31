"use client";

// ============================================================================
// src/features/profile/career/EducationEntryDialog.tsx
// Təhsil qeydinin yaradılması / redaktəsi (RHF + Zod).
//
// ⚠️ TƏLƏ T3: `startYear` / `endYear` sxemdə SƏTİRDİR (`z.coerce.number()`
// YOX) — `Int`-ə çevirmə server action-dadır. `<input type="number">` işlədilir,
// amma RHF dəyəri yenə sətirdir və bu, qəsdəndir.
//
// ⚠️ Karyeradan FƏRQLİ: burada `isCurrent` TƏK olmaq məcburiyyəti yoxdur — bir
// nəfər eyni vaxtda magistratura və sertifikat proqramında ola bilər. Səbəb
// `services/career.service.ts`-də izah olunub (`stats.service` təhsil xanalarını
// `isCurrent`-ə görə süzmür, ona görə ikiqat sayma riski yaranmır).
// ============================================================================

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEGREE_VALUES, Degree, Visibility } from "@/lib/enums";
import { MAX_ENTRY_YEAR, MIN_ENTRY_YEAR } from "@/lib/form-fields";
import { DEGREE_LABELS } from "@/lib/labels";
import type { OwnEducationEntry } from "@/services/career.service";
import { useDialogFocusRestore } from "@/components/kuds/use-dialog-focus-restore";

import { educationEntrySchema, type EducationEntryFormInput } from "../schemas";
import { saveEducationEntryAction } from "./actions";
import { EntryConsentFields } from "./EntryConsentFields";

function defaultsOf(entry: OwnEducationEntry | null): EducationEntryFormInput {
  return {
    entryId: entry?.id ?? "",
    institution: entry?.institution ?? "",
    degree: entry?.degree ?? Degree.MASTER,
    field: entry?.field ?? "",
    country: entry?.country ?? "",
    startYear: entry ? String(entry.startYear) : "",
    endYear: entry?.endYear ? String(entry.endYear) : "",
    isCurrent: entry?.isCurrent ?? false,
    visibility: entry?.visibility ?? Visibility.CLASS,
    includeInStats: entry?.includeInStats ?? false,
  } as EducationEntryFormInput;
}

interface EducationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: OwnEducationEntry | null;
  onSaved: () => void;
}

export function EducationEntryDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
}: EducationEntryDialogProps) {
  // TƏLƏ T44 — modal bağlananda fokus tetikləyiciyə qayıtsın.
  const restoreFocus = useDialogFocusRestore();

  const [pending, startTransition] = useTransition();

  const form = useForm<EducationEntryFormInput>({
    resolver: zodResolver(educationEntrySchema),
    defaultValues: defaultsOf(entry),
  });

  useEffect(() => {
    if (open) form.reset(defaultsOf(entry));
  }, [open, entry, form]);

  const isCurrent = form.watch("isCurrent");

  function onSubmit(values: EducationEntryFormInput) {
    startTransition(async () => {
      const result = await saveEducationEntryAction(values);

      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as keyof EducationEntryFormInput, { message });
        }
        toast.error(result.message ?? "Qeyd saxlanmadı.");
        return;
      }

      toast.success(result.message ?? "Qeyd saxlanıldı.");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" onCloseAutoFocus={restoreFocus}>
        <DialogHeader>
          <DialogTitle>{entry ? "Təhsil qeydini redaktə et" : "Təhsil qeydi əlavə et"}</DialogTitle>
          <DialogDescription>
            Qarabağ Universitetindən sonrakı (və ya paralel) təhsiliniz. Hər qeydin
            görünürlüyü və statistika seçimi AYRICA idarə olunur.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Müəssisə</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="degree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dərəcə</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Dərəcə seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEGREE_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {DEGREE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İxtisas sahəsi</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlama ili</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={MIN_ENTRY_YEAR}
                        max={MAX_ENTRY_YEAR}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitmə ili</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={MIN_ENTRY_YEAR}
                        max={MAX_ENTRY_YEAR}
                        disabled={isCurrent}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ölkə</FormLabel>
                    <FormControl>
                      <Input autoComplete="country-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isCurrent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        id="education-is-current"
                        checked={field.value}
                        onCheckedChange={(next) => {
                          field.onChange(next === true);
                          if (next === true) form.setValue("endYear", "");
                        }}
                      />
                    </FormControl>
                    <Label htmlFor="education-is-current" className="font-normal">
                      Hələ davam edir
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* İKİ MÜSTƏQİL RAZILIQ — karyera dialoqu ilə EYNİ komponent */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field: visibilityField }) => (
                <FormField
                  control={form.control}
                  name="includeInStats"
                  render={({ field: statsField }) => (
                    <FormItem>
                      <FormControl>
                        <EntryConsentFields
                          namePrefix="education-entry"
                          visibility={visibilityField.value}
                          onVisibilityChange={visibilityField.onChange}
                          includeInStats={statsField.value}
                          onIncludeInStatsChange={statsField.onChange}
                          disabled={pending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Ləğv et
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Saxlanılır...
                  </>
                ) : (
                  "Yadda saxla"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
