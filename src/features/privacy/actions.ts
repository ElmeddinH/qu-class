"use server";

// ============================================================================
// src/features/privacy/actions.ts
// `/me/privacy` Server Action-ları.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `src/services/user.service.ts`-dədir (CLAUDE.md §4). Buradakı iş: sessiyanı
// `Viewer`-ə çevirmək, girişi doğrulamaq və keşi təzələmək.
//
// ⚠️ `userId` MÜŞTƏRİDƏN GƏLMİR. Səviyyə həmişə `requireUser()`-dən çıxan
// viewer-in ÖZ sahəsinə yazılır — əks halda istifadəçi başqasının məxfilik
// tənzimləməsini dəyişə bilərdi.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  updateFieldVisibility,
  updateFieldVisibilityMany,
} from "@/services/user.service";

export interface PrivacyActionResult {
  ok: boolean;
  message?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Sessiya bitib. Yenidən daxil olun.",
  UNKNOWN_FIELD: "Bu sahə tanınmadı. Səhifəni yeniləyib yenidən cəhd edin.",
  INVALID_LEVEL: "Görünürlük səviyyəsi tanınmadı.",
};

const GENERIC_ERROR = "Dəyişiklik saxlanmadı. Bir azdan yenidən cəhd edin.";

function revalidateProfileSurfaces(userId: string): void {
  revalidatePath("/me/privacy");
  // Profil səhifəsi redakte olunmuş məlumatı server tərəfdə render edir —
  // səviyyə dəyişəndə köhnə nəticə keşdə qalmamalıdır.
  revalidatePath(`/u/${userId}`);
}

/** Tək sahənin görünürlük səviyyəsini dəyişir. */
export async function updateFieldVisibilityAction(
  field: string,
  level: string,
): Promise<PrivacyActionResult> {
  try {
    const viewer = await requireUser();
    const result = await updateFieldVisibility(viewer, field, level);

    if (!result.ok) {
      return { ok: false, message: ERROR_MESSAGES[result.reason] ?? GENERIC_ERROR };
    }

    revalidateProfileSurfaces(viewer.userId);
    return { ok: true };
  } catch (error) {
    // `requireUser()` sessiya yoxdursa NEXT_REDIRECT atır — bu, xəta deyil,
    // naviqasiyadır. Udmaq olmaz.
    unstable_rethrow(error);
    console.error("[privacy] updateFieldVisibilityAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

/** Bölmənin bütün sahələrini eyni səviyyəyə gətirir ("hamısını dəyiş"). */
export async function updateFieldVisibilityManyAction(
  fields: string[],
  level: string,
): Promise<PrivacyActionResult> {
  try {
    const viewer = await requireUser();
    const result = await updateFieldVisibilityMany(
      viewer,
      fields.map((field) => ({ field, level })),
    );

    if (!result.ok) {
      return { ok: false, message: ERROR_MESSAGES[result.reason] ?? GENERIC_ERROR };
    }

    revalidateProfileSurfaces(viewer.userId);
    return { ok: true };
  } catch (error) {
    // `requireUser()` sessiya yoxdursa NEXT_REDIRECT atır — bu, xəta deyil,
    // naviqasiyadır. Udmaq olmaz.
    unstable_rethrow(error);
    console.error("[privacy] updateFieldVisibilityManyAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
