// ============================================================================
// src/features/accessibility/schemas.ts
// Əlçatanlıq maneəsi formasının doğrulaması — SAF (React / Prisma yoxdur).
//
// ⚠️ Mesajlar AZƏRBAYCANCADIR (CLAUDE.md §9): Zod-un default ingiliscə
// mətnləri istifadəçiyə çatmamalıdır.
//
// ⚠️ `pagePath` sayt daxilində MÜTLƏQ yol olmalıdır. Yoxlama yalnız forma
// gigiyenası deyil — dəyər `Report.entityId`-yə düşür və moderasiya növbəsində
// (Blok 11B) LİNK kimi göstəriləcək. Xarici ünvana icazə versək növbədən açıq
// yönləndirmə (open redirect) səthi yaranardı.
// ============================================================================

import { z } from "zod";

export const BARRIER_DETAILS_MIN = 20;
export const BARRIER_DETAILS_MAX = 2000;

/** `/khankendi/gpl-01` — sayt daxili yol; `//host` XARİCİ ünvandır. */
export const pagePathSchema = z
  .string()
  .trim()
  .min(1, "Səhifə ünvanı tələb olunur")
  .max(500, "Ünvan çox uzundur")
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Ünvan sayt daxilində olmalıdır (məsələn: /khankendi)",
  });

export const barrierReportSchema = z.object({
  pagePath: pagePathSchema,
  details: z
    .string()
    .trim()
    .min(BARRIER_DETAILS_MIN, `Ən azı ${BARRIER_DETAILS_MIN} simvol yazın`)
    .max(BARRIER_DETAILS_MAX, `Ən çox ${BARRIER_DETAILS_MAX} simvol`),
});

export type BarrierReportInput = z.infer<typeof barrierReportSchema>;
