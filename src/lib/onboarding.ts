// ============================================================================
// src/lib/onboarding.ts
// "Özünü təqdim et" sihirbazının tamamlanma məntiqi (spec §16 — Incoming).
//
// Bu fayl SAF-dır: Prisma import ETMİR, `Date`/`Math.random` işlətmir. Səbəb
// iki dənədir:
//   1. `src/services/user.service.ts` (Node, Prisma) və UI kataloqu
//      (`features/class-home/incoming/steps.ts`) EYNİ addım açarlarını
//      işlədir — məntiq ortada, `lib`-də yaşamalıdır.
//   2. Vahid test jsdom mühitində işləyir; Prisma orada yüklənmir.
//
// ⚠️ Addım ETİKETLƏRİ burada YOXDUR. Azərbaycanca mətn `features/class-home/
// incoming/steps.ts`-dədir və `Record<OnboardingStepKey, …>` tipindədir —
// açar əlavə edilsə `tsc` orada dayanır.
//
// Keçid ÜNVANLARI isə burada hesablanır (`onboardingStepHref`), çünki onlar
// tamamlanma məntiqi ilə eyni faktdan asılıdır: addım hansı sahəni tələb edir,
// düymə də məhz həmin sahəyə aparmalıdır.
// ============================================================================

import { type ControlledField } from "@/lib/visibility";

/** Sihirbazın dörd addımı — sırası UI-da göstərilmə sırasıdır. */
export const ONBOARDING_STEP_KEYS = [
  "BASICS",
  "STORY",
  "INTERESTS",
  "EXPECTATIONS",
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

/**
 * Tamamlanma hesablaması üçün lazım olan MİNİMAL profil forması.
 * Servis `User` sətrindən məhz bu sahələri seçir — bütün profili yükləmək
 * lazım deyil.
 */
export interface OnboardingInput {
  avatarUrl: string | null;
  hometown: string | null;
  bio: string | null;
  askMeAbout: string | null;
  learningGoals: string | null;
  expectations: string | null;
  /** `UserTag` sayı — maraq / hobbi / bacarıq / dil, hamısı birlikdə. */
  tagCount: number;
}

/** Maraqlar addımının tamamlanmış sayılması üçün minimal taq sayı. */
export const MIN_ONBOARDING_TAGS = 3;

export interface OnboardingStepState {
  key: OnboardingStepKey;
  done: boolean;
  /** Bu addımda tamamlanmış tələb sayı — "1/2" göstəricisi üçün. */
  filled: number;
  /** Addımdakı ümumi tələb sayı. */
  required: number;
}

export interface OnboardingProgress {
  steps: OnboardingStepState[];
  completedSteps: number;
  totalSteps: number;
  /** 0-100 arası tam ədəd. TƏLƏBLƏRƏ görə hesablanır, addımlara görə yox. */
  percent: number;
  /** Növbəti tamamlanmamış addım — "Davam et" düyməsi bunu hədəfləyir. */
  nextStep: OnboardingStepKey | null;
}

/** Boş sətir və yalnız boşluqdan ibarət mətn "doldurulmuş" sayılmır. */
function filled(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Hər addımın tələblərini boolean massivi kimi qaytarır.
 * Faiz addım sayına görə deyil, TƏLƏB sayına görə hesablanır — belə olmasa
 * iki sahəlik addımın yarısını dolduran istifadəçi heç bir irəliləyiş görməzdi.
 */
function requirementsOf(input: OnboardingInput): Record<OnboardingStepKey, boolean[]> {
  return {
    // 1. Səni tanısınlar: şəkil + haradan gəldiyin
    BASICS: [filled(input.avatarUrl), filled(input.hometown)],
    // 2. Özün haqqında bir neçə cümlə + "mənə nə barədə yaza bilərsiniz"
    STORY: [filled(input.bio), filled(input.askMeAbout)],
    // 3. Maraq/hobbi/bacarıq taqları — tanışlıq kartlarını bu qidalandırır
    INTERESTS: [input.tagCount >= MIN_ONBOARDING_TAGS],
    // 4. Universitetdən gözləntilər və öyrənmə hədəfləri
    EXPECTATIONS: [filled(input.learningGoals), filled(input.expectations)],
  };
}

// ---------------------------------------------------------------------------
// Addım → `/me/edit` lövbəri
// ---------------------------------------------------------------------------

/**
 * 🔴 BLOK 7-DƏ DÜZƏLDİLƏN SƏHV: Blok 5-də dörd addımın hamısı `/me`-yə
 * göstərirdi, `/me` isə `/u/[userId]`-yə yönləndirir — yəni "Şəkil əlavə et"
 * düyməsi istifadəçini REDAKTƏ formasına deyil, ÖZ PROFİLİNƏ BAXIŞA aparırdı.
 * Sihirbaz heç vaxt 100%-ə çatmırdı, çünki addımı tamamlamağın yolu görünmürdü.
 *
 * İndi hər addım öz ƏSAS sahəsinə lövbərlənir. Tip `ControlledField`-dir:
 * uydurma sahə adı yazmaq mümkün deyil (`tsc` dayanır), yəni lövbər formadakı
 * `id`-yə həmişə uyğun gəlir.
 *
 * ⚠️ Seçilən sahə həmin addımın BİRİNCİ tələbidir (`requirementsOf`-a bax) —
 * istifadəçi düyməyə basanda dərhal doldurmalı olduğu xanaya düşür.
 */
export const ONBOARDING_STEP_FIELDS: Record<OnboardingStepKey, ControlledField> = {
  BASICS: "avatarUrl",
  STORY: "bio",
  INTERESTS: "interests",
  EXPECTATIONS: "learningGoals",
};

/** Formadakı sahə sətrinin `id`-si — `/me/edit` və lövbər BİR mənbədən. */
export function profileFieldAnchor(field: string): string {
  return `field-${field}`;
}

export function onboardingStepHref(step: OnboardingStepKey): string {
  return `/me/edit#${profileFieldAnchor(ONBOARDING_STEP_FIELDS[step])}`;
}

export function computeOnboardingProgress(input: OnboardingInput): OnboardingProgress {
  const requirements = requirementsOf(input);

  const steps: OnboardingStepState[] = ONBOARDING_STEP_KEYS.map((key) => {
    const checks = requirements[key];
    const filledCount = checks.filter(Boolean).length;
    return {
      key,
      done: filledCount === checks.length,
      filled: filledCount,
      required: checks.length,
    };
  });

  const totalRequired = steps.reduce((sum, step) => sum + step.required, 0);
  const totalFilled = steps.reduce((sum, step) => sum + step.filled, 0);

  return {
    steps,
    completedSteps: steps.filter((step) => step.done).length,
    totalSteps: steps.length,
    percent: Math.round((totalFilled / totalRequired) * 100),
    nextStep: steps.find((step) => !step.done)?.key ?? null,
  };
}
