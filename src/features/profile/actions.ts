"use server";

// ============================================================================
// src/features/profile/actions.ts
// `/me/edit` Server Action-ı.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `services/user.service.ts`-dədir (CLAUDE.md §4). Buradakı iş dörd addımdır:
//   1. `requireUser()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula (`features/profile/schemas.ts`)
//   3. Sətirləri `null`-a çevir (TƏLƏ T3 — coerce formada işlədilmir)
//   4. Servisi çağır, keşi təzələ, azərbaycanca nəticə qaytar
//
// 🔴 `userId` MÜŞTƏRİDƏN GƏLMİR. Redaktə həmişə `requireUser()`-dən çıxan
// viewer-in ÖZ profilinə tətbiq olunur — formada gizli `userId` sahəsi belə
// yoxdur. Başqasının profilini redaktə etməyin YOLU YOXDUR.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { emptyToNull } from "@/lib/form-fields";
import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";
import {
  updateProfile,
  type ProfileScalars,
  type UpdateProfileFailure,
} from "@/services/user.service";

import { updateProfileSchema } from "./schemas";

export interface ProfileActionResult {
  ok: boolean;
  message?: string;
  /** Sahə → səhv mesajı (Zod). Formada göstərilir. */
  fieldErrors?: Record<string, string>;
}

const GENERIC_ERROR = "Dəyişiklik saxlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<UpdateProfileFailure, string> = {
  UNAUTHENTICATED: "Sessiya bitib. Yenidən daxil olun.",
  UNKNOWN_FIELD: "Bu sahə tanınmadı. Səhifəni yeniləyib yenidən cəhd edin.",
  INVALID_LEVEL: "Görünürlük səviyyəsi tanınmadı.",
  NOT_FOUND: "Profil tapılmadı.",
  UNKNOWN_TAG: "Seçilmiş taqlardan biri kataloqda yoxdur. Səhifəni yeniləyin.",
  UNKNOWN_CLUB: "Seçilmiş klublardan biri tapılmadı. Səhifəni yeniləyin.",
};

/** Zod səhvlərini `{ "visibility.bio": "…" }` formasına gətirir. */
function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Profilin göründüyü səthləri təzələyir.
 *
 * `/u/[userId]` server komponentidir: dəyər və ya görünürlük dəyişəndə köhnə
 * nəticə keşdə qalmamalıdır. Sinif kataloqu da profil sahələrini göstərir,
 * amma səhifə dinamikdir (viewer-dən asılıdır) — orada keş problemi yoxdur.
 */
function revalidateProfileSurfaces(userId: string): void {
  revalidatePath("/me/edit");
  revalidatePath("/me/privacy");
  revalidatePath(`/u/${userId}`);
}

export async function updateProfileAction(input: unknown): Promise<ProfileActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;

    // T3: `""` → `null` çevirməsi MƏHZ BURADA olur, sxemdə yox.
    const scalars: ProfileScalars = {
      avatarUrl: emptyToNull(data.avatarUrl),
      hometown: emptyToNull(data.hometown),
      currentCity: emptyToNull(data.currentCity),
      currentCountry: emptyToNull(data.currentCountry),
      phone: emptyToNull(data.phone),
      personalEmail: emptyToNull(data.personalEmail),
      bio: emptyToNull(data.bio),
      learningGoals: emptyToNull(data.learningGoals),
      askMeAbout: emptyToNull(data.askMeAbout),
      expectations: emptyToNull(data.expectations),
      currentCompany: emptyToNull(data.currentCompany),
      currentPosition: emptyToNull(data.currentPosition),
      industry: emptyToNull(data.industry),
      futurePlans: emptyToNull(data.futurePlans),
    };

    const result = await updateProfile(viewer, {
      firstName: data.firstName,
      lastName: data.lastName,
      scalars,
      tags: data.tags.map((tag) => ({
        tagId: tag.tagId,
        // Dil olmayan taqda səviyyə mənasızdır — servis də bunu kəsir.
        level: emptyToNull(tag.level),
      })),
      clubIds: data.clubIds,
      // 21 sahənin hamısı göndərilir; DƏYİŞMƏYƏNLƏR servisdə süzülür
      // (`changedVisibility`) — toxunulmamış `phone` üçün sətir yaranmır.
      visibility: CONTROLLED_PROFILE_FIELDS.map((field) => ({
        field,
        level: data.visibility[field],
      })),
    });

    if (!result.ok) {
      return { ok: false, message: FAILURE_MESSAGES[result.reason] ?? GENERIC_ERROR };
    }

    revalidateProfileSurfaces(viewer.userId);
    return { ok: true, message: "Profiliniz yeniləndi." };
  } catch (error) {
    // `requireUser()` sessiya yoxdursa NEXT_REDIRECT atır — naviqasiyadır, xəta deyil.
    unstable_rethrow(error);
    console.error("[profile] updateProfileAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
