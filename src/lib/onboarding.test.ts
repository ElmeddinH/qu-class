import { describe, expect, it } from "vitest";

import { CONTROLLED_PROFILE_FIELDS } from "./visibility";
import {
  computeOnboardingProgress,
  MIN_ONBOARDING_TAGS,
  ONBOARDING_STEP_FIELDS,
  ONBOARDING_STEP_KEYS,
  onboardingStepHref,
  profileFieldAnchor,
  type OnboardingInput,
} from "./onboarding";

const EMPTY: OnboardingInput = {
  avatarUrl: null,
  hometown: null,
  bio: null,
  askMeAbout: null,
  learningGoals: null,
  expectations: null,
  tagCount: 0,
};

const FULL: OnboardingInput = {
  avatarUrl: "https://example.test/a.svg",
  hometown: "Şəki",
  bio: "Kitab oxumağı sevirəm.",
  askMeAbout: "Klublara qoşulmaq",
  learningGoals: "Komanda işi",
  expectations: "Real layihələr",
  tagCount: MIN_ONBOARDING_TAGS,
};

describe("computeOnboardingProgress", () => {
  it("boş profildə 0% və dörd tamamlanmamış addım verir", () => {
    const progress = computeOnboardingProgress(EMPTY);

    expect(progress.percent).toBe(0);
    expect(progress.completedSteps).toBe(0);
    expect(progress.totalSteps).toBe(ONBOARDING_STEP_KEYS.length);
    expect(progress.nextStep).toBe("BASICS");
    expect(progress.steps.every((step) => !step.done)).toBe(true);
  });

  it("tam profildə 100% verir və növbəti addım qalmır", () => {
    const progress = computeOnboardingProgress(FULL);

    expect(progress.percent).toBe(100);
    expect(progress.completedSteps).toBe(ONBOARDING_STEP_KEYS.length);
    expect(progress.nextStep).toBeNull();
  });

  it("addımın yarısı dolanda faiz irəliləyir, amma addım tamamlanmış sayılmır", () => {
    const progress = computeOnboardingProgress({ ...EMPTY, avatarUrl: "x" });
    const basics = progress.steps.find((step) => step.key === "BASICS");

    expect(basics).toMatchObject({ done: false, filled: 1, required: 2 });
    expect(progress.percent).toBeGreaterThan(0);
  });

  it("yalnız boşluqdan ibarət mətni doldurulmuş saymır", () => {
    const progress = computeOnboardingProgress({ ...FULL, bio: "   " });
    const story = progress.steps.find((step) => step.key === "STORY");

    expect(story?.done).toBe(false);
    expect(progress.percent).toBeLessThan(100);
  });

  it("maraqlar addımı minimal taq sayından asılıdır", () => {
    const below = computeOnboardingProgress({ ...FULL, tagCount: MIN_ONBOARDING_TAGS - 1 });
    const atLimit = computeOnboardingProgress({ ...FULL, tagCount: MIN_ONBOARDING_TAGS });

    expect(below.steps.find((step) => step.key === "INTERESTS")?.done).toBe(false);
    expect(atLimit.steps.find((step) => step.key === "INTERESTS")?.done).toBe(true);
  });

  it("növbəti addım kimi SIRADAKI ilk tamamlanmamışı seçir", () => {
    const progress = computeOnboardingProgress({ ...FULL, learningGoals: null });

    expect(progress.nextStep).toBe("EXPECTATIONS");
  });
});

// ============================================================================
// Sihirbaz addımı → `/me/edit` lövbəri (Blok 7-də düzəldilən səhv)
//
// Blok 5-də dörd addımın hamısı `/me`-yə göstərirdi, `/me` isə profilə BAXIŞ
// səhifəsinə yönləndirir — düymə redaktə formasına aparmırdı və sihirbaz
// 100%-ə çatmırdı. Bu testlər həmin əlaqəni bərkidir.
// ============================================================================

describe("addım keçidləri", () => {
  it("hər addımın hədəf sahəsi REAL idarə olunan sahədir", () => {
    for (const step of ONBOARDING_STEP_KEYS) {
      expect(CONTROLLED_PROFILE_FIELDS, step).toContain(ONBOARDING_STEP_FIELDS[step]);
    }
  });

  it("keçid `/me/edit` lövbərinə gedir, `/me`-yə YOX", () => {
    for (const step of ONBOARDING_STEP_KEYS) {
      const href = onboardingStepHref(step);

      expect(href, step).toMatch(/^\/me\/edit#field-/);
      // `/me` özü yönləndirmədir — addım oraya göstərsə istifadəçi formaya
      // düşmür (Blok 5-dəki səhv).
      expect(href, step).not.toBe("/me");
    }
  });

  it("lövbər adı formadakı `id` ilə eyni funksiyadan qurulur", () => {
    expect(onboardingStepHref("BASICS")).toBe(
      `/me/edit#${profileFieldAnchor(ONBOARDING_STEP_FIELDS.BASICS)}`,
    );
  });

  it("hər addım FƏRQLİ sahəyə aparır (dördü də eyni yerə düşmür)", () => {
    const targets = ONBOARDING_STEP_KEYS.map((step) => ONBOARDING_STEP_FIELDS[step]);

    expect(new Set(targets).size).toBe(ONBOARDING_STEP_KEYS.length);
  });

  it("hədəf sahə həmin addımın TƏLƏBLƏRİ ilə üst-üstə düşür", () => {
    // Addım tamamlanmayıbsa düymə məhz o addımı bağlayan sahəyə aparmalıdır:
    // sahəni boşaldıb addımın "tamamlanmamış" olduğunu yoxlayırıq.
    const cases: Array<[keyof typeof ONBOARDING_STEP_FIELDS, Partial<OnboardingInput>]> = [
      ["BASICS", { avatarUrl: null }],
      ["STORY", { bio: null }],
      ["INTERESTS", { tagCount: 0 }],
      ["EXPECTATIONS", { learningGoals: null }],
    ];

    for (const [step, patch] of cases) {
      const progress = computeOnboardingProgress({ ...FULL, ...patch });
      const state = progress.steps.find((item) => item.key === step);

      expect(state?.done, step).toBe(false);
    }
  });
});
