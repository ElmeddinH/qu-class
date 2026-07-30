"use client";

// ============================================================================
// src/features/memories/MemoryComposer.tsx
// Xatirə yazma / redaktə formu — spec §11.
//
// Sahələr: növ (8) · başlıq · hekayə mətni · kimə həsr olunub · şəkil ·
// tarix · «bu xatirə hansı məkanla bağlıdır?» · görünürlük səviyyəsi ·
// DÖRD AYRICA göstərilmə seçimi (profil / feed / timeline / yearbook).
//
// 🔴 TƏLƏ A — `showInTimeline` `showInFeed`-dən ASILIDIR:
// checkbox `disabled` olur və altında səbəb yazılır. Bu, YALNIZ izahdır —
// əsl qapı `schemas.ts` → `superRefine` (server) və `memory.service.ts`
// (`TIMELINE_REQUIRES_FEED`) qatlarındadır. Səbəb: `TimelineEntry`-də
// Memory-yə FK yoxdur, xatirə xronologiyaya ancaq bağlı Post ilə düşür.
//
// ⚠️ TƏLƏ T7 (Blok 4): `FormItem` / `FormLabel` `FormField`-dən KƏNARDA
// işlədilmir — "useFormField should be used within <FormField>" bütün formu
// runtime-da dağıdır. Sahəsiz başlıqlar üçün adi `<Label>` işlədilir.
//
// ⚠️ TƏLƏ T3: tarix SƏTİRDİR (`<input type="date">`), `Date`-ə çevirmə server
// action-dadır.
//
// ⚠️ CLAUDE.md §1: `variant="secondary"` İŞLƏDİLMİR — KUDS-da ikinci dərəcəli
// düymə `outline`-dır.
// ============================================================================

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { Heart, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
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
import { Visibility } from "@/lib/enums";
import { guideCategoryLabel } from "@/lib/labels";
import { toLocalDateValue } from "@/utils/date";

import { createMemoryAction, updateMemoryAction } from "./actions";
import { MEMORY_ICONS, MEMORY_TYPE_META, MEMORY_TYPE_OPTIONS } from "./catalog";
import {
  createMemorySchema,
  TIMELINE_REQUIRES_FEED_MESSAGE,
  type CreateMemoryInput,
} from "./schemas";
import type { MemoryDraft, MemoryPlaceOption } from "./types";

interface MemoryComposerProps {
  cohortId: string;
  cohortSlug: string;
  /** «Sevimli yer» seçimi — Xankəndi bələdçisinin məkanları (M9 ↔ M3). */
  places: MemoryPlaceOption[];
  /** Doldurulubsa forma REDAKTƏ rejimindədir. */
  draft?: MemoryDraft;
  /** Redaktə dialoqunun bağlanması — siyahı kartından çağırılır. */
  onDone?: () => void;
}

/** Radix Select boş sətir qəbul etmir — "seçilməyib" üçün sentinel. */
const NONE_VALUE = "__none__";

function makeDefaults(cohortId: string, draft?: MemoryDraft): CreateMemoryInput {
  if (draft) {
    return {
      cohortId,
      type: draft.type,
      title: draft.title,
      body: draft.body,
      dedicatedTo: draft.dedicatedTo ?? "",
      imageUrl: draft.imageUrl ?? "",
      occurredAt: draft.occurredAt.slice(0, 10),
      guidePlaceId: draft.guidePlaceId ?? "",
      visibility: draft.visibility,
      showInProfile: draft.showInProfile,
      showInFeed: draft.showInFeed,
      showInTimeline: draft.showInTimeline,
      showInYearbook: draft.showInYearbook,
    };
  }

  return {
    cohortId,
    // Növ QƏSDƏN boşdur: hazır dəyər qoysaq hamı ilk növü göndərər və 8 növ
    // filtri mənasını itirər.
    type: undefined as unknown as CreateMemoryInput["type"],
    title: "",
    body: "",
    dedicatedTo: "",
    imageUrl: "",
    occurredAt: toLocalDateValue(new Date()),
    guidePlaceId: "",
    visibility: Visibility.CLASS,
    showInProfile: true,
    showInFeed: true,
    showInTimeline: false,
    showInYearbook: false,
  };
}

export function MemoryComposer({
  cohortId,
  cohortSlug,
  places,
  draft,
  onDone,
}: MemoryComposerProps) {
  const router = useRouter();
  const isEditing = draft !== undefined;
  const [isOpen, setIsOpen] = useState(isEditing);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const defaults = useMemo(() => makeDefaults(cohortId, draft), [cohortId, draft]);

  // ⚠️ RESOLVER HƏR İKİ REJİMDƏ `createMemorySchema`-dır və bu, qəsdəndir:
  // iki sxem eyni sahələri (+ `refineSurfaces`) yoxlayır, yeganə fərq açar
  // sahədədir (`cohortId` ↔ `memoryId`). Rejimə görə resolver dəyişdirilsəydi
  // `useForm<…>` iki fərqli çıxış tipi arasında qalar və sahə tipləri dağılardı.
  // Redaktədə `memoryId` submit anında əlavə olunur, server isə
  // `updateMemorySchema` ilə yenidən doğrulayır (UI qorumaya sayılmır).
  const form = useForm<CreateMemoryInput>({
    resolver: zodResolver(createMemorySchema),
    defaultValues: defaults,
    mode: "onSubmit",
  });

  const visibility = form.watch("visibility");
  const showInFeed = form.watch("showInFeed");
  const imageUrl = form.watch("imageUrl");

  function close() {
    form.reset(makeDefaults(cohortId, draft));
    setIsOpen(false);
    onDone?.();
  }

  /**
   * `showInFeed` söndürüləndə `showInTimeline` DA söndürülür.
   * Əks halda gizli qalmış `true` dəyər serverə gedib 422 verərdi — istifadəçi
   * isə checkbox-un artıq `disabled` olduğunu görürdü.
   */
  function onFeedChange(next: boolean) {
    form.setValue("showInFeed", next);
    if (!next) form.setValue("showInTimeline", false);
  }

  async function uploadImage(file: File) {
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) {
        const message = await response
          .json()
          .then((data: { error?: string }) => data.error)
          .catch(() => null);
        toast.error(message ?? "Şəkil yüklənmədi.");
        return;
      }

      const data = (await response.json()) as { url?: string };
      if (typeof data.url !== "string") {
        toast.error("Yükləmə cavabı tanınmadı.");
        return;
      }

      form.setValue("imageUrl", data.url);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSubmit(values: CreateMemoryInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateMemoryAction({ ...values, memoryId: draft.id }, cohortSlug)
        : await createMemoryAction(values, cohortSlug);

      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as Path<CreateMemoryInput>, { message });
        }
        toast.error(result.message ?? "Xatirə saxlanmadı.");
        return;
      }

      toast.success(result.message ?? "Xatirə saxlanıldı.");
      close();
      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <Button type="button" className="gap-2" onClick={() => setIsOpen(true)}>
        <Heart className="h-4 w-4" aria-hidden />
        Xatirə yaz
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold text-text-primary">
            {isEditing ? "Xatirəni redaktə et" : "Yeni xatirə"}
          </h2>
          <p className="text-small text-text-secondary">
            Hekayəni sərbəst yaz — bu bölmə lentdən fərqli olaraq uzun mətn üçündür.
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
          {/* ⚠️ `aria-label`: səhifədə filtr panelində də «Növ» seçimi var —
              ad olmadan ekran oxuyucu və e2e seçicisi ikisini ayıra bilmir. */}
          <form
            aria-label="Xatirə formu"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* ================= Növ və başlıq ================= */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">Xatirə</legend>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Növ</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-input">
                          <SelectValue placeholder="Xatirə növünü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEMORY_TYPE_OPTIONS.map((option) => {
                          const meta = MEMORY_TYPE_META[option];
                          const Icon = MEMORY_ICONS[meta.icon];
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
                    <FormDescription>Spec §11-in 8 növündən biri.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlıq</FormLabel>
                    <FormControl>
                      <Input placeholder="Məsələn: İlk gün, birinci mühazirə" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hekayə</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={10}
                        placeholder="Nə baş verdi? Kim vardı? Niyə yadında qaldı?"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uzun yaz — albomda və xatirələr səhifəsində tam mətn göstərilir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dedicatedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kimə həsr olunub</FormLabel>
                    <FormControl>
                      <Input placeholder="Müəllim və ya sinif yoldaşının adı" {...field} />
                    </FormControl>
                    <FormDescription>İstəyə bağlı.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ================= Tarix · məkan · şəkil ================= */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">
                Vaxt, yer və şəkil
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="occurredAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nə vaxt baş verdi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Xatirələr bu tarixə görə sıralanır.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guidePlaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bu xatirə hansı məkanla bağlıdır?</FormLabel>
                      <Select
                        value={field.value === "" ? NONE_VALUE : field.value}
                        onValueChange={(value) =>
                          field.onChange(value === NONE_VALUE ? "" : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-input">
                            <SelectValue placeholder="Məkan seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Məkanla bağlı deyil</SelectItem>
                          {places.map((place) => (
                            <SelectItem key={place.id} value={place.id}>
                              {place.title} · {guideCategoryLabel(place.category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Xankəndi bələdçisindəki məkan — boş buraxıla bilər.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Şəkil — tək fayl. `FormField` daxilində saxlanılır ki, T7-yə
                  düşməyək (label/məsaj `useFormField` tələb edir). */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={() => (
                  <FormItem>
                    <FormLabel htmlFor="memory-image">Şəkil</FormLabel>

                    {imageUrl ? (
                      <div className="flex items-center gap-3">
                        <span className="relative h-20 w-32 shrink-0 overflow-hidden rounded-card border border-border">
                          <Image
                            src={imageUrl}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => form.setValue("imageUrl", "")}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Şəkli sil
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input
                          id="memory-image"
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadImage(file);
                          }}
                        />
                        {isUploading ? (
                          <LoaderCircle
                            className="h-4 w-4 shrink-0 animate-spin text-ku-green"
                            aria-hidden
                          />
                        ) : (
                          <ImagePlus
                            className="h-4 w-4 shrink-0 text-text-secondary"
                            aria-hidden
                          />
                        )}
                      </div>
                    )}

                    <FormDescription>
                      İstəyə bağlı. Kartda geniş formada göstərilir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ================= Görünürlük ================= */}
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
                        name="memory-visibility"
                        legend="Xatirənin görünürlük səviyyəsi"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>{VISIBILITY_META[visibility].audience}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <Separator />

            {/* ================= Dörd göstərilmə seçimi (spec §11) ================= */}
            <fieldset className="flex flex-col gap-4" disabled={isPending}>
              <legend className="text-h4 font-medium text-text-primary">
                Harada göstərilsin
              </legend>
              <p className="text-caption text-text-secondary">
                Bu seçimlər görünürlük SƏVİYYƏSİNDƏN fərqlidir: səviyyə «kim görə
                bilər», bunlar isə «harada görünür» sualına cavab verir.
              </p>

              <FormField
                control={form.control}
                name="showInProfile"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">Profilimdə göstər</FormLabel>
                      <FormDescription>
                        Class Story səhifəndəki «xatirələr» bölməsi.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showInFeed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => onFeedChange(checked === true)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">Sinif lentində paylaş</FormLabel>
                      <FormDescription>
                        Lentdə xatirə paylaşımı yaranır; söndürsən paylaşım silinir.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* 🔴 TƏLƏ A — asılı checkbox */}
              <FormField
                control={form.control}
                name="showInTimeline"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        disabled={!showInFeed}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">Xronologiyada göstər</FormLabel>
                      <FormDescription>
                        {showInFeed
                          ? "Sinif xronologiyasına hadisə kimi düşür."
                          : TIMELINE_REQUIRES_FEED_MESSAGE}
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showInYearbook"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">Albomda (Yearbook) göstər</FormLabel>
                      <FormDescription>
                        Sinfin rəqəmsal albomunda çap üçün seçilir.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </fieldset>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Ləğv et
              </Button>
              <Button type="submit" className="gap-2" disabled={isPending || isUploading}>
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Saxlanılır…
                  </>
                ) : isEditing ? (
                  "Dəyişikliyi saxla"
                ) : (
                  "Xatirəni paylaş"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
