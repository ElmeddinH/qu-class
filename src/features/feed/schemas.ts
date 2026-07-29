// ============================================================================
// src/features/feed/schemas.ts
// Lent formalarının Zod sxemləri — HƏM React Hook Form resolver-i, HƏM də
// server action-larda `parse()` üçün. Vahid mənbə: müştəri və server eyni
// qaydaları tətbiq edir.
//
// ⚠️ TƏLƏ T3: `z.coerce.number()` / `z.coerce.date()` İŞLƏDİLMİR. Coerce
// sxemin GİRİŞ tipini `unknown`-a çevirir və `useForm<z.infer<…>>` sahə tipləri
// dağılır (`field.value` artıq `string` olmur). Buna görə:
//   · tarixlər formada SƏTİR kimi doğrulanır (`isParsableDate`), `Date`-ə
//     çevirmə SERVERDƏ olur — bax `toPostCreateData()` (actions.ts)
//   · ədədlər yalnız `/api/upload` cavabından gəlir (JSON-da onsuz da `number`)
// Nəticədə hər sxemin giriş tipi = çıxış tipi, RHF generikləri sadə qalır.
//
// ⚠️ Enum dəyərləri `@/lib/enums`-dən gəlir (CLAUDE.md §6). Burada `z.enum`
// yenidən qurulur ki, səhv mesajı azərbaycanca olsun — DƏYƏR SİYAHISI
// təkrarlanmır, `*_VALUES` massivi işlədilir.
//
// ⚠️ ORTAQ primitivlər (`isParsableDate`, `emptyToNull`, `optionalText`,
// `optionalUrl`) Blok 7-də `src/lib/form-fields.ts`-ə köçdü — profil və
// karyera formaları da onları işlədir. Burada yalnız YENİDƏN İXRAC olunurlar
// ki, lent komponentlərinin mövcud import yolları dəyişməsin.
// ============================================================================

import { z } from "zod";

