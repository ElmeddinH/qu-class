"use server";

// ============================================================================
// src/features/achievements/actions.ts
// Nailiyyət moderasiyasının Server Action-ları (spec §12, §17).
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `services/achievement.service.ts`-dədir (CLAUDE.md §4). Buradakı iş:
//   1. `requireUser()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula
//   3. Servisi çağır (icazə İKİNCİ dəfə orada da yoxlanılır)
//   4. Keşi təzələ, azərbaycanca nəticə qaytar
//
// 🔴 İCAZƏ İKİ QATDIR: səhifə `requireCohortRole(...)` ilə açılır, servis isə
// `canModerateCohort(viewer, cohortId)` ilə hər qərarı ayrıca yoxlayır. Action
// birbaşa çağırıla bilər (səhifədən keçmədən), ona görə səhifə qapısı TƏK
// qoruma sayılmır.
//
// 🔴 HƏR QƏRAR AuditLog YAZIR — bu, servisdəki transaksiyanın içindədir və
// buradan atlanıla bilmir.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  featureAchievement,
  rejectAchievement,
  verifyAchievement,
  type AchievementModerationFailure,
} from "@/services/achievement.service";

export interface AchievementActionResult {
  ok: boolean;
  message?: string;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<AchievementModerationFailure, string> = {
  NOT_FOUND: "Nailiyyət tapılmadı.",
  FORBIDDEN: "Bu sinifdə moderasiya icazəniz yoxdur.",
};

const decisionSchema = z.object({
  achievementId: z.string().min(1),
  cohortSlug: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

/** Rədd səbəbi MƏCBURİDİR: sahibə niyə arxivləndiyi bildirilməlidir. */
const rejectSchema = decisionSchema.extend({
  note: z.string().trim().min(3, "Rədd səbəbini yazın.").max(500),
});

/** Nailiyyət göründüyü bütün səthləri təzələyir. */
function revalidateAchievementSurfaces(slug: string): void {
  revalidatePath(`/class/${slug}/achievements`);
  revalidatePath(`/class/${slug}/achievements/moderation`);
  revalidatePath(`/class/${slug}/timeline`);
  revalidatePath(`/class/${slug}`);
}

export async function verifyAchievementAction(
  input: unknown,
): Promise<AchievementActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = decisionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Nailiyyət tapılmadı." };

    const result = await verifyAchievement(
      viewer,
      parsed.data.achievementId,
      parsed.data.note?.trim() || null,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateAchievementSurfaces(parsed.data.cohortSlug);
    return { ok: true, message: "Nailiyyət təsdiqləndi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[achievements] verifyAchievementAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function featureAchievementAction(
  input: unknown,
): Promise<AchievementActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = decisionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Nailiyyət tapılmadı." };

    const result = await featureAchievement(
      viewer,
      parsed.data.achievementId,
      parsed.data.note?.trim() || null,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateAchievementSurfaces(parsed.data.cohortSlug);
    return { ok: true, message: "Nailiyyət seçilmişlərə əlavə olundu." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[achievements] featureAchievementAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function rejectAchievementAction(
  input: unknown,
): Promise<AchievementActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = rejectSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Rədd səbəbini yazın.",
      };
    }

    const result = await rejectAchievement(
      viewer,
      parsed.data.achievementId,
      parsed.data.note,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateAchievementSurfaces(parsed.data.cohortSlug);
    return { ok: true, message: "Nailiyyət arxivləndi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[achievements] rejectAchievementAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
