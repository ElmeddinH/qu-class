"use client";

// ============================================================================
// src/features/profile/ProfileEditForm.tsx
// `/me/edit` — profil redaktəsi: DƏYƏR və GÖRÜNÜRLÜK BİR formada.
//
// 🔴 BU FORMANIN ƏSAS FİKRİ: istifadəçi "nə yazıram" və "kim görür"
// suallarını AYRI səhifələrdə cavablamamalıdır. Hər sahənin altında inline
// `<VisibilitySelector />` var və hər ikisi TƏK server action ilə, TƏK
// transaksiyada saxlanılır (`updateProfile`).
//
// ⚠️ Bölmələr `PROFILE_FORM_SECTIONS`-dan gəlir, o da `PRIVACY_SECTIONS`-ın
// ÖZÜDÜR — `/me/privacy` ilə eyni qruplaşma zəmanətlidir (sections.ts).
//
// ⚠️ `VisibilitySelector.name` SƏHİFƏDƏ UNİKAL olmalıdır (`visibility-${field}`).
// Eyni ad iki sahədə işlədilsə brauzer radio qruplarını BİRLƏŞDİRİR və bir
// sahəni seçmək digərini sıfırlayır — səssiz, tapılması çətin səhv.
//
// ⚠️ TƏLƏ T3: sxemdə `z.coerce.*` yoxdur, ona görə bütün sahə dəyərləri
// SƏTİRDİR və `field.value` tipləri sadə qalır. `""` → `null` çevirməsi server
// action-dadır.
//
// ⚠️ `phone` / `personalEmail` DEFAULT `PRIVATE`-dir. Forma səviyyələri
// `draft.visibility`-dən (yəni effektiv cari dəyərdən) yükləyir və serverdə
// yalnız DƏYİŞƏNLƏR yazılır (`changedVisibility`) — bio redaktə etmək telefonu
// səssizcə açmır.
// ============================================================================

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, LoaderCircle, Lock } from "lucide-react";
import { toast } from "sonner";

import { VisibilitySelector } from "@/components/shared/VisibilitySelector";
import { VISIBILITY_META } from "@/components/shared/visibility-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FIELD_LABELS } from "@/features/privacy/fields";
import { ClubRole, INDUSTRY_VALUES } from "@/lib/enums";
import { clubRoleLabel, INDUSTRY_LABELS } from "@/lib/labels";
import { profileFieldAnchor } from "@/lib/onboarding";
import { CONTROLLED_PROFILE_FIELDS, type ControlledField } from "@/lib/visibility";
import type {
  ClubCatalogEntry,
  ProfileDraft,
  TagCatalogEntry,
} from "@/services/user.service";

import { updateProfileAction } from "./actions";
import {
  updateProfileSchema,
  type ProfileTagInput,
  type UpdateProfileInput,
} from "./schemas";
import {
  FIELD_HINTS,
  isScalarField,
  PROFILE_FIELD_CONTROLS,
  PROFILE_FORM_SECTIONS,
  STORY_QUESTIONS,
} from "./sections";
import { TagPicker } from "./TagPicker";

interface ProfileEditFormProps {
  userId: string;
  firstName: string;
  lastName: string;
  draft: ProfileDraft;
  tagCatalog: TagCatalogEntry[];
  clubCatalog: ClubCatalogEntry[];
}

/** `null` → `""`: RHF boş input-u `""` kimi saxlayır (bax T3 şərhi). */
function text(value: string | null): string {
  return value ?? "";
}

