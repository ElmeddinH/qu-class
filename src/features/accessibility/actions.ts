"use server";

// ============================================================================
// src/features/accessibility/actions.ts
// Əlçatanlıq maneəsi bildirişi — Server Action.
//
// 🔴 `requireUser()` — GİRİŞ TƏLƏB OLUNUR VƏ SƏBƏBİ STATE.md-DƏDİR.
// `Report.reporterId` sxemdə MƏCBURİDİR (`String`, nullable deyil). İki yol var
// idi:
//   (a) `reporterId`-ni nullable etmək → miqrasiya + `Report`-un bütün
//       oxu tərəfini (moderasiya növbəsi, audit) "müəllif ola bilər/olmaya
//       bilər" halına açmaq;
//   (b) anonim ziyarətçiyə formanı GİRİŞ ÇAĞIRIŞI ilə göstərmək.
// (b) seçildi: maneə bildirişi nadir hadisədir, anonim axın isə moderasiya
// növbəsinə spam qapısı açır və heç bir cavab kanalı vermir (kimə yazaq?).
// Bəyanatın özü ANONİMƏ TAM AÇIQDIR və alternativ kanal (e-poçt) göstərilir —
// yəni WCAG-ın "əlaqə yolu olsun" tələbi ödənilir.
//
// ⚠️ `prisma` BURADA YOXDUR — DB girişi `services/report.service.ts`-dədir.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createAccessibilityReport } from "@/services/report.service";

import { barrierReportSchema } from "./schemas";

export interface BarrierReportResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_ERROR = "Bildiriş göndərilmədi. Bir azdan yenidən cəhd edin.";

export async function submitBarrierReportAction(input: {
  pagePath: string;
  details: string;
}): Promise<BarrierReportResult> {
  try {
    const viewer = await requireUser();

    const parsed = barrierReportSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".");
        if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
      }
      return { ok: false, fieldErrors, message: "Formada səhv var." };
    }

    await createAccessibilityReport(viewer, parsed.data);

    // Moderasiya növbəsi (Blok 11B) eyni sətirləri oxuyur.
    revalidatePath("/accessibility");

    return {
      ok: true,
      message:
        "Bildiriş qeydə alındı. Əlçatanlıq maneələri 10 iş günü ərzində baxılır.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[accessibility] barrier report:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
