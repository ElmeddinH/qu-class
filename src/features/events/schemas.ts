// ============================================================================
// src/features/events/schemas.ts
// Tədbir formalarının Zod sxemləri — HƏM React Hook Form resolver-i, HƏM də
// server action-larda `safeParse()` üçün. Vahid mənbə: müştəri və server eyni
// qaydaları tətbiq edir.
//
// ⚠️ TƏLƏ T3: `z.coerce.*` İŞLƏDİLMİR. Coerce sxemin GİRİŞ tipini `unknown`-a
// çevirir və `useForm<z.infer<…>>` sahə tipləri dağılır. Buna görə:
//   · tarixlər formada SƏTİRDİR (`datetime-local`), `Date`-ə çevirmə
//     SERVER ACTION-da olur (`actions.ts` → `toCreateEventData`)
//   · tutum (`capacity`) da SƏTİRDİR, `Number`-ə çevirmə action-da
//
// ⚠️ Enum dəyərləri `@/lib/enums`-dən gəlir (CLAUDE.md §6): burada `z.enum`
// yenidən qurulur ki, səhv mesajı azərbaycanca olsun, amma DƏYƏR SİYAHISI
// təkrarlanmır.
// ============================================================================

import { z } from "zod";

import {
  emptyToNull,
  isParsableDate,
  optionalText,
  optionalUrl,
} from "@/lib/form-fields";
import {
  EVENT_CATEGORY_VALUES,
  EVENT_SCOPE_VALUES,
  EventScope,
  RSVP_STATUS_VALUES,
  VISIBILITY_VALUES,
} from "@/lib/enums";
import { MAX_EVENT_RATING, MIN_EVENT_RATING, RSVP_INTENT_VALUES } from "@/lib/rsvp";

export { emptyToNull, isParsableDate };

export const MAX_EVENT_TITLE = 160;
export const MAX_EVENT_DESCRIPTION = 3000;
/** Markdown proqram — spec §14 sahə 8. */
export const MAX_EVENT_AGENDA = 6000;
export const MAX_EVENT_LOCATION = 300;
/** Bir albomdakı maksimum şəkil (lentdəki `MAX_MEDIA_PER_POST` ilə eyni ruhda). */
export const MAX_EVENT_PHOTOS = 30;
export const MAX_CAPACITY = 100_000;

// ---------------------------------------------------------------------------
// Enum sahələri
// ---------------------------------------------------------------------------

const scopeField = z.enum(EVENT_SCOPE_VALUES, {
  errorMap: () => ({ message: "Təşkilatçı səviyyəsi seçilməlidir." }),
});

const categoryField = z.enum(EVENT_CATEGORY_VALUES, {
  errorMap: () => ({ message: "Tədbir kateqoriyası seçilməlidir." }),
});

const visibilityField = z.enum(VISIBILITY_VALUES, {
  errorMap: () => ({ message: "Görünürlük səviyyəsi seçilməlidir." }),
});

/** Boş sətir = «limit yoxdur». Rəqəm olarsa müsbət tam ədəd olmalıdır. */
function isCapacityString(value: string): boolean {
  if (value.trim() === "") return true;
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number.parseInt(value, 10);
  return parsed >= 1 && parsed <= MAX_CAPACITY;
}

// ---------------------------------------------------------------------------
// createEvent — spec §14-ün 10 sahəsi + bizim 3 əlavəmiz
// ---------------------------------------------------------------------------

/**
 * Tədbirin SAHƏLƏRİ — çarpaz qaydalar (`eventContentRules`) HƏLƏ tətbiq
 * olunmadan.
 *
 * 🔴 NİYƏ AYRICA İXRAC OLUNUR (Blok 14C, `features/feed/schemas.ts` →
 * `createPostFields` ilə EYNİ SƏBƏB): `/api/v1` gövdə sxemləri eyni sahələri
 * işlədir, amma `cohortId` ONDA YOXDUR (sinif YOLDAN gəlir) və `PATCH` gövdəsi
 * `.partial()`-dır. `ZodEffects`-in `.omit()` / `.partial()` metodu YOXDUR,
 * ona görə effektsiz OBYEKT ayrıca lazımdır.
 */
