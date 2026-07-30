// ============================================================================
// src/features/profile/schemas.test.ts
// `/me/edit` və `/me/career` formalarının doğrulama qaydaları.
//
// Sxem HƏM müştəri (RHF resolver), HƏM server action tərəfindən işlədilir —
// yəni burada yoxlanan hər qayda eyni anda təhlükəsizlik qaydasıdır.
// ============================================================================

import { describe, expect, it } from "vitest";

import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";

import {
  careerEntrySchema,
  educationEntrySchema,
  supportSettingsSchema,
  updateProfileSchema,
} from "./schemas";
import { PROFILE_FIELD_CONTROLS, PROFILE_FORM_SECTIONS } from "./sections";

// ---------------------------------------------------------------------------
// Köməkçilər — etibarlı baza dəyərləri
// ---------------------------------------------------------------------------

const VALID_PROFILE = {
  firstName: "Nərmin",
  lastName: "Quliyeva",
  avatarUrl: "",
  coverUrl: "",
  bio: "Ekologiya üzrə araşdırma aparıram.",
  hometown: "Ucar",
  learningGoals: "",
  askMeAbout: "",
  expectations: "",
  phone: "",
  personalEmail: "",
  currentCity: "Xankəndi",
  currentCountry: "Azərbaycan",
  tags: [{ tagId: "tag-01", level: "" }],
  clubIds: ["clb-1"],
  currentCompany: "",
  currentPosition: "",
  industry: "",
  futurePlans: "",
  visibility: Object.fromEntries(
    CONTROLLED_PROFILE_FIELDS.map((field) => [field, "CLASS"]),
  ),
};

const VALID_CAREER = {
  entryId: "",
  company: "Azercell",
  position: "Data analitik",
  industry: "TECHNOLOGY",
  city: "Bakı",
  country: "Azərbaycan",
  startDate: "2024-02-01",
  endDate: "",
  isCurrent: true,
  description: "",
  visibility: "CLASS",
  includeInStats: false,
};

const VALID_EDUCATION = {
  entryId: "",
  institution: "ADA Universiteti",
  degree: "MASTER",
  field: "Kompüter elmləri",
  country: "Azərbaycan",
  startYear: "2023",
  endYear: "2025",
  isCurrent: false,
  visibility: "CLASS",
  includeInStats: false,
};

