// ============================================================================
// src/features/profile/sections.ts
// `/me/edit` formasının QURULUŞU: hansı sahə hansı bölmədə, hansı idarəedici
// ilə göstərilir.
//
// ⚠️ BÖLMƏLƏR `PRIVACY_SECTIONS`-DAN GƏLİR, təkrar yazılmır. İstifadəçi
// `/me/edit` və `/me/privacy` səhifələrində EYNİ qruplaşmanı görməlidir —
// iki siyahı saxlansaydı biri dəyişəndə digəri səssizcə ayrılardı (T13-ün
// eyni səhvi).
//
// ⚠️ `PROFILE_FIELD_CONTROLS` `Record<ControlledField, …>`-dur: 21 sahənin
// hamısı burada olmalıdır, yoxsa `tsc` dayanır. Yeni idarə olunan sahə əlavə
// edən adam formanı doldurmağı unuda bilməz.
//
// ⚠️ LÖVBƏRLƏR: sihirbaz addımları (`/me/edit#field-avatarUrl`) məhz bu
// funksiyadan qurulur — ad `lib/onboarding.ts`-dəki `profileFieldAnchor` ilə
// EYNİ mənbədəndir, ona görə link ilə sahə arasında sürüşmə mümkün deyil.
// ============================================================================

import { PRIVACY_SECTIONS, type PrivacySection } from "@/features/privacy/fields";
import { TagType, type TagType as TagTypeName } from "@/lib/enums";
import { SCALAR_PROFILE_FIELDS, type ControlledField } from "@/lib/visibility";

/** `User` sütunu olan sahələr — formada birbaşa `<input>` ilə redaktə olunur. */
export type ScalarFieldName = (typeof SCALAR_PROFILE_FIELDS)[number];

/**
 * Sahə adı forma sxemində skalyar açar kimi mövcuddurmu?
 *
 * Lazımdır, çünki forma `ControlledField` üzrə dövr edir, `updateProfileSchema`
 * isə `interests` / `careerHistory` kimi ƏLAQƏ sahələrini açar kimi daşımır
 * (onlar `tags` / `clubIds` altında, ya da `/me/career`-də idarə olunur).
 * Bu qoruyucu olmasa RHF mövcud olmayan yola (`name="interests"`) bağlanardı.
 */
export function isScalarField(field: ControlledField): field is ScalarFieldName {
  return (SCALAR_PROFILE_FIELDS as readonly string[]).includes(field);
}

/** Sahənin formadakı idarəedicisi. */
export type ProfileFieldControl =
  /** Tək sətirlik mətn. */
  | { kind: "text"; placeholder?: string; autoComplete?: string }
  /** Çoxsətirli hekayə sahəsi — başlığı SUAL formasındadır. */
  | { kind: "story" }
  /** Profil şəkli — ünvan və ya yüklənmiş fayl yolu. */
  | { kind: "image" }
  | { kind: "phone" }
  | { kind: "email" }
  /** Sənaye seçimi (`Industry` enum). */
  | { kind: "industry" }
  /** Taq seçicisi — mövcud kataloqdan (yeni `Tag` YARADILMIR). */
  | { kind: "tags"; tagType: TagTypeName }
  /** Klub üzvlüyü seçicisi. */
  | { kind: "clubs" }
  /**
   * Dəyəri BAŞQA səhifədə redaktə olunan sahə — burada yalnız GÖRÜNÜRLÜK
   * seçicisi göstərilir. Karyera və təhsil qeydləri sətir-sətir idarə olunur
   * (hər sətrin öz `visibility` və `includeInStats` sütunu var), ona görə
   * onların yeri `/me/career`-dir.
   */
  | { kind: "managed-elsewhere"; href: string; cta: string };

