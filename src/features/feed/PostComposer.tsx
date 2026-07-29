"use client";

// ============================================================================
// src/features/feed/PostComposer.tsx
// Paylaşım kompozitoru — 12 kateqoriya, 8 növ, media, görünürlük və iki
// yayılma bayrağı (Timeline / Achievements).
//
// ⚠️ TƏLƏ T3: formada BÜTÜN tarixlər SƏTİRDİR (`datetime-local` / `date`).
// `z.coerce.date()` işlədilsəydi `field.value` tipi `unknown`-a düşərdi və RHF
// sahələri dağılardı. Sətir → `Date` çevirməsi SERVERDƏ olur
// (`features/feed/actions.ts`).
//
// ⚠️ Nailiyyət bloku HƏM `kind = ACHIEVEMENT` seçiləndə, HƏM də «Class
// Achievements-ə əlavə et» işarələnəndə açılır: `Achievement.title`,
// `.category`, `.awardedAt` sxemdə nullable deyil, yəni hər iki halda lazımdır.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Path } from "react-hook-form";
import { LoaderCircle, PenLine, X } from "lucide-react";
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
import { PostKind, Visibility } from "@/lib/enums";

import { createPostAction, revalidateFeedAction } from "./actions";
import {
  ACHIEVEMENT_CATEGORY_META,
  ACHIEVEMENT_CATEGORY_OPTIONS,
  MEMORY_TYPE_META,
  MEMORY_TYPE_OPTIONS,
  POST_CATEGORY_META,
  POST_CATEGORY_OPTIONS,
  POST_KIND_META,
  POST_KIND_OPTIONS,
  FEED_ICONS,
} from "./catalog";
import { shortDate, toLocalDateTimeValue, toLocalDateValue } from "./format";
import { MediaUploader } from "./MediaUploader";
import { createPostSchema, MEDIA_REQUIRED_KINDS, type CreatePostInput } from "./schemas";
import type { FeedEventOption } from "./types";

interface PostComposerProps {
  cohortId: string;
  cohortSlug: string;
  /** `listEvents`-dən gələn seçim siyahısı (`kind = EVENT`). */
  events: FeedEventOption[];
  /** Uğurlu yaradılışdan sonra lentin yenidən çəkilməsi. */
  onCreated?: () => void;
}

function makeDefaults(cohortId: string): CreatePostInput {
  const now = new Date();

  return {
    cohortId,
    // ⚠️ Kateqoriya QƏSDƏN boşdur — spec §6 onu məcburi seçim edir, hazır
    // dəyər qoysaq istifadəçi düşünmədən "Ümumi" göndərər.
    category: undefined as unknown as CreatePostInput["category"],
    kind: PostKind.TEXT,
    visibility: Visibility.CLASS,
    body: "",
    occurredAt: toLocalDateTimeValue(now),
    linkUrl: "",
    linkTitle: "",
    linkImage: "",
    referencedEventId: "",
    showOnTimeline: false,
    showInAchievements: false,
    media: [],
    achievement: {
      category: undefined,
      title: "",
      organization: "",
      awardedAt: toLocalDateValue(now),
      proofUrl: "",
    },
    memory: { type: undefined, title: "", body: "", dedicatedTo: "" },
  };
}