/** Səhv mesajının hansı sahəyə düşdüyünü yoxlamaq üçün. */
function issuePaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }) {
  return (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

// ---------------------------------------------------------------------------
// updateProfileSchema
// ---------------------------------------------------------------------------

describe("updateProfileSchema", () => {
  it("etibarlı formanı qəbul edir", () => {
    expect(updateProfileSchema.safeParse(VALID_PROFILE).success).toBe(true);
  });

  it("🔴 boş ad rədd olunur", () => {
    const result = updateProfileSchema.safeParse({ ...VALID_PROFILE, firstName: "" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("firstName");
  });

  it("yalnız boşluqdan ibarət soyad da rədd olunur", () => {
    const result = updateProfileSchema.safeParse({ ...VALID_PROFILE, lastName: "   " });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("lastName");
  });

  it("🔴 profil şəkli ünvanının formatı yoxlanılır", () => {
    const bad = updateProfileSchema.safeParse({
      ...VALID_PROFILE,
      avatarUrl: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
    expect(issuePaths(bad)).toContain("avatarUrl");

    // Xarici ünvan (seed avatarları) və yüklənmiş fayl — ikisi də keçir.
    expect(
      updateProfileSchema.safeParse({
        ...VALID_PROFILE,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=a",
      }).success,
    ).toBe(true);

    expect(
      updateProfileSchema.safeParse({ ...VALID_PROFILE, avatarUrl: "/uploads/a.webp" }).success,
    ).toBe(true);
  });

  it("yol qaçışı olan yüklənmə yolu rədd olunur", () => {
    const result = updateProfileSchema.safeParse({
      ...VALID_PROFILE,
      avatarUrl: "/uploads/../../etc/passwd",
    });

    expect(result.success).toBe(false);
  });

  it("şəxsi e-poçt formatı yoxlanılır, boş dəyər isə keçir", () => {
    expect(
      updateProfileSchema.safeParse({ ...VALID_PROFILE, personalEmail: "salam" }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ ...VALID_PROFILE, personalEmail: "a@mail.az" }).success,
    ).toBe(true);
    expect(
      updateProfileSchema.safeParse({ ...VALID_PROFILE, personalEmail: "" }).success,
    ).toBe(true);
  });

  it("naməlum sənaye dəyəri rədd olunur", () => {
    const result = updateProfileSchema.safeParse({ ...VALID_PROFILE, industry: "CRYPTO" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("industry");
  });

  it("naməlum görünürlük səviyyəsi rədd olunur", () => {
    const result = updateProfileSchema.safeParse({
      ...VALID_PROFILE,
      visibility: { ...VALID_PROFILE.visibility, bio: "EVERYONE" },
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("visibility.bio");
  });

  it("🔴 22 sahənin HAMISI üçün səviyyə tələb olunur", () => {
    // Çatışmayan açar səssizcə defolta düşməməlidir: forma nə göndərirsə,
    // istifadəçi məhz onu görüb.
    const partial = { ...VALID_PROFILE.visibility };
    delete (partial as Record<string, string>).bio;
    const result = updateProfileSchema.safeParse({ ...VALID_PROFILE, visibility: partial });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("visibility.bio");
  });

  it("dil səviyyəsi yalnız məlum dəyər ola bilər", () => {
    expect(
      updateProfileSchema.safeParse({
        ...VALID_PROFILE,
        tags: [{ tagId: "tag-01", level: "C1" }],
      }).success,
    ).toBe(true);

    expect(
      updateProfileSchema.safeParse({
        ...VALID_PROFILE,
        tags: [{ tagId: "tag-01", level: "Z9" }],
      }).success,
    ).toBe(false);
  });

  it("TƏLƏ T3: sahələrin GİRİŞ tipi çıxış tipi ilə eynidir (coerce yoxdur)", () => {
    // Ədəd göndərilsə Zod onu sətrə ÇEVİRMƏMƏLİDİR — `z.coerce` işlədilsəydi
    // keçərdi və RHF sahə tipləri dağılardı.
    const result = updateProfileSchema.safeParse({ ...VALID_PROFILE, hometown: 42 });

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Forma quruluşu — bölmələr `/me/privacy` ilə eyni olmalıdır
// ---------------------------------------------------------------------------

describe("forma quruluşu", () => {
  it("hər idarə olunan sahənin idarəedicisi var", () => {
    for (const field of CONTROLLED_PROFILE_FIELDS) {
      expect(PROFILE_FIELD_CONTROLS[field], field).toBeDefined();
    }
  });

  it("bölmələr 22 sahənin hamısını əhatə edir və təkrarlamır", () => {
    const fields = PROFILE_FORM_SECTIONS.flatMap((section) => [...section.fields]);

    expect(new Set(fields).size).toBe(fields.length);
    expect([...fields].sort()).toEqual([...CONTROLLED_PROFILE_FIELDS].sort());
  });
});

// ---------------------------------------------------------------------------
// careerEntrySchema
// ---------------------------------------------------------------------------

describe("careerEntrySchema", () => {
  it("cari iş üçün bitmə tarixi tələb olunmur", () => {
    expect(careerEntrySchema.safeParse(VALID_CAREER).success).toBe(true);
  });

  it("keçmiş iş üçün bitmə tarixi MƏCBURİDİR", () => {
    const result = careerEntrySchema.safeParse({
      ...VALID_CAREER,
      isCurrent: false,
      endDate: "",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("endDate");
  });

  it("cari iş + bitmə tarixi ziddiyyəti rədd olunur", () => {
    const result = careerEntrySchema.safeParse({
      ...VALID_CAREER,
      isCurrent: true,
      endDate: "2025-01-01",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("endDate");
  });

  it("bitmə tarixi başlama tarixindən əvvəl ola bilməz", () => {
    const result = careerEntrySchema.safeParse({
      ...VALID_CAREER,
      isCurrent: false,
      startDate: "2024-02-01",
      endDate: "2023-01-01",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("endDate");
  });

  it("şirkət və vəzifə boş ola bilməz", () => {
    const result = careerEntrySchema.safeParse({
      ...VALID_CAREER,
      company: "",
      position: "   ",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(expect.arrayContaining(["company", "position"]));
  });

  it("xarab tarix sətri rədd olunur", () => {
    const result = careerEntrySchema.safeParse({ ...VALID_CAREER, startDate: "abc" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("startDate");
  });

  it("iki razılıq AYRI sahələrdir və müstəqil dəyər ala bilər", () => {
    // `PUBLIC` + statistikadan kənar — tamamilə normal kombinasiya.
    const result = careerEntrySchema.safeParse({
      ...VALID_CAREER,
      visibility: "PUBLIC",
      includeInStats: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibility).toBe("PUBLIC");
      expect(result.data.includeInStats).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// educationEntrySchema
// ---------------------------------------------------------------------------

describe("educationEntrySchema", () => {
  it("etibarlı qeydi qəbul edir", () => {
    expect(educationEntrySchema.safeParse(VALID_EDUCATION).success).toBe(true);
  });

  it("TƏLƏ T3: il SƏTİRDİR — ədəd göndərilsə rədd olunur", () => {
    const result = educationEntrySchema.safeParse({ ...VALID_EDUCATION, startYear: 2023 });

    expect(result.success).toBe(false);
  });

  it("dörd rəqəmdən ibarət olmayan il rədd olunur", () => {
    for (const bad of ["23", "20233", "iki min"]) {
      const result = educationEntrySchema.safeParse({ ...VALID_EDUCATION, startYear: bad });
      expect(result.success, bad).toBe(false);
    }
  });

  it("davam edən təhsildə bitmə ili boş olmalıdır", () => {
    expect(
      educationEntrySchema.safeParse({
        ...VALID_EDUCATION,
        isCurrent: true,
        endYear: "",
      }).success,
    ).toBe(true);

    const result = educationEntrySchema.safeParse({
      ...VALID_EDUCATION,
      isCurrent: true,
      endYear: "2025",
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("endYear");
  });

  it("bitmə ili başlama ilindən əvvəl ola bilməz", () => {
    const result = educationEntrySchema.safeParse({
      ...VALID_EDUCATION,
      startYear: "2025",
      endYear: "2023",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("endYear");
  });

  it("naməlum dərəcə rədd olunur", () => {
    const result = educationEntrySchema.safeParse({ ...VALID_EDUCATION, degree: "ASSOCIATE" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("degree");
  });
});

// ---------------------------------------------------------------------------
// supportSettingsSchema — ÜÇÜNCÜ razılıq
// ---------------------------------------------------------------------------

describe("supportSettingsSchema", () => {
  const base = {
    openToSupport: false,
    offers: [{ type: "MENTORING", selected: true, note: "Ayda bir dəfə" }],
  };

  it("bayraq sönülü ikən də seçim saxlanıla bilir", () => {
    // Səssiz uğursuzluğun qarşısı UI-dadır (xəbərdarlıq), sxem isə bunu
    // QADAĞAN ETMİR: istifadəçi seçimlərini hazırlayıb sonra aça bilər.
    expect(supportSettingsSchema.safeParse(base).success).toBe(true);
  });

  it("naməlum dəstək növü rədd olunur", () => {
    const result = supportSettingsSchema.safeParse({
      ...base,
      offers: [{ type: "COFFEE", selected: true, note: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("qeyd uzunluğu məhdudlaşdırılır", () => {
    const result = supportSettingsSchema.safeParse({
      ...base,
      offers: [{ type: "MENTORING", selected: true, note: "x".repeat(301) }],
    });

    expect(result.success).toBe(false);
  });
});
