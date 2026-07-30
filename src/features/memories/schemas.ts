// ============================================================================
// src/features/memories/schemas.ts
// Xatirə formasının Zod sxemləri — HƏM React Hook Form resolver-i, HƏM də
// server action-larda `safeParse()` üçün. Vahid mənbə: müştəri və server eyni
// qaydaları tətbiq edir.
//
// 🔴 TƏLƏ A BURADA SERVERDƏ MƏCBUR EDİLİR (`superRefine`):
// `showInTimeline` yalnız `showInFeed` açıq olduqda seçilə bilər. UI checkbox-u
// `disabled` edir, amma UI QORUMA SAYILMIR — server action birbaşa çağırıla
// bilər. Səbəb sxemdədir: `TimelineEntry`-də Memory-yə FK yoxdur, yəni xatirə
// xronologiyaya ANCAQ bağlı Post vasitəsilə düşür (bax `memory.service.ts`
// başlığındaki tam izah).
//
// ⚠️ TƏLƏ T3: `z.coerce.*` İŞLƏDİLMİR. Coerce sxemin GİRİŞ tipini `unknown`-a
// çevirir və `useForm<z.infer<…>>` sahə tipləri dağılır → tarix formada
// SƏTİRDİR, `Date`-ə çevirmə SERVER ACTION-dadır.
//
// ⚠️ Enum dəyərləri `@/lib/enums`-dən gəlir (CLAUDE.md §6): `z.enum` burada
// yenidən qurulur ki, səhv mesajı azərbaycanca olsun, amma DƏYƏR SİYAHISI
// təkrarlanmır.
// ============================================================================

import { z } from "zod";

import { MEMORY_TYPE_VALUES, VISIBILITY_VALUES } from "@/lib/enums";
import { emptyToNull, isParsableDate, optionalText } from "@/lib/form-fields";

export { emptyToNull, isParsableDate };

export const MAX_MEMORY_TITLE = 160;
/** Hekayəvi mətn — lentdəki paylaşımdan uzun ola bilər (spec §11). */
export const MAX_MEMORY_BODY = 6000;
export const MAX_DEDICATED_TO = 160;

/** «Xronologiyaya əlavə etmək üçün…» — UI və server EYNİ mətni göstərir. */
export const TIMELINE_REQUIRES_FEED_MESSAGE =
  "Xronologiyaya əlavə etmək üçün xatirə Feed-də də paylaşılmalıdır.";

const typeField = z.enum(MEMORY_TYPE_VALUES, {
  errorMap: () => ({ message: "Xatirə növü seçilməlidir." }),
});

const visibilityField = z.enum(VISIBILITY_VALUES, {
  errorMap: () => ({ message: "Görünürlük səviyyəsi seçilməlidir." }),
});

/** Dörd göstərilmə seçimi + TRAP A asılılığı — hər iki sxemdə eynidir. */
const surfaceShape = {
  showInProfile: z.boolean(),
  showInFeed: z.boolean(),
  showInTimeline: z.boolean(),
  showInYearbook: z.boolean(),
};

const memoryShape = {
  type: typeField,
  title: z
    .string()
    .trim()
    .min(3, "Başlıq ən azı 3 simvol olmalıdır.")
    .max(MAX_MEMORY_TITLE, `Maksimum ${MAX_MEMORY_TITLE} simvol.`),
  body: z
    .string()
    .trim()
    .min(20, "Xatirə ən azı 20 simvol olmalıdır — bir cümlə kifayət etmir.")
    .max(MAX_MEMORY_BODY, `Maksimum ${MAX_MEMORY_BODY} simvol.`),
  dedicatedTo: optionalText(MAX_DEDICATED_TO),
  /** Yüklənmiş şəklin nisbi ünvanı (`/uploads/...`) — action ayrıca yoxlayır. */
  imageUrl: optionalText(600),
  occurredAt: z
    .string()
    .trim()
    .min(1, "Tarix seçilməlidir.")
    .refine(isParsableDate, "Tarix düzgün deyil."),
  /** Boş sətir = məkan seçilməyib (istəyə bağlı — spec §11 «sevimli yer»). */
  guidePlaceId: z.string().trim(),
  visibility: visibilityField,
  ...surfaceShape,
};

/** 🔴 TƏLƏ A — bir yerdə yazılır, hər iki sxemə tətbiq olunur. */
function refineSurfaces(
  value: { showInFeed: boolean; showInTimeline: boolean },
  ctx: z.RefinementCtx,
): void {
  if (value.showInTimeline && !value.showInFeed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["showInTimeline"],
      message: TIMELINE_REQUIRES_FEED_MESSAGE,
    });
  }
}

export const createMemorySchema = z
  .object({
    /**
     * ⚠️ Müştərinin göstərdiyi sinif TƏK BAŞINA ETİBARLI DEYİL: servis üzvlüyü
     * DB-dən yenidən yoxlayır (`assertMembership`).
     */
    cohortId: z.string().trim().min(1, "Sinif müəyyən edilməyib."),
    ...memoryShape,
  })
  .superRefine(refineSurfaces);

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

export const updateMemorySchema = z
  .object({
    memoryId: z.string().trim().min(1, "Xatirə tapılmadı."),
    ...memoryShape,
  })
  .superRefine(refineSurfaces);

export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;

export const memoryIdSchema = z.object({
  memoryId: z.string().trim().min(1, "Xatirə tapılmadı."),
});