import {
  emptyToNull,
  isParsableDate,
  optionalText,
  optionalUrl,
} from "@/lib/form-fields";
import {
  ACHIEVEMENT_CATEGORY_VALUES,
  MEDIA_TYPE_VALUES,
  MEMORY_TYPE_VALUES,
  POST_CATEGORY_VALUES,
  POST_KIND_VALUES,
  PostKind,
  REACTION_TYPE_VALUES,
  REPORT_REASON_VALUES,
  VISIBILITY_VALUES,
  type PostKind as PostKindType,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// Ortaq köməkçilər
// ---------------------------------------------------------------------------

/** Şəkil tələb edən növlər — doğrulama qaydasının VAHİD mənbəyi. */
export const MEDIA_REQUIRED_KINDS: readonly PostKindType[] = [
  PostKind.PHOTO,
  PostKind.ALBUM,
];

export const MAX_MEDIA_PER_POST = 12;
export const MAX_BODY_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 1500;

// Ortaq primitivlər `lib/form-fields.ts`-dədir; lent komponentləri onları
// tarixən buradan import edir, ona görə yenidən ixrac olunurlar.
export { emptyToNull, isParsableDate };

// ---------------------------------------------------------------------------
// Enum sahələri — azərbaycanca mesajlarla
// ---------------------------------------------------------------------------

const postCategoryField = z.enum(POST_CATEGORY_VALUES, {
  errorMap: () => ({ message: "Paylaşım kateqoriyası seçilməlidir." }),
});

const postKindField = z.enum(POST_KIND_VALUES, {
  errorMap: () => ({ message: "Paylaşım növü seçilməlidir." }),
});

const visibilityField = z.enum(VISIBILITY_VALUES, {
  errorMap: () => ({ message: "Görünürlük səviyyəsi seçilməlidir." }),
});

/**
 * ⚠️ TƏLƏ T9: bu, `postCategoryField` DEYİL. `AchievementCategory`
 * (AWARD, STARTUP, PATENT…) `PostCategory` (FIRST_DAY, ORIENTATION…) ilə
 * kəsişməyən ayrı siyahıdır. Birini digərinin yerinə yazsan Zod dəyəri rədd
 * edər, amma səhv mesajı yanlış sahəni göstərər.
 */
const achievementCategoryField = z.enum(ACHIEVEMENT_CATEGORY_VALUES, {
  errorMap: () => ({ message: "Nailiyyət kateqoriyası seçilməlidir." }),
});

const memoryTypeField = z.enum(MEMORY_TYPE_VALUES, {
  errorMap: () => ({ message: "Xatirə növü seçilməlidir." }),
});

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * `/api/upload` cavabı. Ölçü/genişlik `sharp`-dan gəlir, müştəri onları
 * dəyişsə də DB-yə yalnız metadata kimi düşür — təhlükə yaratmır, buna görə
 * sadə `number` yoxlaması kifayətdir. `url` isə serverdə YENİDƏN yoxlanılır
 * (bax `assertUploadPath` — actions.ts).
 */
export const mediaAssetSchema = z.object({
  url: z.string().trim().min(1, "Şəkil ünvanı boşdur."),
  thumbUrl: z.string().trim(),
  type: z.enum(MEDIA_TYPE_VALUES, {
    errorMap: () => ({ message: "Media növü tanınmadı." }),
  }),
  mimeType: z.string().trim().max(120),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: optionalText(300),
  order: z.number().int().nonnegative(),
});

export type MediaAssetInput = z.infer<typeof mediaAssetSchema>;

/**
 * `/api/upload` cavabının forması — altyazı və sıra hələ yoxdur (onları
 * istifadəçi kompozitorda verir). Müştəri cavabı BU sxemlə doğrulayır ki,
 * gözlənilməz forma (məs. sessiya bitəndə gələn HTML) sükutla formaya
 * düşməsin.
 */
export const uploadResponseSchema = mediaAssetSchema.omit({ caption: true, order: true });

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

// ---------------------------------------------------------------------------
// Inline alt formalar
// ---------------------------------------------------------------------------

/**
 * `kind = ACHIEVEMENT` (və ya «Class Achievements-ə əlavə et») üçün inline
 * form. Sahələr BURADA sərbəstdir, MƏCBURİLİK `createPostSchema.superRefine`-də
 * şərtlə tətbiq olunur — əks halda istifadəçi `kind = TEXT` seçəndə də boş
 * nailiyyət sahələri formanı bloklayardı.
 */
export const achievementDetailsSchema = z.object({
  category: achievementCategoryField.optional(),
  title: optionalText(200),
  organization: optionalText(160),
  /** ⚠️ Sxemdə `awardedAt DateTime` — NULLABLE DEYİL, yəni məcburidir. */
  awardedAt: z.string().trim(),
  proofUrl: optionalUrl(),
});

export type AchievementDetailsInput = z.infer<typeof achievementDetailsSchema>;

/** `kind = MEMORY` üçün inline form — məcburilik yenə `superRefine`-dədir. */
export const memoryDetailsSchema = z.object({
  type: memoryTypeField.optional(),
  title: optionalText(200),
  body: z.string().trim().max(4000, "Maksimum 4000 simvol."),
  dedicatedTo: optionalText(160),
});

export type MemoryDetailsInput = z.infer<typeof memoryDetailsSchema>;

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

export const createPostSchema = z
  .object({
    /**
     * ⚠️ Bu, müştərinin göstərdiyi sinifdir və TƏK BAŞINA ETİBARLI DEYİL.
     * `createPost` servis funksiyası viewer-in həmin cohort-da üzvlüyünü
     * DB-dən yenidən yoxlayır (bax post.service.ts).
     */
    cohortId: z.string().trim().min(1, "Sinif müəyyən edilməyib."),
    category: postCategoryField,
    kind: postKindField,
    visibility: visibilityField,
    body: z.string().trim().max(MAX_BODY_LENGTH, `Maksimum ${MAX_BODY_LENGTH} simvol.`),
    /** `<input type="datetime-local">` dəyəri — sətir qalır (T3). */
    occurredAt: z
      .string()
      .trim()
      .min(1, "Tarix seçilməlidir.")
      .refine(isParsableDate, "Tarix düzgün deyil."),
    linkUrl: optionalUrl(),
    linkTitle: optionalText(200),
    linkImage: optionalUrl(),
    referencedEventId: z.string().trim(),
    showOnTimeline: z.boolean(),
    showInAchievements: z.boolean(),
    media: z
      .array(mediaAssetSchema)
      .max(MAX_MEDIA_PER_POST, `Bir paylaşımda maksimum ${MAX_MEDIA_PER_POST} şəkil.`),
    achievement: achievementDetailsSchema,
    memory: memoryDetailsSchema,
  })
  .superRefine((value, ctx) => {
    // --- Mətn ---
    if (value.kind === PostKind.TEXT && value.body.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Paylaşım mətni boş ola bilməz.",
      });
    }

    // --- Şəkil ---
    if (MEDIA_REQUIRED_KINDS.includes(value.kind) && value.media.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media"],
        message: "Ən azı bir şəkil əlavə edin.",
      });
    }

    // --- Keçid ---
    if (value.kind === PostKind.LINK && value.linkUrl === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkUrl"],
        message: "Keçid ünvanı tələb olunur.",
      });
    }

    // --- Tədbir ---
    if (value.kind === PostKind.EVENT && value.referencedEventId === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referencedEventId"],
        message: "Tədbir seçilməlidir.",
      });
    }

    // --- Nailiyyət ---
    // `showInAchievements` işarələnibsə növ TEXT olsa da nailiyyət sətri
    // yaranacaq: `Achievement.title`, `.category`, `.awardedAt` sxemdə
    // nullable DEYİL, yəni bu üç sahə hər iki halda tələb olunur.
    if (value.kind === PostKind.ACHIEVEMENT || value.showInAchievements) {
      if (!value.achievement.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["achievement", "category"],
          message: "Nailiyyət kateqoriyası seçilməlidir.",
        });
      }
      if (value.achievement.title.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["achievement", "title"],
          message: "Nailiyyətin adı ən azı 3 simvol olmalıdır.",
        });
      }
      if (!isParsableDate(value.achievement.awardedAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["achievement", "awardedAt"],
          message: "Nailiyyət tarixi tələb olunur.",
        });
      }
    }

    // --- Xatirə ---
    if (value.kind === PostKind.MEMORY) {
      if (!value.memory.type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["memory", "type"],
          message: "Xatirə növü seçilməlidir.",
        });
      }
      if (value.memory.title.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["memory", "title"],
          message: "Xatirənin başlığı ən azı 3 simvol olmalıdır.",
        });
      }
      if (value.memory.body.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["memory", "body"],
          message: "Xatirə mətni ən azı 10 simvol olmalıdır.",
        });
      }
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ---------------------------------------------------------------------------
// Digər lent əməliyyatları
// ---------------------------------------------------------------------------