export function ProfileEditForm({
  userId,
  firstName,
  lastName,
  draft,
  tagCatalog,
  clubCatalog,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName,
      lastName,
      avatarUrl: text(draft.scalars.avatarUrl),
      bio: text(draft.scalars.bio),
      hometown: text(draft.scalars.hometown),
      learningGoals: text(draft.scalars.learningGoals),
      askMeAbout: text(draft.scalars.askMeAbout),
      expectations: text(draft.scalars.expectations),
      phone: text(draft.scalars.phone),
      personalEmail: text(draft.scalars.personalEmail),
      currentCity: text(draft.scalars.currentCity),
      currentCountry: text(draft.scalars.currentCountry),
      currentCompany: text(draft.scalars.currentCompany),
      currentPosition: text(draft.scalars.currentPosition),
      industry: text(draft.scalars.industry),
      futurePlans: text(draft.scalars.futurePlans),
      tags: draft.tags.map((tag) => ({ tagId: tag.tagId, level: tag.level ?? "" })),
      clubIds: draft.clubs.map((club) => club.clubId),
      visibility: draft.visibility,
    },
  });

  /**
   * Klub rəhbərliyi (BOARD / PRESIDENT) formadan ATILA BİLMƏZ — rol klub
   * tərəfindən verilir. Burada checkbox kilidlənir, server tərəfdə isə
   * `diffIdSet(..., keep)` və `role: MEMBER` şərti eyni qaydayı təkrar tətbiq
   * edir (UI-ya güvənilmir).
   */
  const lockedClubIds = useMemo(
    () =>
      new Set(
        draft.clubs.filter((club) => club.role !== ClubRole.MEMBER).map((c) => c.clubId),
      ),
    [draft.clubs],
  );

  const clubRoleById = useMemo(
    () => new Map(draft.clubs.map((club) => [club.clubId, club.role])),
    [draft.clubs],
  );

  const tagsByType = useMemo(() => {
    const map = new Map<string, TagCatalogEntry[]>();
    for (const tag of tagCatalog) {
      const list = map.get(tag.type) ?? [];
      list.push(tag);
      map.set(tag.type, list);
    }
    return map;
  }, [tagCatalog]);

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);

      if (!result.ok) {
        // Sahə səhvləri formada göstərilir (`visibility.bio` kimi iç-içə
        // yollar da RHF üçün etibarlıdır).
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(path as keyof UpdateProfileInput, { message });
        }
        toast.error(result.message ?? "Dəyişiklik saxlanmadı.");
        return;
      }

      toast.success(result.message ?? "Profiliniz yeniləndi.");
      // Formanı SERVERDƏN gələn vəziyyətlə uyğunlaşdırır (ad dəyişibsə header
      // də yenilənir). `reset` göndərilmiş dəyərlərlə çağırılır ki, "dəyişməmiş"
      // vəziyyət düzgün hesablansın.
      form.reset(values);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        {/* --- Kimlik: ad-soyad HƏMİŞƏ görünür, görünürlük seçicisi yoxdur --- */}
        <Card>
          <CardHeader>
            <CardTitle>Kimlik</CardTitle>
            <CardDescription>
              Ad və soyadınız həmişə görünür — platformanın işləməsi üçün minimum
              məlumatdır, ona görə burada görünürlük seçimi yoxdur.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soyad</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* --- 21 idarə olunan sahə, `PRIVACY_SECTIONS` qruplaşması ilə --- */}
        {PROFILE_FORM_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id} className="scroll-mt-24">
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {section.fields.map((field, index) => (
                <div
                  key={field}
                  id={profileFieldAnchor(field)}
                  className="flex scroll-mt-24 flex-col gap-3"
                >
                  {index > 0 ? <Separator /> : null}

                  <div className="flex flex-col gap-1">
                    <p className="text-body font-medium text-text-primary">
                      {STORY_QUESTIONS[field] ?? FIELD_LABELS[field]}
                    </p>
                    {FIELD_HINTS[field] ? (
                      <p className="text-caption text-text-secondary">{FIELD_HINTS[field]}</p>
                    ) : null}
                  </div>

                  {renderControl(field)}

                  <FormField
                    control={form.control}
                    name={`visibility.${field}`}
                    render={({ field: level }) => (
                      <FormItem>
                        <FormControl>
                          <VisibilitySelector
                            // ⚠️ SƏHİFƏDƏ UNİKAL ad — fayl başlığındaki xəbərdarlığa bax.
                            name={`visibility-${field}`}
                            legend={`${FIELD_LABELS[field]} sahəsinin görünürlüyü`}
                            value={level.value}
                            onValueChange={level.onChange}
                            disabled={pending}
                          />
                        </FormControl>
                        <FormDescription>
                          {VISIBILITY_META[level.value].audience}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Yapışqan panel: uzun formada "Yadda saxla" həmişə əlçatandır. */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-md-kuds">
          <p className="text-small text-text-secondary">
            Dəyişiklik yalnız «Yadda saxla»dan sonra qüvvəyə minir.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" type="button">
              <Link href={`/u/${userId}`}>Profilə qayıt</Link>
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
          </div>
        </div>
      </form>
    </Form>
  );

  // -------------------------------------------------------------------------
  // Sahə idarəediciləri — `PROFILE_FIELD_CONTROLS` cədvəlinə görə
  // -------------------------------------------------------------------------

  function renderControl(field: ControlledField) {
    const control = PROFILE_FIELD_CONTROLS[field];

    switch (control.kind) {
      case "story":
        return isScalarField(field) ? (
          <FormField
            control={form.control}
            name={field}
            render={({ field: input }) => (
              <FormItem>
                <FormLabel className="sr-only">{FIELD_LABELS[field]}</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...input} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null;

      case "text":
      case "image":
      case "phone":
      case "email":
        return isScalarField(field) ? (
          <FormField
            control={form.control}
            name={field}
            render={({ field: input }) => (
              <FormItem>
                <FormLabel className="sr-only">{FIELD_LABELS[field]}</FormLabel>
                <FormControl>
                  <Input
                    type={
                      control.kind === "email"
                        ? "email"
                        : control.kind === "phone"
                          ? "tel"
                          : "text"
                    }
                    placeholder={control.kind === "text" ? control.placeholder : undefined}
                    autoComplete={control.kind === "text" ? control.autoComplete : undefined}
                    {...input}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null;

      case "industry":
        return (
          <FormField
            control={form.control}
            name="industry"
            render={({ field: input }) => (
              <FormItem>
                <FormLabel className="sr-only">{FIELD_LABELS.industry}</FormLabel>
                <Select value={input.value} onValueChange={input.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sənaye sahəsi seçin" />
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
        );

      case "tags": {
        const options = tagsByType.get(control.tagType) ?? [];

        return (
          <FormField
            control={form.control}
            name="tags"
            render={({ field: input }) => (
              <FormItem>
                <FormControl>
                  <TagPicker
                    fieldName={field}
                    options={options}
                    value={input.value as ProfileTagInput[]}
                    onChange={input.onChange}
                    withLevel={control.tagType === "LANGUAGE"}
                    disabled={pending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      case "clubs":
        return (
          <FormField
            control={form.control}
            name="clubIds"
            render={({ field: input }) => (
              <FormItem>
                <FormControl>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {clubCatalog.map((club) => {
                      const locked = lockedClubIds.has(club.id);
                      const checked = input.value.includes(club.id);
                      const id = `club-${club.id}`;

                      return (
                        <li key={club.id} className="flex items-start gap-2">
                          <Checkbox
                            id={id}
                            checked={checked}
                            disabled={pending || locked}
                            onCheckedChange={(next) =>
                              input.onChange(
                                next === true
                                  ? [...input.value, club.id]
                                  : input.value.filter((value: string) => value !== club.id),
                              )
                            }
                          />
                          <Label htmlFor={id} className="flex flex-col gap-0.5 font-normal">
                            <span className="text-small text-text-primary">{club.name}</span>
                            {locked ? (
                              <span className="flex items-center gap-1 text-caption text-text-secondary">
                                <Lock className="h-3 w-3" aria-hidden />
                                {clubRoleLabel(clubRoleById.get(club.id) ?? "")} — üzvlüyü
                                klub idarə edir
                              </span>
                            ) : null}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "managed-elsewhere":
        return (
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-border p-3">
            <p className="flex-1 text-small text-text-secondary">
              Bu siyahının qeydləri ayrıca idarə olunur — hər qeydin öz görünürlük
              və statistika seçimi var. Buradaki seçici SİYAHININ BÜTÜNÜNƏ tətbiq
              olunur.
            </p>
            <Button asChild variant="outline" size="sm" type="button">
              <Link href={control.href}>
                {control.cta}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        );
    }
  }
}

/** Formada göstərilən sahə sayı — səhifə başlığındaki izah üçün. */
export const EDITABLE_FIELD_COUNT = CONTROLLED_PROFILE_FIELDS.length;
