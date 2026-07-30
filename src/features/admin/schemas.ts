// ============================================================================
// src/features/admin/schemas.ts
// Admin server action-larının giriş sxemləri (Zod).
//
// ⚠️ Sxem İCAZƏ YOXLAMIR — o, servisdədir (`assertFreshAdmin`). Buradakı iş
// yalnız FORMANIN doğruluğudur. İkisini qarışdırmaq təhlükəlidir: sxem
// keçdiyi üçün əməliyyatın icazəli olduğunu düşünən kod yazıla bilər.
//
// ⚠️ Enum dəyərləri `lib/enums.ts`-dən gəlir — sətir literal yazılmır
// (CLAUDE.md §6).
// ============================================================================

import { z } from "zod";

import {
  CohortRoleSchema,
  ContentSectionSchema,
  FaqCategorySchema,
  GuideCategorySchema,
  ReportStatusSchema,
  SystemRoleSchema,
} from "@/lib/enums";
import { isParsableDate } from "@/lib/form-fields";

const id = z.string().min(1);

/**
 * Sıralama nömrəsi — forma SƏTİR göndərir (TƏLƏ T3: `z.coerce` RHF sahə
 * tipini sındırır), ədədə çevirmə server action-dadır.
 */
const orderField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{1,4}$/.test(value), {
    message: "Sıra nömrəsi 0-9999 aralığında tam ədəd olmalıdır.",
  });

/** Boş ola bilən onluq ədəd sahəsi — sətir kimi doğrulanır (TƏLƏ T3). */
function optionalNumericField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === "") return true;
        if (!/^-?\d+(\.\d+)?$/.test(value)) return false;
        const parsed = Number(value);
        return parsed >= min && parsed <= max;
      },
      { message },
    );
}

// ---------------------------------------------------------------------------
// Moderasiya
// ---------------------------------------------------------------------------

export const reviewReportSchema = z.object({ reportId: id });

/**
 * Şikayət qərarı.
 *
 * ⚠️ `resolution`-un MƏCBURİLİYİ qərardan asılıdır və `superRefine` ilə
 * ifadə olunur: `RESOLVED` / `REJECTED` üçün səbəb yazılmalıdır, `IN_REVIEW`
 * üçün yox. Servis eyni qaydanı TƏKRAR yoxlayır (action birbaşa çağırıla bilər).
 */
export const decideReportSchema = z
  .object({
    reportId: id,
    decision: ReportStatusSchema.extract(["IN_REVIEW", "RESOLVED", "REJECTED"]),
    resolution: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision !== "IN_REVIEW" && (value.resolution ?? "").length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: "Qərarın səbəbini yazın (ən azı 3 simvol).",
      });
    }
  });

export const hideContentSchema = z.object({ reportId: id });

/**
 * Toplu qərar.
 *
 * ⚠️ `superRefine` qaydası `decideReportSchema` ilə EYNİDİR: bağlayan qərar
 * (`RESOLVED` / `REJECTED`) səbəbsiz verilə bilməz. Toplu yol fərdi yoldan
 * zəif ola bilməz — moderasiyada ən çox istifadə olunan məhz odur.
 *
 * ⚠️ Yuxarı hədd servisdə də yoxlanılır (`BULK_DECISION_LIMIT`); burada
 * yalnız formanın erkən xəbərdarlığıdır.
 */
export const bulkDecideSchema = z
  .object({
    reportIds: z.array(id).min(1, "Ən azı bir şikayət seçin.").max(100),
    decision: ReportStatusSchema.extract(["IN_REVIEW", "RESOLVED", "REJECTED"]),
    resolution: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision !== "IN_REVIEW" && (value.resolution ?? "").length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: "Qərarın səbəbini yazın (ən azı 3 simvol).",
      });
    }
  });

// ---------------------------------------------------------------------------
// İstifadəçi və rollar
// ---------------------------------------------------------------------------

export const systemRoleSchema = z.object({
  targetId: id,
  nextRole: SystemRoleSchema,
});

export const cohortRoleSchema = z.object({
  targetId: id,
  cohortId: id,
  nextRole: CohortRoleSchema,
});

export const activationSchema = z.object({
  targetId: id,
  deactivate: z.boolean(),
});

// ---------------------------------------------------------------------------
// Cohort
// ---------------------------------------------------------------------------

