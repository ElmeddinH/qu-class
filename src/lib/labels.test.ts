// ============================================================================
// src/lib/labels.test.ts
// TƏLƏ T13 — etiket dublikatının qarşısı.
//
// Blok 7-yə qədər eyni enum etiketləri İKİ faylda saxlanılırdı
// (`features/profile/labels.ts` və `features/class-home/catalog.ts`) və
// səssizcə ayrılmışdı: `GOVERNMENT` bir yerdə "Dövlət idarəçiliyi", digərində
// "Dövlət sektoru" idi. İstifadəçi eyni dəyəri iki səhifədə iki adla görürdü.
//
// Bu fayl iki şeyi qoruyur:
//   1. ƏHATƏ — hər enum dəyərinin etiketi var (boş və ya çatışmayan yoxdur);
//   2. VAHİDLİK — `…Label()` köməkçiləri məhz həmin cədvəldən oxuyur və
//      naməlum dəyərdə sınmır.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  CLUB_ROLE_VALUES,
  COHORT_ROLE_VALUES,
  DEGREE_VALUES,
  EVENT_CATEGORY_VALUES,
  EVENT_SCOPE_VALUES,
  EVENT_STATUS_VALUES,
  INDUSTRY_VALUES,
  JOB_FUNCTION_VALUES,
  LANGUAGE_LEVEL_VALUES,
  RSVP_STATUS_VALUES,
  SUPPORT_OFFER_TYPE_VALUES,
  USER_STAGE_VALUES,
} from "./enums";
import {
  CLUB_ROLE_LABELS,
  COHORT_ROLE_LABELS,
  DEGREE_LABELS,
  EVENT_CATEGORY_LABELS,
  EVENT_SCOPE_LABELS,
  EVENT_STATUS_LABELS,
  INDUSTRY_LABELS,
  JOB_FUNCTION_LABELS,
  LANGUAGE_LEVEL_HINTS,
  LANGUAGE_LEVEL_LABELS,
  RSVP_STATUS_LABELS,
  STAGE_LABELS,
  SUPPORT_OFFER_LABELS,
  clubRoleLabel,
  cohortRoleLabel,
  degreeLabel,
  eventCategoryLabel,
  eventScopeLabel,
  industryLabel,
  jobFunctionLabel,
  labelOf,
  languageLevelLabel,
  rsvpStatusLabel,
  stageLabel,
  supportOfferLabel,
} from "./labels";

/** Cədvəl → dəyər siyahısı cütləri. Yeni enum əlavə olunanda buraya da yazılır. */
const TABLES: Array<[string, readonly string[], Record<string, string>]> = [
  ["STAGE_LABELS", USER_STAGE_VALUES, STAGE_LABELS],
  ["COHORT_ROLE_LABELS", COHORT_ROLE_VALUES, COHORT_ROLE_LABELS],
  ["CLUB_ROLE_LABELS", CLUB_ROLE_VALUES, CLUB_ROLE_LABELS],
  ["INDUSTRY_LABELS", INDUSTRY_VALUES, INDUSTRY_LABELS],
  ["JOB_FUNCTION_LABELS", JOB_FUNCTION_VALUES, JOB_FUNCTION_LABELS],
  ["DEGREE_LABELS", DEGREE_VALUES, DEGREE_LABELS],
  ["LANGUAGE_LEVEL_LABELS", LANGUAGE_LEVEL_VALUES, LANGUAGE_LEVEL_LABELS],
  ["LANGUAGE_LEVEL_HINTS", LANGUAGE_LEVEL_VALUES, LANGUAGE_LEVEL_HINTS],
  ["SUPPORT_OFFER_LABELS", SUPPORT_OFFER_TYPE_VALUES, SUPPORT_OFFER_LABELS],
  ["EVENT_SCOPE_LABELS", EVENT_SCOPE_VALUES, EVENT_SCOPE_LABELS],
  ["EVENT_CATEGORY_LABELS", EVENT_CATEGORY_VALUES, EVENT_CATEGORY_LABELS],
  ["EVENT_STATUS_LABELS", EVENT_STATUS_VALUES, EVENT_STATUS_LABELS],
  ["RSVP_STATUS_LABELS", RSVP_STATUS_VALUES, RSVP_STATUS_LABELS],
];