export const postIdSchema = z.object({
  postId: z.string().trim().min(1, "Paylaşım tapılmadı."),
});

/**
 * Bayraqları sonradan dəyişmək.
 *
 * ⚠️ TƏLƏ T11: `TimelineEntry.postId` və `Achievement.postId` `@unique`-dir —
 * bir post üçün YALNIZ BİR qeyd. Servis `create` deyil, `upsert` / `deleteMany`
 * işlədir (bax `updatePostSurfaces`).
 */
export const updatePostSurfacesSchema = z.object({
  postId: z.string().trim().min(1, "Paylaşım tapılmadı."),
  showOnTimeline: z.boolean(),
  showInAchievements: z.boolean(),
  achievement: achievementDetailsSchema,
});

export type UpdatePostSurfacesInput = z.infer<typeof updatePostSurfacesSchema>;

export const toggleReactionSchema = z.object({
  postId: z.string().trim().min(1, "Paylaşım tapılmadı."),
  type: z.enum(REACTION_TYPE_VALUES, {
    errorMap: () => ({ message: "Reaksiya növü tanınmadı." }),
  }),
});

export const createCommentSchema = z.object({
  postId: z.string().trim().min(1, "Paylaşım tapılmadı."),
  body: z
    .string()
    .trim()
    .min(1, "Şərh boş ola bilməz.")
    .max(MAX_COMMENT_LENGTH, `Maksimum ${MAX_COMMENT_LENGTH} simvol.`),
  /** Bir səviyyəli cavab — `Comment.parentId`. */
  parentId: z.string().trim(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const deleteCommentSchema = z.object({
  commentId: z.string().trim().min(1, "Şərh tapılmadı."),
});

export const reportPostSchema = z.object({
  postId: z.string().trim().min(1, "Paylaşım tapılmadı."),
  reason: z.enum(REPORT_REASON_VALUES, {
    errorMap: () => ({ message: "Şikayət səbəbi seçilməlidir." }),
  }),
  details: optionalText(1000),
});

export type ReportPostInput = z.infer<typeof reportPostSchema>;
