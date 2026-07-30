// ============================================================================
// src/features/profile/schemas.ts
// `/me/edit` və `/me/career` formalarının Zod sxemləri — HƏM React Hook Form
// resolver-i, HƏM də server action-larda `safeParse()` üçün. Vahid mənbə:
// müştəri və server EYNİ qaydaları tətbiq edir.
//
// ⚠️ TƏLƏ T3: `z.coerce.*` YOXDUR (səbəbi `lib/form-fields.ts` başlığındadır).
// Tarix və il sahələri SƏTİR kimi doğrulanır, `Date` / `number`-ə çevirmə
// server action-dadır.
//
// ⚠️ Enum DƏYƏRLƏRİ `@/lib/enums`-dən gəlir (CLAUDE.md §6) — burada yalnız
// azərbaycanca səhv mesajı əlavə olunur, siyahı təkrarlanmır.
// ============================================================================

import { z } from "zod";

import {
  DEGREE_VALUES,
  INDUSTRY_VALUES,
  LANGUAGE_LEVEL_VALUES,
  SUPPORT_OFFER_TYPE_VALUES,
  VISIBILITY_VALUES,
} from "@/lib/enums";
import {
  isParsableDate,
  optionalText,
  optionalYearField,
  yearField,
} from "@/lib/form-fields";
import { CONTROLLED_PROFILE_FIELDS, type ControlledField } from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Ortaq sahələr
// ---------------------------------------------------------------------------

export const MAX_STORY_LENGTH = 2000;
export const MAX_TAGS_PER_USER = 30;

const visibilityField = z.enum(VISIBILITY_VALUES, {
  errorMap: () => ({ message: "Görünürlük səviyyəsi seçilməlidir." }),
});

const industryField = z
  .string()
  .trim()
  .refine((v) => v === "" || (INDUSTRY_VALUES as readonly string[]).includes(v), {
    message: "Sənaye sahəsi tanınmadı.",
  });

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} boş ola bilməz.`)
    .max(80, "Maksimum 80 simvol.");

/**
 * Profil şəkli: HƏM `/api/upload` cavabı (`/uploads/…` nisbi yolu), HƏM də
 * xarici ünvan qəbul edilir (istifadəçi hazır şəkil linki yapışdıra bilər —
 * seed artıq profil şəkli yaratmır).
 *
 * ⚠️ `..` açıq şəkildə rədd olunur — `/uploads/../..` kimi yol qaçışı
 * `next/image` və statik server üçün mənasız fayl arayışına çevrilərdi.
 */
const imageField = z
  .string()
  .trim()
  .max(600, "Maksimum 600 simvol.")
  .refine(
    (v) =>
      v === "" ||
      (v.startsWith("/uploads/") && !v.includes("..")) ||
      /^https?:\/\//.test(v),
    { message: "Şəkil ünvanı http(s):// ilə başlamalı və ya yüklənmiş fayl olmalıdır." },
  );

/**
 * Telefon — format MƏCBURİ DEYİL.
 *
 * Beynəlxalq nömrələr (məzunlar xaricdədir) çox formadadır; sərt maska real
 * nömrələri rədd edərdi. Yalnız simvol dəsti və uzunluq yoxlanılır.
 */
const phoneField = z
  .string()
  .trim()
  .max(32, "Maksimum 32 simvol.")
  .refine((v) => v === "" || /^[+()\d\s-]{6,}$/.test(v), {
    message: "Telefon nömrəsi yalnız rəqəm, boşluq, +, -, ( ) simvollarından ibarət olmalıdır.",
  });

const personalEmailField = z
  .string()
  .trim()
  .max(160, "Maksimum 160 simvol.")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "E-poçt ünvanı düzgün deyil.",
  });

/**
 * 22 idarə olunan sahənin HƏR BİRİ üçün səviyyə.
 *
 * Obyekt `CONTROLLED_PROFILE_FIELDS`-dən QURULUR, əl ilə yazılmır: yeni sahə
 * əlavə olunsa forma onu avtomatik tələb edir və unudulmuş sahə səssizcə
 * defolt səviyyədə qalmır.
 */
export const visibilityMapSchema = z.object(
  Object.fromEntries(
    CONTROLLED_PROFILE_FIELDS.map((field) => [field, visibilityField]),
  ) as Record<ControlledField, typeof visibilityField>,
);

/** Seçilmiş taq — `level` yalnız dil taqlarında dolur ("" = səviyyə yoxdur). */
export const profileTagSchema = z.object({
  tagId: z.string().trim().min(1),
  level: z
    .string()
    .trim()
    .refine((v) => v === "" || (LANGUAGE_LEVEL_VALUES as readonly string[]).includes(v), {
      message: "Dil səviyyəsi tanınmadı.",
    }),
});

export type ProfileTagInput = z.infer<typeof profileTagSchema>;

// ---------------------------------------------------------------------------
// /me/edit — profil redaktəsi
// ---------------------------------------------------------------------------

/**
 * Sahələr `PRIVACY_SECTIONS` ilə EYNİ qruplaşmadadır (istifadəçi `/me/edit` və
 * `/me/privacy`-də eyni struktur görür) — qruplaşma `features/profile/sections.ts`
 * -dədir, sxem isə düz siyahıdır ki, RHF sahə adları sadə qalsın
 * (`avatarUrl`, `bio`… → lövbər `#field-bio`).
 */