describe("etiket cədvəlləri", () => {
  it.each(TABLES)("%s hər enum dəyərini əhatə edir", (_name, values, labels) => {
    for (const value of values) {
      expect(labels[value], value).toBeTruthy();
      expect(labels[value].trim().length, value).toBeGreaterThan(0);
    }
  });

  it.each(TABLES)("%s ARTIQ açar daşımır (silinmiş enum dəyəri qalmayıb)", (_n, values, labels) => {
    expect(Object.keys(labels).sort()).toEqual([...values].sort());
  });

  it("etiketlər azərbaycancadır, enum adının özü deyil", () => {
    // Ən azı bir dəyər tərcümə olunmalıdır — cədvəl `X: "X"` ilə doldurulsa
    // test bunu tutur (LANGUAGE_LEVEL istisnadır: "A1" beynəlxalq koddur).
    expect(INDUSTRY_LABELS.TECHNOLOGY).not.toBe("TECHNOLOGY");
    expect(SUPPORT_OFFER_LABELS.GUEST_LECTURE).not.toBe("GUEST_LECTURE");
    expect(COHORT_ROLE_LABELS.CLASS_REPRESENTATIVE).not.toBe("CLASS_REPRESENTATIVE");
  });
});

describe("labelOf", () => {
  it("məlum dəyəri tərcümə edir", () => {
    expect(labelOf(DEGREE_LABELS, "MASTER")).toBe("Magistr");
  });

  it("naməlum dəyəri XAM halda qaytarır (UI sınmır)", () => {
    // DB sütunu `String`-dir: köhnə miqrasiyadan qalmış dəyər gələ bilər.
    expect(labelOf(DEGREE_LABELS, "ASSOCIATE")).toBe("ASSOCIATE");
  });

  it("`null` / boş dəyər üçün `null` qaytarır", () => {
    expect(labelOf(DEGREE_LABELS, null)).toBeNull();
    expect(labelOf(DEGREE_LABELS, "")).toBeNull();
  });
});

describe("…Label() köməkçiləri", () => {
  it("cədvəldəki dəyəri qaytarır", () => {
    expect(stageLabel("ALUMNI")).toBe(STAGE_LABELS.ALUMNI);
    expect(cohortRoleLabel("CLASS_MODERATOR")).toBe(COHORT_ROLE_LABELS.CLASS_MODERATOR);
    expect(clubRoleLabel("PRESIDENT")).toBe(CLUB_ROLE_LABELS.PRESIDENT);
    expect(industryLabel("FINANCE")).toBe(INDUSTRY_LABELS.FINANCE);
    expect(jobFunctionLabel("DATA")).toBe(JOB_FUNCTION_LABELS.DATA);
    expect(degreeLabel("PHD")).toBe(DEGREE_LABELS.PHD);
    expect(supportOfferLabel("MENTORING")).toBe(SUPPORT_OFFER_LABELS.MENTORING);
    expect(languageLevelLabel("NATIVE")).toBe(LANGUAGE_LEVEL_LABELS.NATIVE);
    expect(eventScopeLabel("REUNION")).toBe(EVENT_SCOPE_LABELS.REUNION);
    expect(eventCategoryLabel("SEMINAR")).toBe(EVENT_CATEGORY_LABELS.SEMINAR);
    expect(rsvpStatusLabel("WAITLISTED")).toBe(RSVP_STATUS_LABELS.WAITLISTED);
  });

  it("🔴 `scope` və `category` cədvəlləri KƏSİŞMİR (spec §14/§15)", () => {
    // Reunion YALNIZ scope-dadır, `EventCategory`-də belə dəyər OLMAMALIDIR:
    // olsaydı filtr paneli eyni anlayışı iki yerdə göstərərdi.
    const scopes = new Set<string>(EVENT_SCOPE_VALUES);
    const categories = new Set<string>(EVENT_CATEGORY_VALUES);

    expect(scopes.has("REUNION")).toBe(true);
    expect(categories.has("REUNION")).toBe(false);

    for (const scope of scopes) {
      expect(categories.has(scope), `${scope} hər iki siyahıdadır`).toBe(false);
    }
  });

  it("naməlum dəyərdə təhlükəsiz nəticə verir", () => {
    expect(stageLabel("???")).toBe(STAGE_LABELS.STUDENT);
    expect(cohortRoleLabel("???")).toBe(COHORT_ROLE_LABELS.MEMBER);
    expect(industryLabel("???")).toBe(INDUSTRY_LABELS.OTHER);
    expect(jobFunctionLabel("???")).toBe(JOB_FUNCTION_LABELS.OTHER);
    expect(supportOfferLabel("???")).toBe("Dəstək");
    expect(languageLevelLabel(null)).toBeNull();
    expect(eventCategoryLabel("???")).toBe(EVENT_CATEGORY_LABELS.OTHER);
    // ⚠️ `eventScopeLabel` XAM dəyəri saxlayır: təşkilatçı səviyyəsi üçün
    // mənalı defolt yoxdur (`degreeLabel` ilə eyni məntiq).
    expect(eventScopeLabel("???")).toBe("???");
  });
});
