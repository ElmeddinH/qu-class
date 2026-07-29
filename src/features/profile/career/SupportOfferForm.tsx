"use client";

// ============================================================================
// src/features/profile/career/SupportOfferForm.tsx
// 7 dəstək təklifi + `openToSupport` açarı (spec §9).
//
// 🔴 ÜÇÜNCÜ RAZILIQ — və ən çox səhv anlaşılanı.
// `cohort.service.listSupportOffers` sorğusu belədir:
//     where: { openToSupport: true, supportOffers: { some: {} }, … }
// Yəni 7 təklifin hamısını seçib bayrağı AÇMAYAN istifadəçi HEÇ YERDƏ
// görünmür — nə sinif səhifəsindəki widget-də, nə profilində. Bu, səssiz
// uğursuzluqdur: adam "seçdim, saxladım" deyir, nəticə isə yoxdur.
//
// Ona görə forma bunu AÇIQ göstərir:
//   · açar ən yuxarıda, izahla;
//   · açar sönülü + seçim varsa xəbərdarlıq paneli çıxır;
//   · saxlama mesajı da vəziyyəti təkrarlayır (bax `actions.ts`).
//
// ⚠️ 7 növün HAMISI formada saxlanılır (`selected` bayrağı ilə), yalnız
// seçilənlər deyil — istifadəçi işarəni götürüb yenidən qoyanda qeyd mətni
// itməsin.
// ============================================================================

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HeartHandshake, LoaderCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SUPPORT_OFFER_TYPE_VALUES } from "@/lib/enums";
import { SUPPORT_OFFER_LABELS } from "@/lib/labels";
import type { OwnSupportOffer } from "@/services/career.service";

import { supportSettingsSchema, type SupportSettingsFormInput } from "../schemas";
import { updateSupportSettingsAction } from "./actions";

interface SupportOfferFormProps {
  openToSupport: boolean;
  offers: OwnSupportOffer[];
  onSaved: () => void;
}

export function SupportOfferForm({ openToSupport, offers, onSaved }: SupportOfferFormProps) {
  const [pending, startTransition] = useTransition();

  const byType = new Map(offers.map((offer) => [offer.type, offer.note ?? ""]));

  const form = useForm<SupportSettingsFormInput>({
    resolver: zodResolver(supportSettingsSchema),
    defaultValues: {
      openToSupport,
      // Sıra `SUPPORT_OFFER_TYPE_VALUES`-dan gəlir — 7 sətir HƏMİŞƏ formada olur.
      offers: SUPPORT_OFFER_TYPE_VALUES.map((type) => ({
        type,
        selected: byType.has(type),
        note: byType.get(type) ?? "",
      })),
    },
  });

  const isOpen = form.watch("openToSupport");
  const rows = form.watch("offers");
  const selectedCount = rows.filter((row) => row.selected).length;

  function onSubmit(values: SupportSettingsFormInput) {
    startTransition(async () => {
      const result = await updateSupportSettingsAction(values);

      if (!result.ok) {
        toast.error(result.message ?? "Seçimlər saxlanmadı.");
        return;
      }

      toast.success(result.message ?? "Seçimlər saxlanıldı.");
      onSaved();
    });
  }

  return (
    <Card id="support" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-ku-green" aria-hidden />
          Sinfimə necə dəstək ola bilərəm?
        </CardTitle>
        <CardDescription>
          Məzun kimi hansı formada kömək edə biləcəyinizi seçin. Bu, görünürlük və
          statistika razılıqlarından AYRI bir seçimdir.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {/* --- 3. RAZILIQ: ümumi açar --- */}
            <FormField
              control={form.control}
              name="openToSupport"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start justify-between gap-4 rounded-card border border-border bg-background p-4">
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="open-to-support"
                        className="text-small font-medium text-text-primary"
                      >
                        Dəstəyə açığam
                      </Label>
                      <p className="max-w-md text-caption text-text-secondary">
                        Bu açar sönülü olduqda aşağıdaki seçimlərin HEÇ BİRİ heç
                        kimə görünmür — nə sinif səhifəsində, nə profilinizdə.
                      </p>
                    </div>

                    <FormControl>
                      <Switch
                        id="open-to-support"
                        checked={field.value}
                        disabled={pending}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Səssiz uğursuzluğun QARŞISI: seçim var, açar sönülü. */}
            {!isOpen && selectedCount > 0 ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-input bg-warning/10 px-3 py-2 text-small text-warning-strong"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {selectedCount} təklif seçilib, amma «dəstəyə açığam» sönülüdür —
                təkliflər gizli qalır.
              </p>
            ) : null}

            <ul className="flex flex-col gap-3">
              {SUPPORT_OFFER_TYPE_VALUES.map((type, index) => (
                <li key={type} className="flex flex-col gap-2 rounded-card border border-border p-3">
                  <FormField
                    control={form.control}
                    name={`offers.${index}.selected`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              id={`offer-${type}`}
                              checked={field.value}
                              disabled={pending}
                              onCheckedChange={(next) => field.onChange(next === true)}
                            />
                          </FormControl>
                          <Label htmlFor={`offer-${type}`} className="font-normal">
                            {SUPPORT_OFFER_LABELS[type]}
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {rows[index]?.selected ? (
                    <FormField
                      control={form.control}
                      name={`offers.${index}.note`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Qeyd (istəyə bağlı) — məsələn: semestrdə bir dəfə"
                              aria-label={`${SUPPORT_OFFER_LABELS[type]} üçün qeyd`}
                              disabled={pending}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Saxlanılır...
                  </>
                ) : (
                  "Dəstək seçimlərini saxla"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