export const createEventFields = z
  .object({
    /**
     * ⚠️ Müştərinin göstərdiyi sinif TƏK BAŞINA ETİBARLI DEYİL: servis
     * `EVENT_MANAGER_ROLES` rolunu DB-dən yenidən yoxlayır.
     */
    cohortId: z.string().trim().min(1, "Sinif müəyyən edilməyib."),

    // --- spec §14, 10 sahə ---
    // 1. ad
    title: z
      .string()
      .trim()
      .min(3, "Tədbirin adı ən azı 3 simvol olmalıdır.")
      .max(MAX_EVENT_TITLE, `Maksimum ${MAX_EVENT_TITLE} simvol.`),
    // 2. təsvir
    description: optionalText(MAX_EVENT_DESCRIPTION),
    // 3. tarix-saat (başlama / bitmə)
    startsAt: z
      .string()
      .trim()
      .min(1, "Başlama tarixi seçilməlidir.")
      .refine(isParsableDate, "Başlama tarixi düzgün deyil."),
    endsAt: z
      .string()
      .trim()
      .refine((v) => v === "" || isParsableDate(v), "Bitmə tarixi düzgün deyil."),
    // 4. məkan
    location: optionalText(MAX_EVENT_LOCATION),
    // 5. onlayn keçid
    onlineUrl: optionalUrl(),
    isOnline: z.boolean(),
    // 6. iştirakçı limiti
    capacity: z
      .string()
      .trim()
      .refine(isCapacityString, `Limit 1—${MAX_CAPACITY} aralığında tam ədəd olmalıdır.`),
    // 7. qeydiyyat son tarixi
    registrationDeadline: z
      .string()
      .trim()
      .refine((v) => v === "" || isParsableDate(v), "Son tarix düzgün deyil."),
    // 8. proqram (markdown)
    agenda: optionalText(MAX_EVENT_AGENDA),
    // 9. əlaqələndirici şəxs
    contactId: z.string().trim(),
    // 10. görünürlük səviyyəsi
    visibility: visibilityField,

    // --- bizim əlavələrimiz (spec-də yoxdur, filtrlər üçün) ---
    scope: scopeField,
    category: categoryField,
    facultyId: z.string().trim(),
    clubId: z.string().trim(),

    coverUrl: optionalUrl(),
  });

/**
 * Doğrulanmış tədbir sahələri — `cohortId` DAXİL DEYİL.
 *
 * ⚠️ Tip `cohortId`-siz qurulub: çarpaz qaydalar onu OXUMUR, ona görə həm
 * forma girişi (cohortId VAR), həm də API gövdəsi (cohortId YOX) eyni
 * funksiyaya verilə bilir (`postContentRules` ilə eyni nümunə).
 */
export type EventFieldsInput = Omit<z.infer<typeof createEventFields>, "cohortId">;

/** Tədbirin ÇARPAZ sahə qaydaları — forma da, API da EYNİ funksiyanı işlədir. */
export const eventContentRules = (value: EventFieldsInput, ctx: z.RefinementCtx) => {
  // --- Bitmə tarixi başlamadan sonra olmalıdır ---
  if (value.endsAt !== "" && isParsableDate(value.startsAt) && isParsableDate(value.endsAt)) {
    if (new Date(value.endsAt).getTime() <= new Date(value.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Bitmə vaxtı başlama vaxtından sonra olmalıdır.",
      });
    }
  }

  // --- Qeydiyyat son tarixi tədbirdən əvvəl olmalıdır ---
  if (
    value.registrationDeadline !== "" &&
    isParsableDate(value.startsAt) &&
    isParsableDate(value.registrationDeadline)
  ) {
    if (
      new Date(value.registrationDeadline).getTime() > new Date(value.startsAt).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Qeydiyyat son tarixi tədbirin başlamasından sonra ola bilməz.",
      });
    }
  }

  // --- Onlayn tədbirin keçidi olmalıdır ---
  if (value.isOnline && value.onlineUrl === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["onlineUrl"],
      message: "Onlayn tədbir üçün keçid ünvanı tələb olunur.",
    });
  }

  // --- Üzbəüz tədbirin məkanı olmalıdır ---
  if (!value.isOnline && value.location === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["location"],
      message: "Üzbəüz tədbir üçün məkan yazılmalıdır.",
    });
  }

  // --- scope = FACULTY → fakültə məcburidir ---
  // ⚠️ Bu, sxemdəki `facultyId String?` ilə ziddiyyət deyil: sütun nullable-dır,
  // çünki digər dörd səviyyədə fakültə YOXDUR. Məcburilik yalnız bu şaxədədir.
  if (value.scope === EventScope.FACULTY && value.facultyId === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["facultyId"],
      message: "Fakültə səviyyəli tədbir üçün fakültə seçilməlidir.",
    });
  }

  // --- scope = CLUB → klub məcburidir ---
  if (value.scope === EventScope.CLUB && value.clubId === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clubId"],
      message: "Klub səviyyəli tədbir üçün klub seçilməlidir.",
    });
  }
};

