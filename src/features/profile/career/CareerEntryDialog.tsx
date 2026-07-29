"use client";

// ============================================================================
// src/features/profile/career/CareerEntryDialog.tsx
// Karyera qeydinin yaradılması / redaktəsi (RHF + Zod).
//
// ⚠️ TƏLƏ T3: `startDate` / `endDate` SƏTİRDİR (`<input type="date">` dəyəri).
// `z.coerce.date()` işlətsək sxemin giriş tipi `unknown` olar və RHF sahə
// tipləri dağılar; `Date`-ə çevirmə server action-dadır.
//
// ⚠️ `entryId` gizli sahədədir, amma TƏK BAŞINA ETİBARLI DEYİL: servis
// `where: { id, userId: viewer.userId }` şərti ilə yazır, yəni başqasının
// qeydinin id-si göndərilsə nəticə `NOT_FOUND` olur.
//
// ⚠️ `isCurrent` seçilibsə bitmə tarixi BOŞ olmalıdır (sxem bunu yoxlayır) və
// SERVER digər qeydlərin `isCurrent`-ini söndürür — bir nəfərin yalnız bir
// cari işi ola bilər (səbəb: `stats.service` cari sətirləri sayır, bax
// `services/career.service.ts`).
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
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_VALUES } from "@/lib/enums";
import { INDUSTRY_LABELS } from "@/lib/labels";
import { Visibility } from "@/lib/enums";
import type { OwnCareerEntry } from "@/services/career.service";

import { careerEntrySchema, type CareerEntryFormInput } from "../schemas";
import { saveCareerEntryAction } from "./actions";
import { EntryConsentFields } from "./EntryConsentFields";

/** `Date` → `<input type="date">` dəyəri (`YYYY-MM-DD`). */
function dateInputValue(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function defaultsOf(entry: OwnCareerEntry | null): CareerEntryFormInput {
  return {
    entryId: entry?.id ?? "",
    company: entry?.company ?? "",
    position: entry?.position ?? "",
    industry: entry?.industry ?? "",
    city: entry?.city ?? "",
    country: entry?.country ?? "",
    startDate: dateInputValue(entry?.startDate ?? null),
    endDate: dateInputValue(entry?.endDate ?? null),
    isCurrent: entry?.isCurrent ?? false,
    description: entry?.description ?? "",
    // Yeni qeyd üçün default `CLASS` — açıq deyil (CLAUDE.md məxfilik qaydası).
    visibility: entry?.visibility ?? Visibility.CLASS,
    // ⚠️ Yeni qeyd statistikaya DEFAULT olaraq DAXİL EDİLMİR: aqreqasiya
    // razılığı açıq seçim tələb edir, sükut razılıq deyil.
    includeInStats: entry?.includeInStats ?? false,
  } as CareerEntryFormInput;
}

interface CareerEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` → yeni qeyd. */
  entry: OwnCareerEntry | null;
  onSaved: () => void;
}

export function CareerEntryDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
}: CareerEntryDialogProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<CareerEntryFormInput>({
    resolver: zodResolver(careerEntrySchema),
    defaultValues: defaultsOf(entry),
  });

  // Dialoq eyni komponentlə həm "əlavə et", həm "redaktə et" üçün açılır —
  // açılışda formanı hədəf qeydə uyğunlaşdırmaq lazımdır.
  useEffect(() => {
    if (open) form.reset(defaultsOf(entry));
  }, [open, entry, form]);

  const isCurrent = form.watch("isCurrent");

  function onSubmit(values: CareerEntryFormInput) {
    startTransition(async () => {
      const result = await saveCareerEntryAction(values);

      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as keyof CareerEntryFormInput, { message });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Karyera qeydini redaktə et" : "Karyera qeydi əlavə et"}</DialogTitle>
          <DialogDescription>
            İş yeri, vəzifə və dövr. Hər qeydin görünürlüyü və statistika seçimi
            AYRICA idarə olunur.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şirkət / təşkilat</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vəzifə</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sənaye sahəsi</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sahə seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRY_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {INDUSTRY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ⚠️ Yalnız şəhər/ölkə — dəqiq ünvan HEÇ VAXT soruşulmur (spec §13). */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şəhər</FormLabel>
                    <FormControl>
                      <Input autoComplete="address-level2" {...field} />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlama tarixi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitmə tarixi</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isCurrent} {...field} />
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
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        id="career-is-current"
                        checked={field.value}
                        onCheckedChange={(next) => {
                          field.onChange(next === true);
                          // Cari iş üçün bitmə tarixi olmamalıdır — sxem də
                          // bunu tələb edir, forma isə səhvi gözləmədən təmizləyir.
                          if (next === true) form.setValue("endDate", "");
                        }}
                      />
                    </FormControl>
                    <Label htmlFor="career-is-current" className="flex flex-col gap-0.5 font-normal">
                      <span className="text-small text-text-primary">Hazırda burada işləyirəm</span>
                      <span className="text-caption text-text-secondary">
                        Yalnız BİR qeyd cari ola bilər — bunu seçsəniz digər cari
                        qeyd avtomatik keçmişə keçir (statistika bir nəfəri iki dəfə
                        saymasın).
                      </span>
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nə işlə məşğulsunuz?</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* İKİ MÜSTƏQİL RAZILIQ — ortaq komponent */}
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
                          namePrefix="career-entry"
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