export const updateProfileSchema = z.object({
  // --- Kimlik (idarə olunan sahə DEYİL — ad-soyad həmişə görünür) ---
  firstName: nameField("Ad"),
  lastName: nameField("Soyad"),

  // --- Əsas ---
  avatarUrl: imageField,
  /** Profil banneri — `avatarUrl` ilə eyni qaydalar (yol qaçışı rədd olunur). */
  coverUrl: imageField,
  bio: optionalText(MAX_STORY_LENGTH),
  hometown: optionalText(120),
  learningGoals: optionalText(MAX_STORY_LENGTH),
  askMeAbout: optionalText(MAX_STORY_LENGTH),
  expectations: optionalText(MAX_STORY_LENGTH),

  // --- Əlaqə ---
  phone: phoneField,
  personalEmail: personalEmailField,
  currentCity: optionalText(120),
  currentCountry: optionalText(120),

  // --- Maraqlar (əlaqə sahələri) ---
  tags: z
    .array(profileTagSchema)
    .max(MAX_TAGS_PER_USER, `Maksimum ${MAX_TAGS_PER_USER} seçim.`),
  clubIds: z.array(z.string().trim().min(1)),

  // --- Karyera ---
  currentCompany: optionalText(160),
  currentPosition: optionalText(160),
  industry: industryField,
  futurePlans: optionalText(MAX_STORY_LENGTH),

  // --- Görünürlük (dəyər ilə BİR formada) ---
  visibility: visibilityMapSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---------------------------------------------------------------------------
// /me/career — karyera qeydi
// ---------------------------------------------------------------------------

export const careerEntrySchema = z
  .object({
    /** `""` → yeni qeyd. Dolu olsa sahiblik SERVERDƏ yoxlanılır. */
    entryId: z.string().trim(),
    company: z.string().trim().min(1, "Şirkət adı tələb olunur.").max(160, "Maksimum 160 simvol."),
    position: z.string().trim().min(1, "Vəzifə tələb olunur.").max(160, "Maksimum 160 simvol."),
    industry: industryField,
    city: optionalText(120),
    country: optionalText(120),
    /** `<input type="date">` dəyəri — sətir qalır (T3). */
    startDate: z
      .string()
      .trim()
      .min(1, "Başlama tarixi tələb olunur.")
      .refine(isParsableDate, "Tarix düzgün deyil."),
    endDate: z
      .string()
      .trim()
      .refine((v) => v === "" || isParsableDate(v), "Tarix düzgün deyil."),
    isCurrent: z.boolean(),
    description: optionalText(1000),
    /** (1) RAZILIQ — kim görə bilər. */
    visibility: visibilityField,
    /** (2) RAZILIQ — aqreqasiyaya daxil olsun. (1)-dən MÜSTƏQİLDİR. */
    includeInStats: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isCurrent && value.endDate === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Bitmə tarixini yazın və ya «hazırda işləyirəm» seçin.",
      });
    }

    if (value.isCurrent && value.endDate !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "«Hazırda işləyirəm» seçilibsə bitmə tarixi boş olmalıdır.",
      });
    }

    if (
      value.endDate !== "" &&
      isParsableDate(value.startDate) &&
      isParsableDate(value.endDate) &&
      new Date(value.endDate) < new Date(value.startDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Bitmə tarixi başlama tarixindən əvvəl ola bilməz.",
      });
    }
  });