export const PROFILE_FIELD_CONTROLS: Record<ControlledField, ProfileFieldControl> = {
  // --- Əsas ---
  avatarUrl: { kind: "image" },
  bio: { kind: "story" },
  hometown: { kind: "text", placeholder: "Məsələn: Gəncə", autoComplete: "address-level2" },
  learningGoals: { kind: "story" },
  askMeAbout: { kind: "story" },
  expectations: { kind: "story" },

  // --- Əlaqə ---
  phone: { kind: "phone" },
  personalEmail: { kind: "email" },
  currentCity: { kind: "text", placeholder: "Məsələn: Xankəndi", autoComplete: "address-level2" },
  currentCountry: { kind: "text", placeholder: "Məsələn: Azərbaycan", autoComplete: "country-name" },

  // --- Maraqlar (əlaqə cədvəllərindən) ---
  interests: { kind: "tags", tagType: TagType.INTEREST },
  hobbies: { kind: "tags", tagType: TagType.HOBBY },
  skills: { kind: "tags", tagType: TagType.SKILL },
  languages: { kind: "tags", tagType: TagType.LANGUAGE },
  clubs: { kind: "clubs" },

  // --- Karyera ---
  currentCompany: { kind: "text", placeholder: "Məsələn: Azercell", autoComplete: "organization" },
  currentPosition: { kind: "text", placeholder: "Məsələn: Data analitik", autoComplete: "organization-title" },
  industry: { kind: "industry" },
  futurePlans: { kind: "story" },
  careerHistory: {
    kind: "managed-elsewhere",
    href: "/me/career",
    cta: "Karyera qeydlərini idarə et",
  },
  education: {
    kind: "managed-elsewhere",
    href: "/me/career#education",
    cta: "Təhsil qeydlərini idarə et",
  },
};

/**
 * Hekayə sualları — `/u/[userId]` bölmə başlığı VƏ `/me/edit` sahə izahı.
 *
 * 🔴 Spec §9: profil CV DEYİL, HEKAYƏDİR. Sahə adı ("expectations") deyil,
 * SUAL göstərilir ("Universitet həyatından gözləntilərim"). İki səhifədə fərqli
 * mətn olsaydı istifadəçi redaktə etdiyi sahənin profildə hansı bölmə olduğunu
 * tapa bilməzdi — ona görə mətn BURADA, bir yerdədir.
 */
export const STORY_QUESTIONS: Partial<Record<ControlledField, string>> = {
  bio: "Mənim haqqımda",
  learningGoals: "Universitetdə nə öyrənmək istəyirəm?",
  askMeAbout: "Mənə hansı mövzularda müraciət edə bilərsiniz?",
  expectations: "Universitet həyatından gözləntilərim",
  futurePlans: "Gələcək planlarım",
};

/** Formada sahənin altında göstərilən köməkçi mətn. */
export const FIELD_HINTS: Partial<Record<ControlledField, string>> = {
  avatarUrl: "Şəkil ünvanı yapışdırın. Profil şəkli olmayanda ad-soyadın baş hərfləri göstərilir.",
  bio: "Bir-iki cümlə kifayətdir — sinif yoldaşların səni tanısın.",
  learningGoals: "Hansı fənlər, bacarıqlar və ya sahələr səni maraqlandırır?",
  askMeAbout: "Hansı mövzularda kömək edə bilərsən? Bu sahə tanışlıq kartlarında göstərilir.",
  expectations: "Universitet həyatından nə gözləyirsən?",
  futurePlans: "Məzunlar üçün: bundan sonra nə etmək istəyirsən?",
  interests: "Ən azı üç seçim et — tanışlıq kartları məhz bunlara görə uyğun adamları tapır.",
  languages: "Hər dil üçün səviyyə seçə bilərsiniz.",
  phone: "Standart olaraq yalnız sizə görünür.",
  personalEmail: "Standart olaraq yalnız sizə görünür.",
};

export type ProfileFormSection = PrivacySection;

/** `/me/edit` bölmələri — `PRIVACY_SECTIONS` ilə HƏRFBƏHƏRF eyni sıra və dəst. */
export const PROFILE_FORM_SECTIONS: readonly ProfileFormSection[] = PRIVACY_SECTIONS;
