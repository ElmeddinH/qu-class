// ============================================================================
// src/features/class-home/incoming/steps.ts
// "Özünü təqdim et" sihirbazının UI kataloqu.
//
// ⚠️ TAMAMLANMA MƏNTİQİ BURADA DEYİL — `src/lib/onboarding.ts`-dədir (saf,
// testlə örtülü). Burada yalnız azərbaycanca mətn var.
//
// ⚠️ KEÇİD ÜNVANI DA BURADA DEYİL. Blok 5-də hər addım əl ilə `/me` yazırdı və
// `/me` profilə BAXIŞ səhifəsinə yönləndirir — düymə istifadəçini redaktə
// formasına aparmırdı, sihirbaz 100%-ə çatmırdı. İndi ünvan
// `onboardingStepHref(key)`-dən gəlir: addımın tələb etdiyi sahə ilə linkin
// lövbəri EYNİ mənbədəndir (`ONBOARDING_STEP_FIELDS`), yəni ayrıla bilməz.
//
// Cədvəl `Record<OnboardingStepKey, …>` tipindədir: `lib/onboarding.ts`-ə yeni
// addım əlavə olunsa `tsc` məhz burada dayanır və etiket səssizcə çatmamış
// qalmır.
// ============================================================================

import type { OnboardingStepKey } from "@/lib/onboarding";

export interface OnboardingStepMeta {
  title: string;
  description: string;
  /** Düymə üzərindəki fel — "Şəkil əlavə et" kimi. */
  cta: string;
}

export const ONBOARDING_STEP_META: Record<OnboardingStepKey, OnboardingStepMeta> = {
  BASICS: {
    title: "Profil şəkli və doğma şəhər",
    description:
      "Sinif yoldaşların səni tanısın: profil şəkli əlavə et və haradan gəldiyini yaz.",
    cta: "Əsas məlumatı doldur",
  },
  STORY: {
    title: "Özün haqqında bir neçə cümlə",
    description:
      "Qısa təqdimat və «mənə hansı mövzularda müraciət edə bilərsiniz» sualının cavabı.",
    cta: "Təqdimatını yaz",
  },
  INTERESTS: {
    title: "Maraqlar, hobbilər və bacarıqlar",
    description:
      "Ən azı üç seçim et — tanışlıq kartları məhz bunlara görə uyğun adamları tapır.",
    cta: "Maraqlarını seç",
  },
  EXPECTATIONS: {
    title: "Hədəflər və gözləntilər",
    description:
      "Universitetdə nə öyrənmək istəyirsən və tələbə həyatından nə gözləyirsən?",
    cta: "Gözləntilərini yaz",
  },
};