export type CareerEntryFormInput = z.infer<typeof careerEntrySchema>;

// ---------------------------------------------------------------------------
// /me/career — təhsil qeydi
// ---------------------------------------------------------------------------

const degreeField = z.enum(DEGREE_VALUES, {
  errorMap: () => ({ message: "Dərəcə seçilməlidir." }),
});

export const educationEntrySchema = z
  .object({
    entryId: z.string().trim(),
    institution: z
      .string()
      .trim()
      .min(1, "Müəssisə adı tələb olunur.")
      .max(200, "Maksimum 200 simvol."),
    degree: degreeField,
    field: optionalText(160),
    country: optionalText(120),
    /** `Int` sütunu — sətir kimi doğrulanır, çevirmə action-dadır (T3). */
    startYear: yearField(),
    endYear: optionalYearField(),
    isCurrent: z.boolean(),
    visibility: visibilityField,
    includeInStats: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.isCurrent && value.endYear === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endYear"],
        message: "Bitmə ilini yazın və ya «davam edir» seçin.",
      });
    }

    if (value.isCurrent && value.endYear !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endYear"],
        message: "«Davam edir» seçilibsə bitmə ili boş olmalıdır.",
      });
    }

    if (
      value.endYear !== "" &&
      Number.parseInt(value.endYear, 10) < Number.parseInt(value.startYear, 10)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endYear"],
        message: "Bitmə ili başlama ilindən əvvəl ola bilməz.",
      });
    }
  });

export type EducationEntryFormInput = z.infer<typeof educationEntrySchema>;

// ---------------------------------------------------------------------------
// /me/career — dəstək təklifləri (ÜÇÜNCÜ razılıq)
// ---------------------------------------------------------------------------

const supportOfferTypeField = z.enum(SUPPORT_OFFER_TYPE_VALUES, {
  errorMap: () => ({ message: "Dəstək növü tanınmadı." }),
});

/**
 * 7 növün HAMISI formada sətir kimi göndərilir (`selected` bayrağı ilə) —
 * yalnız seçilənlər deyil. Səbəb: qeyd mətni (`note`) işarə götürülüb yenidən
 * qoyulanda itməsin deyə formada saxlanılır.
 */
export const supportSettingsSchema = z.object({
  /** (3) RAZILIQ — bayraq sönülüdürsə təkliflər HEÇ YERDƏ görünmür. */
  openToSupport: z.boolean(),
  offers: z.array(
    z.object({
      type: supportOfferTypeField,
      selected: z.boolean(),
      note: optionalText(300),
    }),
  ),
});

export type SupportSettingsFormInput = z.infer<typeof supportSettingsSchema>;

// ---------------------------------------------------------------------------
// Silmə
// ---------------------------------------------------------------------------

export const entryIdSchema = z.object({
  entryId: z.string().trim().min(1, "Qeyd tapılmadı."),
});
