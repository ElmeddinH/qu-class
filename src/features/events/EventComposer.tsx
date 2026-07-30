"use client";

// ============================================================================
// src/features/events/EventComposer.tsx
// Tədbir yaratma formu — spec §14-ün 10 SAHƏSİ + bizim 3 əlavəmiz.
//
// spec §14 sahələri:
//   1. ad · 2. təsvir · 3. tarix-saat (başlama/bitmə) · 4. məkan ·
//   5. onlayn keçid · 6. iştirakçı limiti · 7. qeydiyyat son tarixi ·
//   8. proqram (markdown) · 9. əlaqələndirici şəxs · 10. görünürlük səviyyəsi
//
// Bizim əlavələrimiz (spec-də YOXDUR, filtrlər üçün lazımdır):
//   scope (təşkilatçı səviyyəsi) · category (tədbirin növü) · facultyId
//
// 🔴 `scope` ≠ `category`. İki AYRI select-dir və dəyər siyahıları kəsişmir:
// `REUNION` yalnız `scope`-dadır, `CEREMONY` yalnız `category`-də. Formada
// onları yan-yana qoymaq və izah yazmaq QƏSDƏNDİR — istifadəçi fərqi görməsə
// filtrlər mənasızlaşır.
//
// ⚠️ TƏLƏ T3: bütün tarixlər və tutum SƏTİRDİR (`datetime-local` / `text`).
// `Date` / `number`-ə çevirmə SERVER ACTION-dadır (`actions.ts`).
//
// ⚠️ CLAUDE.md §1: `variant="secondary"` İŞLƏDİLMİR — KUDS-da ikinci dərəcəli
// düymə `outline`-dır.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { CalendarPlus, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";

import { VisibilitySelector } from "@/components/shared/VisibilitySelector";
import { VISIBILITY_META } from "@/components/shared/visibility-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { EventScope, Visibility } from "@/lib/enums";
import { toLocalDateTimeValue } from "@/utils/date";

import { createEventAction, revalidateEventsAction } from "./actions";
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_CATEGORY_META,
  EVENT_ICONS,
  EVENT_SCOPE_META,
  EVENT_SCOPE_OPTIONS,
} from "./catalog";
import { createEventSchema, type CreateEventInput } from "./schemas";
import type { EventComposerOption } from "./types";

interface EventComposerProps {
  cohortId: string;
  cohortSlug: string;
  /** Fakültə seçimi — `scope = FACULTY` olduqda görünür. */
  faculties: EventComposerOption[];
  /** Klub seçimi — `scope = CLUB` olduqda görünür. */
  clubs: EventComposerOption[];
  /** Əlaqələndirici namizədləri — sinif üzvləri (spec §14 sahə 9). */
  contacts: EventComposerOption[];
}

/** Radix Select boş sətir qəbul etmir — "seçilməyib" üçün sentinel. */
const NONE_VALUE = "__none__";

/** Yeni tədbirin defolt başlama vaxtı: sabah, saat 12:00. */
function defaultStart(now: Date): Date {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(12, 0, 0, 0);
  return start;
}

function makeDefaults(cohortId: string): CreateEventInput {
  const start = defaultStart(new Date());
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return {
    cohortId,
    title: "",
    description: "",
    startsAt: toLocalDateTimeValue(start),
    endsAt: toLocalDateTimeValue(end),
    location: "",
    onlineUrl: "",
    isOnline: false,
    capacity: "",
    registrationDeadline: "",
    agenda: "",
    contactId: "",
    visibility: Visibility.CLASS,
    // ⚠️ Sinif səhifəsindən yaradılan tədbirin defolt səviyyəsi `CLASS`-dır —
    // `UNIVERSITY` qoysaq nümayəndə səhvən bütün universitetə elan verər.
    scope: EventScope.CLASS,
    // Kateqoriya QƏSDƏN boşdur: hazır dəyər qoysaq hamı "Digər" göndərər və
    // spec §15-in kateqoriya filtri mənasını itirər.
    category: undefined as unknown as CreateEventInput["category"],
    facultyId: "",
    clubId: "",
    coverUrl: "",
  };
}