export const createEventSchema = createEventFields.superRefine(eventContentRules);

export type CreateEventInput = z.infer<typeof createEventSchema>;

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

export const rsvpSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  intent: z.enum(RSVP_INTENT_VALUES, {
    errorMap: () => ({ message: "Əməliyyat tanınmadı." }),
  }),
});

// ---------------------------------------------------------------------------
// Rəy sorğusu — 1-5 ulduz + mətn
// ---------------------------------------------------------------------------

export const eventFeedbackSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  rating: z
    .number()
    .int()
    .min(MIN_EVENT_RATING, "Qiymət 1—5 aralığında olmalıdır.")
    .max(MAX_EVENT_RATING, "Qiymət 1—5 aralığında olmalıdır."),
  feedback: optionalText(2000),
});

export type EventFeedbackInput = z.infer<typeof eventFeedbackSchema>;

// ---------------------------------------------------------------------------
// Koordinator paneli
// ---------------------------------------------------------------------------

export const eventIdSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
});

export const attendeeActionSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  userId: z.string().trim().min(1, "İştirakçı tapılmadı."),
});

export const checkInSchema = attendeeActionSchema.extend({
  attended: z.boolean(),
});

export const bulkNotifySchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  /** Ən azı bir status seçilməlidir — boş siyahı heç kimə göndərməzdi. */
  statuses: z
    .array(z.enum(RSVP_STATUS_VALUES))
    .min(1, "Ən azı bir alıcı qrupu seçin."),
  title: z
    .string()
    .trim()
    .min(3, "Başlıq ən azı 3 simvol olmalıdır.")
    .max(160, "Maksimum 160 simvol."),
  body: z
    .string()
    .trim()
    .min(3, "Mesaj ən azı 3 simvol olmalıdır.")
    .max(1000, "Maksimum 1000 simvol."),
});

export type BulkNotifyInput = z.infer<typeof bulkNotifySchema>;

export const completeEventSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  summary: optionalText(3000),
});

// ---------------------------------------------------------------------------
// Foto albom
// ---------------------------------------------------------------------------

/** `/api/upload` cavabı — lentdəki `uploadResponseSchema` ilə eyni forma. */
export const eventPhotoSchema = z.object({
  url: z.string().trim().min(1, "Şəkil ünvanı boşdur."),
  thumbUrl: z.string().trim(),
  mimeType: z.string().trim().max(120),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: optionalText(300),
});

export type EventPhotoFormInput = z.infer<typeof eventPhotoSchema>;

export const addEventPhotosSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  photos: z
    .array(eventPhotoSchema)
    .min(1, "Ən azı bir şəkil seçin.")
    .max(MAX_EVENT_PHOTOS, `Bir dəfəyə maksimum ${MAX_EVENT_PHOTOS} şəkil.`),
});

export const removeEventPhotoSchema = z.object({
  eventId: z.string().trim().min(1, "Tədbir tapılmadı."),
  mediaId: z.string().trim().min(1, "Şəkil tapılmadı."),
});
