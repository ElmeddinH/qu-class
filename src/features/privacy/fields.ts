// ============================================================================
// src/features/privacy/fields.ts
// `/me/privacy` səhifəsinin sahə etiketləri və bölmələri.
//
// ⚠️ `FIELD_LABELS` `Record<ControlledField, …>`-dur: `CONTROLLED_PROFILE_FIELDS`-ə
// yeni sahə əlavə edilsə bu fayl KOMPİLYASİYADA sınır. Sahə siyahısı burada
// TƏKRAR YAZILMIR — vahid mənbə `src/lib/visibility.ts`-dir.
//
// Bölmələrin sahələri əhatə etməsi `visibility.test.ts`-də yoxlanılır (bölmə
// unudulsa sahə panelə düşməz və istifadəçi onu idarə edə bilməzdi).
// ============================================================================

import { RELATIONAL_PROFILE_FIELDS, type ControlledField } from "@/lib/visibility";

export const FIELD_LABELS: Record<ControlledField, string> = {
  // --- Əsas ---
  avatarUrl: "Profil şəkli",
  bio: "Mənim haqqımda",
  hometown: "Doğma şəhər",
  learningGoals: "Öyrənmək istədiklərim",
  askMeAbout: "Mənə müraciət edə bilərsiniz",
  expectations: "Universitetdən gözləntilərim",

  // --- Əlaqə ---
  phone: "Telefon nömrəsi",
  personalEmail: "Şəxsi e-poçt",
  currentCity: "Yaşadığım şəhər",
  currentCountry: "Yaşadığım ölkə",

  // --- Maraqlar ---
  interests: "Maraqlar",
  hobbies: "Hobbilər",
  skills: "Bacarıqlar",
  languages: "Bildiyim dillər",
  clubs: "Üzv olduğum klublar",

  // --- Karyera ---
  currentCompany: "Cari iş yeri",
  currentPosition: "Cari vəzifə",
  industry: "Sənaye sahəsi",
  futurePlans: "Gələcək planlarım",
  careerHistory: "Karyera tarixçəsi",
  education: "Əlavə təhsil",
};

export interface PrivacySection {
  id: string;
  title: string;
  description: string;
  fields: readonly ControlledField[];
}

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "basic",
    title: "Əsas",
    description: "Profilinizin ilk baxışda görünən hissəsi.",
    fields: ["avatarUrl", "bio", "hometown", "learningGoals", "askMeAbout", "expectations"],
  },
  {
    id: "contact",
    title: "Əlaqə",
    description:
      "Telefon və şəxsi e-poçt standart olaraq yalnız sizə görünür — bunu qəsdən dəyişməsəniz belə qalır.",
    fields: ["phone", "personalEmail", "currentCity", "currentCountry"],
  },
  {
    id: "interests",
    title: "Maraqlar",
    description: "Sinif yoldaşlarınızın sizi tapmasına kömək edən sahələr.",
    fields: ["interests", "hobbies", "skills", "languages", "clubs"],
  },
  {
    id: "career",
    title: "Karyera",
    description:
      "Məzuniyyətdən sonrakı məlumatlar. Statistikaya (İndi haradayıq?) düşmək üçün AYRICA razılıq tələb olunur.",
    fields: ["currentCompany", "currentPosition", "industry", "futurePlans", "careerHistory", "education"],
  },
];

/** Əlaqə cədvəlindən gələn sahələr — panelde əlavə izahla işarələnir. */
export function isRelationalField(field: ControlledField): boolean {
  return (RELATIONAL_PROFILE_FIELDS as readonly string[]).includes(field);
}