export function PostComposer({
  cohortId,
  cohortSlug,
  events,
  onCreated,
}: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const defaults = useMemo(() => makeDefaults(cohortId), [cohortId]);

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: defaults,
    mode: "onSubmit",
  });

  const kind = form.watch("kind");
  const media = form.watch("media");
  const showInAchievements = form.watch("showInAchievements");
  const visibility = form.watch("visibility");

  const needsAchievement = kind === PostKind.ACHIEVEMENT || showInAchievements;
  const needsMedia = MEDIA_REQUIRED_KINDS.includes(kind);

  function close() {
    form.reset(makeDefaults(cohortId));
    setIsOpen(false);
  }

  function onSubmit(values: CreatePostInput) {
    startTransition(async () => {
      const result = await createPostAction(values);

      if (!result.ok) {
        // Server tərəf sahə səhvlərini `"achievement.title"` açarları ilə
        // qaytarır — RHF eyni nöqtəli yol formasını işlədir.
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as Path<CreatePostInput>, { message });
        }
        toast.error(result.message ?? "Paylaşım göndərilmədi.");
        return;
      }

      await revalidateFeedAction(cohortSlug);
      toast.success("Paylaşımınız lentə əlavə olundu.");
      close();
      onCreated?.();
    });
  }

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-text-secondary"
            onClick={() => setIsOpen(true)}
          >
            <PenLine className="h-4 w-4" aria-hidden />
            Sinifinlə nə paylaşmaq istəyirsən?
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-4">
        <h2 className="text-h4 font-medium text-text-primary">Yeni paylaşım</h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Kompozitoru bağla"
          onClick={close}
          disabled={isPending}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* ---------------- Kateqoriya + növ ---------------- */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kateqoriya</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kateqoriya seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POST_CATEGORY_OPTIONS.map((value) => {
                          const meta = POST_CATEGORY_META[value];
                          const Icon = FEED_ICONS[meta.icon];
                          return (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" aria-hidden />
                                {meta.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>Paylaşımın mövzusu — məcburidir.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Növ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Növ seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POST_KIND_OPTIONS.map((value) => {
                          const meta = POST_KIND_META[value];
                          const Icon = FEED_ICONS[meta.icon];
                          return (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" aria-hidden />
                                {meta.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>{POST_KIND_META[kind].hint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ---------------- Mətn ---------------- */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mətn
                    {kind === PostKind.TEXT ? "" : " (istəyə bağlı)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Nə baş verdi? Sinif yoldaşlarınla bölüş…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ---------------- Media ----------------
                ⚠️ Burada `FormItem` / `FormLabel` İŞLƏDİLMİR: onlar
                `useFormField()` çağırır və o, yalnız `FormField` konteksti
                daxilində işləyir. Media sahəsi RHF-də `setValue` ilə idarə
                olunur, `render` prop-u ilə yox — sadə `Label` kifayətdir. */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="composer-media">
                Şəkillər{needsMedia ? "" : " (istəyə bağlı)"}
              </Label>
              <MediaUploader
                inputId="composer-media"
                value={media}
                disabled={isPending}
                error={form.formState.errors.media?.message}
                onChange={(next) =>
                  form.setValue("media", next, { shouldValidate: form.formState.isSubmitted })
                }
                onCaptionChange={(index, caption) =>
                  form.setValue(`media.${index}.caption`, caption)
                }
              />
            </div>

            {/* ---------------- kind = LINK ---------------- */}
            {kind === PostKind.LINK ? (
              <div className="flex flex-col gap-4 rounded-card border border-border bg-background p-4">
                <h3 className="text-body font-medium text-text-primary">Keçid məlumatı</h3>

                <FormField
                  control={form.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ünvan</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="url" placeholder="https://…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlıq (istəyə bağlı)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Səhifənin adı" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şəkil ünvanı (istəyə bağlı)</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="url" placeholder="https://…" />
                      </FormControl>
                      <FormDescription>
                        Önizləmə avtomatik çəkilmir — ünvanı əl ilə yazın.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {/* ---------------- kind = EVENT ---------------- */}
            {kind === PostKind.EVENT ? (
              <FormField
                control={form.control}
                name="referencedEventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tədbir</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tədbir seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title} · {shortDate(event.startsAt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {events.length === 0
                        ? "Bu sinif üçün hələ tədbir yoxdur."
                        : "Mövcud tədbirlərdən birini seçin."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {/* ---------------- kind = MEMORY ---------------- */}
            {kind === PostKind.MEMORY ? (
              <div className="flex flex-col gap-4 rounded-card border border-border bg-background p-4">
                <h3 className="text-body font-medium text-text-primary">Xatirə</h3>

                <FormField
                  control={form.control}
                  name="memory.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xatirə növü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Növ seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEMORY_TYPE_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {MEMORY_TYPE_META[value].label}
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
                  name="memory.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlıq</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Xatirənin başlığı" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memory.body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mətn</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Xatirənizi yazın…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memory.dedicatedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kimə həsr olunub (istəyə bağlı)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Müəllim və ya sinif yoldaşı" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {/* ---------------- Nailiyyət (kind = ACHIEVEMENT və ya bayraq) ------- */}
            {needsAchievement ? (
              <div className="flex flex-col gap-4 rounded-card border border-border bg-background p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-body font-medium text-text-primary">Nailiyyət</h3>
                  <p className="text-caption text-text-secondary">
                    Nailiyyət «Təsdiq gözləyir» statusu ilə göndərilir.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="achievement.category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nailiyyət kateqoriyası</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Kateqoriya seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACHIEVEMENT_CATEGORY_OPTIONS.map((value) => {
                            const meta = ACHIEVEMENT_CATEGORY_META[value];
                            const Icon = FEED_ICONS[meta.icon];
                            return (
                              <SelectItem key={value} value={value}>
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
                        Paylaşım kateqoriyasından fərqli siyahıdır.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="achievement.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nailiyyətin adı</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Məs. Respublika olimpiadası — I yer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="achievement.organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Təşkilat (istəyə bağlı)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Təşkilatın adı" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="achievement.awardedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tarix</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormDescription>Məcburidir.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="achievement.proofUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sübut keçidi (istəyə bağlı)</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="url" placeholder="https://…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            <Separator />

            {/* ---------------- Görünürlük ---------------- */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görünürlük</FormLabel>
                  <VisibilitySelector
                    name="post-visibility"
                    legend="Paylaşımın görünürlüyü"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  />
                  <FormDescription>{VISIBILITY_META[visibility].audience}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ---------------- Yayılma bayraqları ---------------- */}
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-body font-medium text-text-primary">
                Harada görünsün?
              </legend>

              <FormField
                control={form.control}
                name="showOnTimeline"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="show-on-timeline"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="show-on-timeline" className="cursor-pointer">
                        Class Timeline-a əlavə et
                      </Label>
                      <p className="text-caption text-text-secondary">
                        Xronologiyada eyni görünürlüklə göstərilir.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showInAchievements"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="show-in-achievements"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="show-in-achievements" className="cursor-pointer">
                        Class Achievements-ə əlavə et
                      </Label>
                      <p className="text-caption text-text-secondary">
                        Nailiyyət təsdiq növbəsinə düşür.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </fieldset>

            {/* ---------------- Tarix ---------------- */}
            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hadisə tarixi</FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" className="sm:max-w-xs" />
                  </FormControl>
                  <FormDescription>
                    Keçmiş hadisə paylaşırsınızsa tarixi dəyişin — xronologiyada bu tarix
                    işlədilir.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Ləğv et
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                    Göndərilir…
                  </>
                ) : (
                  "Paylaş"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