export function EventComposer({
  cohortId,
  cohortSlug,
  faculties,
  clubs,
  contacts,
}: EventComposerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults = useMemo(() => makeDefaults(cohortId), [cohortId]);

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: defaults,
    mode: "onSubmit",
  });

  const scope = form.watch("scope");
  const isOnline = form.watch("isOnline");
  const visibility = form.watch("visibility");

  function close() {
    form.reset(makeDefaults(cohortId));
    setIsOpen(false);
  }

  function onSubmit(values: CreateEventInput) {
    startTransition(async () => {
      const result = await createEventAction(values);

      if (!result.ok) {
        // Serverin sahə səhvləri formaya qaytarılır — müştəri sxemi eynidir,
        // amma server əlavə yoxlamalar edir (rol, fakültə mövcudluğu).
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as Path<CreateEventInput>, { message });
        }
        toast.error(result.message ?? "Tədbir yaradılmadı.");
        return;
      }

      toast.success(result.message ?? "Tədbir elan olundu.");
      await revalidateEventsAction(cohortSlug);
      close();
      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <Button type="button" className="gap-2" onClick={() => setIsOpen(true)}>
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Yeni tədbir
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold text-text-primary">Yeni tədbir</h2>
          <p className="text-small text-text-secondary">
            Tarix, yer, iştirak həddi və görünürlük səviyyəsini təyin edin.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Formanı bağla"
          onClick={close}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          {/* ⚠️ `aria-label` MƏCBURİDİR: filtr panelində də «Kateqoriya» adlı
              seçim var və eyni səhifədədir. Ad olmadan həm ekran oxuyucu, həm
              də e2e seçicisi ikisini ayırd edə bilmir. */}
          <form
            aria-label="Yeni tədbir formu"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* ============================================================
                TƏSNİFAT — scope + category (bizim əlavəmiz, spec-də yoxdur)
                ============================================================ */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">Təsnifat</legend>
              <p className="text-caption text-text-secondary">
                «Təşkilatçı» tədbiri KİMİN elan etdiyini, «kateqoriya» isə NƏ baş
                verdiyini bildirir. İkisi ayrı-ayrı seçilir və tədbir siyahısında
                ayrı filtrlərdir.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Təşkilatçı səviyyəsi</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-input">
                            <SelectValue placeholder="Səviyyə seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_SCOPE_OPTIONS.map((option) => {
                            const meta = EVENT_SCOPE_META[option];
                            const Icon = EVENT_ICONS[meta.icon];
                            return (
                              <SelectItem key={option} value={option}>
                                <span className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" aria-hidden />
                                  {meta.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Məzunlar görüşü MƏHZ burada işarələnir.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kateqoriya</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-input">
                            <SelectValue placeholder="Tədbirin növünü seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENT_CATEGORY_OPTIONS.map((option) => {
                            const meta = EVENT_CATEGORY_META[option];
                            const Icon = EVENT_ICONS[meta.icon];
                            return (
                              <SelectItem key={option} value={option}>
                                <span className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" aria-hidden />
                                  {meta.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>Görüş, səyahət, seminar…</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* scope = FACULTY → fakültə məcburidir */}
              {scope === EventScope.FACULTY ? (
                <FormField
                  control={form.control}
                  name="facultyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fakültə</FormLabel>
                      <Select
                        value={field.value === "" ? NONE_VALUE : field.value}
                        onValueChange={(value) =>
                          field.onChange(value === NONE_VALUE ? "" : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-input">
                            <SelectValue placeholder="Fakültə seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Seçilməyib</SelectItem>
                          {faculties.map((faculty) => (
                            <SelectItem key={faculty.id} value={faculty.id}>
                              {faculty.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {/* scope = CLUB → klub məcburidir */}
              {scope === EventScope.CLUB ? (
                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klub</FormLabel>
                      <Select
                        value={field.value === "" ? NONE_VALUE : field.value}
                        onValueChange={(value) =>
                          field.onChange(value === NONE_VALUE ? "" : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-input">
                            <SelectValue placeholder="Klub seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Seçilməyib</SelectItem>
                          {clubs.map((club) => (
                            <SelectItem key={club.id} value={club.id}>
                              {club.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </fieldset>

            <Separator />

            {/* ============================================================
                spec §14 — 1. ad · 2. təsvir
                ============================================================ */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">Əsas məlumat</legend>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tədbirin adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Məsələn: Buraxılış gecəsi 2027" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Təsvir</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Tədbir nə haqdadır, kimlər üçündür?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ============================================================
                spec §14 — 3. tarix-saat · 7. qeydiyyat son tarixi
                ============================================================ */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">Vaxt</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlama</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bitmə</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>İstəyə bağlı.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="registrationDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qeydiyyat son tarixi</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      Boş buraxsanız qeydiyyat tədbir başlayana qədər açıq qalır.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ============================================================
                spec §14 — 4. məkan · 5. onlayn keçid · 6. iştirakçı limiti
                ============================================================ */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">
                Yer və iştirak
              </legend>

              <FormField
                control={form.control}
                name="isOnline"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">Tədbir onlayn keçirilir</FormLabel>
                      <FormDescription>
                        Onlayn seçilsə keçid ünvanı, əks halda məkan tələb olunur.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {isOnline ? (
                <FormField
                  control={form.control}
                  name="onlineUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onlayn keçid</FormLabel>
                      <FormControl>
                        <Input placeholder="https://meet.example.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Məkan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Məsələn: Xankəndi, QU kampusu, A korpusu, 204"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Ünvanı tam yazın — detal səhifəsində xəritə keçidi yaranır.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İştirakçı limiti</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="Məsələn: 40" {...field} />
                    </FormControl>
                    <FormDescription>
                      Boş buraxsanız limit olmur. Limit dolduqda yeni qeydiyyatlar
                      avtomatik gözləmə siyahısına düşür.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ============================================================
                spec §14 — 8. proqram · 9. əlaqələndirici
                ============================================================ */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">
                Proqram və əlaqə
              </legend>

              <FormField
                control={form.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proqram</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder={"## 14:00 Qeydiyyat\n## 14:30 Açılış\n- Rektorun çıxışı"}
                        className="font-mono text-small"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Markdown dəstəklənir: `##` başlıq, `-` siyahı.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Əlaqələndirici şəxs</FormLabel>
                    <Select
                      value={field.value === "" ? NONE_VALUE : field.value}
                      onValueChange={(value) =>
                        field.onChange(value === NONE_VALUE ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-input">
                          <SelectValue placeholder="Sinif üzvü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Seçilməyib</SelectItem>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sualı olanlar bu şəxsə yazacaq.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ============================================================
                spec §14 — 10. görünürlük səviyyəsi
                ============================================================ */}
            <fieldset className="flex flex-col gap-3" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">Görünürlük</legend>

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <Label className="sr-only">Görünürlük səviyyəsi</Label>
                    <FormControl>
                      <VisibilitySelector
                        name="event-visibility"
                        legend="Tədbirin görünürlük səviyyəsi"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {VISIBILITY_META[visibility].audience}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-caption text-text-secondary">
                «Yalnız mən» seçilsə sinfə dəvət və bildiriş GÖNDƏRİLMİR — tədbiri
                yalnız siz görürsünüz.
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Ləğv et
              </Button>
              <Button type="submit" className="gap-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Yaradılır…
                  </>
                ) : (
                  "Tədbiri elan et"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
