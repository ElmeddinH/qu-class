// ============================================================================
// src/features/profile/preview.ts
// "Preview as" — istifadəçi ÖZ profilinə başqasının gözü ilə baxır.
//
// Bu, məxfilik mühərrikinin CANLI SÜBUTUDUR: səhifə heç nəyi gizlətmir,
// sadəcə SİNTETİK `Viewer` qurub eyni `getProfile()`-i çağırır. Yəni ekranda
// gördüyün şey əsl kod yolundan keçir, ayrıca "preview" məntiqi yoxdur.
//
// ⚠️ Yalnız ÖZ profilində işləyir (səhifə bunu yoxlayır). Başqasının profilində
// icazə versək istifadəçi məhz gizlədilmiş sahələri "sinif gözü ilə" görərdi.
// ============================================================================

import { ANONYMOUS, type Viewer } from "@/lib/visibility";

export const PREVIEW_MODES = ["anonymous", "university", "class"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const PREVIEW_PARAM = "as";

export const PREVIEW_LABELS: Record<PreviewMode, string> = {
  anonymous: "Anonim ziyarətçi",
  university: "Universitet istifadəçisi",
  class: "Sinif yoldaşı",
};

export const PREVIEW_DESCRIPTIONS: Record<PreviewMode, string> = {
  anonymous: "Sistemə daxil olmamış kənar ziyarətçi yalnız PUBLIC sahələri görür.",
  university:
    "Başqa sinifdən olan təsdiqlənmiş QU istifadəçisi PUBLIC və UNIVERSITY sahələri görür.",
  class: "Sinif yoldaşınız PUBLIC, UNIVERSITY və CLASS sahələri görür.",
};

/**
 * Sintetik viewer-in `userId`-si.
 * ⚠️ Real `cuid()` formasında DEYİL — heç bir istifadəçi ilə üst-üstə düşməməli
 * və `redactProfile`-ın "sahib" şaxəsini TƏTİKLƏMƏMƏLİDİR.
 */
const PREVIEW_USER_ID = "preview:not-a-real-user";

export function parsePreviewMode(raw: string | string[] | undefined): PreviewMode | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return (PREVIEW_MODES as readonly string[]).includes(value)
    ? (value as PreviewMode)
    : null;
}

/**
 * Seçilmiş rejim üçün sintetik `Viewer`.
 *
 * @param ownerCohortIds profil sahibinin cohort-ları. "Preview as" yalnız öz
 *   profilində işlədiyi üçün bu, viewer-in öz `cohortIds`-idir — əlavə sorğu
 *   lazım deyil.
 */
export function buildPreviewViewer(mode: PreviewMode, ownerCohortIds: string[]): Viewer {
  if (mode === "anonymous") return ANONYMOUS;

  return {
    kind: "USER",
    userId: PREVIEW_USER_ID,
    // "university" → sahiblə HEÇ BİR cohort paylaşmır.
    // "class"      → sahibin bütün cohort-larında üzvdür.
    cohortIds: mode === "class" ? ownerCohortIds : [],
    systemRole: "USER",
    moderatedCohortIds: [],
  };
}