const dateField = z
  .string()
  .min(1, "Tarix seçin")
  .refine(isParsableDate, "Tarix düzgün deyil");

export const createCohortSchema = z
  .object({
    programId: id,
    admissionYear: z.coerce.number().int().min(2000).max(2100),
    graduationYear: z.coerce.number().int().min(2000).max(2100),
    academicStartsAt: dateField,
    graduatesAt: dateField,
    welcomeMessage: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.graduationYear > value.admissionYear, {
    path: ["graduationYear"],
    message: "Məzuniyyət ili qəbul ilindən böyük olmalıdır.",
  });

export const updateCohortSchema = z.object({
  cohortId: id,
  displayName: z.string().trim().min(3).max(120),
  coverUrl: z.string().trim().url().or(z.literal("")).optional(),
  welcomeMessage: z.string().trim().max(1000).optional(),
  academicStartsAt: dateField,
  graduatesAt: dateField,
});

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------

/** Slug: kiçik hərf, rəqəm və defis — ünvanın bir hissəsidir. */
const slugField = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug yalnız kiçik latın hərfi, rəqəm və defis ola bilər.");

/**
 * 🔴 SAHƏLƏR BİR DƏFƏ TƏYİN OLUNUR, redaktə və YARATMA onları PAYLAŞIR.
 *
 * İki ayrı sxem saxlansaydı biri sərtləşəndə digəri köhnə qalardı — yaratma
 * yolu redaktədən ZƏİF olardı və eyni sahə iki fərqli qaydadan keçərdi.
 * Fərq yalnız açar dəstidir: redaktə `id` tələb edir, yaratma `section` /
 * `category` / `order` kimi ilk dəfə təyin olunan sahələri.
 *
 * ⚠️ Yaratma sxemində `slug` YOXDUR — o, başlıqdan DETERMİNİSTİK qurulur
 * (`lib/slugify.ts`), yəni admin iki dəfə eyni səhifə yaratsa unikal indeks
 * bunu tutur (`P2002` → azərbaycanca mesaj). Redaktədə isə slug dəyişdirilə
 * bilir (kilidli olmayan səhifələrdə) — ünvan artıq mövcuddur.
 */
const contentPageFields = {
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().trim().min(1, "Gövdə boş ola bilməz.").max(50_000),
  isPublished: z.boolean(),
};

export const contentPageSchema = z.object({
  id,
  slug: slugField,
  ...contentPageFields,
});

export const createContentPageSchema = z.object({
  ...contentPageFields,
  section: ContentSectionSchema,
  order: orderField,
});

const faqFields = {
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(4000),
  isPublished: z.boolean(),
};

export const faqSchema = z.object({ id, ...faqFields });

export const createFaqSchema = z.object({
  ...faqFields,
  category: FaqCategorySchema,
  order: orderField,
});

const guidePlaceFields = {
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(4000),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(60).optional(),
};

export const guidePlaceSchema = z.object({ id, ...guidePlaceFields });

/**
 * ⚠️ Koordinat SƏTİR kimi doğrulanır (TƏLƏ T3 — `z.coerce` RHF-i sındırır).
 * Ədədə çevirmə server action-dadır; boş sətir «koordinat yoxdur» deməkdir.
 * Aralıqlar real: enlik [-90, 90], uzunluq [-180, 180].
 */
const latitudeField = optionalNumericField(-90, 90, "Enlik -90 ilə 90 arasında olmalıdır.");
const longitudeField = optionalNumericField(
  -180,
  180,
  "Uzunluq -180 ilə 180 arasında olmalıdır.",
);

export const createGuidePlaceSchema = z.object({
  ...guidePlaceFields,
  category: GuideCategorySchema,
  latitude: latitudeField,
  longitude: longitudeField,
  isEmergency: z.boolean(),
  order: orderField,
});

// ---------------------------------------------------------------------------
// SIS importu
// ---------------------------------------------------------------------------

export const importPreviewSchema = z.object({
  csv: z.string().min(1, "Fayl boşdur."),
});

export const importCommitSchema = z.object({
  csv: z.string().min(1),
  token: z.string().min(1),
});

/** Nailiyyət qərarı — Blok 8-in action-ları TƏKRAR İŞLƏDİLİR, bu yalnız formadır. */
export const achievementDecisionSchema = z.object({
  achievementId: id,
  note: z.string().trim().max(500).optional(),
});
