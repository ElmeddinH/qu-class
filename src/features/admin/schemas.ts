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
  ReportStatusSchema,
  SystemRoleSchema,
} from "@/lib/enums";
import { isParsableDate } from "@/lib/form-fields";

const id = z.string().min(1);

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

export const contentPageSchema = z.object({
  id,
  slug: slugField,
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().trim().min(1, "Gövdə boş ola bilməz.").max(50_000),
  isPublished: z.boolean(),
});

export const faqSchema = z.object({
  id,
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(4000),
  isPublished: z.boolean(),
});

export const guidePlaceSchema = z.object({
  id,
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(4000),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(60).optional(),
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
