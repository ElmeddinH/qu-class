// ============================================================================
// src/lib/visibility.test.ts
// Məxfilik mühərrikinin TƏMİZ funksiya testləri — DB YOXDUR.
//
// Bu fayl `src/lib/visibility.ts`-in müqavilələrini bərkidir. Real bazaya
// qarşı yoxlama `tests/integration/visibility.db.test.ts`-dədir.
// ============================================================================

import { describe, expect, it, vi } from "vitest";

import { PRIVACY_SECTIONS } from "@/features/privacy/fields";
import {
  ANONYMOUS,
  CONTROLLED_PROFILE_FIELDS,
  DEFAULT_PRIVATE_FIELDS,
  MIN_BUCKET_SIZE,
  RELATIONAL_PROFILE_FIELDS,
  VISIBILITY_LEVELS,
  activeVisibleWhere,
  canModerate,
  canView,
  defaultLevelFor,
  isStricter,
  isVisibility,
  narrowest,
  redactProfile,
  suppressSmallBuckets,
  timelineVisibilityWhere,
  visibilityWhere,
  visibilityWhereForUserOwned,
  visibleWithStatus,
  type Guarded,
  type ProfileView,
  type Viewer,
  type Visibility,
} from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Sabitlər
// ---------------------------------------------------------------------------

const COHORT_A = "coh-a";
const COHORT_B = "coh-b";

const OWNER_ID = "usr-owner";
const CLASSMATE_ID = "usr-classmate";
const OUTSIDER_ID = "usr-outsider";
const ADMIN_ID = "usr-admin";

const owner: Viewer = {
  kind: "USER",
  userId: OWNER_ID,
  cohortIds: [COHORT_A],
  systemRole: "USER",
  moderatedCohortIds: [],
};

/** Sahiblə EYNİ sinifdə, amma başqa adam. */
const classmate: Viewer = {
  kind: "USER",
  userId: CLASSMATE_ID,
  cohortIds: [COHORT_A],
  systemRole: "USER",
  moderatedCohortIds: [],
};

/** Təsdiqlənmiş QU istifadəçisi, amma BAŞQA sinifdən. */
const outsider: Viewer = {
  kind: "USER",
  userId: OUTSIDER_ID,
  cohortIds: [COHORT_B],
  systemRole: "USER",
  moderatedCohortIds: [],
};

const admin: Viewer = {
  kind: "USER",
  userId: ADMIN_ID,
  cohortIds: [COHORT_B],
  systemRole: "UNIVERSITY_ADMIN",
  moderatedCohortIds: [],
};

function resource(visibility: string, cohortId: string | null = COHORT_A): Guarded {
  return { ownerId: OWNER_ID, cohortId, visibility };
}

// ===========================================================================
// 1. MATRİS — 4 səviyyə × 4 viewer tipi = 16 hal
// ===========================================================================

describe("canView — 4 səviyyə × 4 viewer matrisi (16 hal)", () => {
  const VIEWERS = [
    ["anonim", ANONYMOUS],
    ["sahib", owner],
    ["eyni sinif", classmate],
    ["fərqli sinif", outsider],
  ] as const;

  /** Gözlənilən nəticə cədvəli: [anonim, sahib, eyni sinif, fərqli sinif] */
  const EXPECTED: Record<Visibility, [boolean, boolean, boolean, boolean]> = {
    PUBLIC: [true, true, true, true],
    UNIVERSITY: [false, true, true, true],
    CLASS: [false, true, true, false],
    PRIVATE: [false, true, false, false],
  };

  const cases = VISIBILITY_LEVELS.flatMap((level) =>
    VIEWERS.map(([name, viewer], index) => ({
      level,
      name,
      viewer,
      expected: EXPECTED[level][index],
    })),
  );

  // 4 × 4 = 16 — sayı da yoxlanılır ki, kimsə səviyyə əlavə edib matrisi
  // yeniləməyi unutmasın.
  it("matris tam 16 haldan ibarətdir", () => {
    expect(cases).toHaveLength(16);
  });

  it.each(cases)("$level · $name → $expected", ({ level, viewer, expected }) => {
    expect(canView(viewer, resource(level))).toBe(expected);
  });
});

// ===========================================================================
// 2. PRIVATE — administrator da oxumur
// ===========================================================================

describe("PRIVATE", () => {
  it("UNIVERSITY_ADMIN da PRIVATE məzmunu OXUYA BİLMİR", () => {
    expect(canView(admin, resource("PRIVATE"))).toBe(false);
  });

  it("admin sahibin cohort-unda olsa belə PRIVATE bağlıdır", () => {
    const adminInCohortA: Viewer = { ...admin, cohortIds: [COHORT_A] };
    expect(canView(adminInCohortA, resource("PRIVATE"))).toBe(false);
  });

  it("moderasiya AYRI axındır — canModerate admin üçün açıqdır", () => {
    // ⚠️ Bu, adi oxu deyil: hər çağırışda AuditLog yazılmalıdır.
    expect(canModerate(admin, resource("PRIVATE"))).toBe(true);
    expect(canModerate(classmate, resource("PRIVATE"))).toBe(false);
  });

  it("cohort moderatoru yalnız ÖZ cohort-unda moderasiya edir", () => {
    const moderator: Viewer = {
      kind: "USER",
      userId: "usr-mod",
      cohortIds: [COHORT_A],
      systemRole: "USER",
      moderatedCohortIds: [COHORT_A],
    };
    expect(canModerate(moderator, resource("PRIVATE", COHORT_A))).toBe(true);
    expect(canModerate(moderator, resource("PRIVATE", COHORT_B))).toBe(false);
  });
});

// ===========================================================================
// 3. TƏLƏ 2 — CLASS + cohortId = null heç kimə görünmür
// ===========================================================================

describe("CLASS + cohortId = null (TƏLƏ 2)", () => {
  // `Event.cohortId` NULL ola bilər (UNIVERSITY / FACULTY tədbirləri).
  // Sinif səviyyəsində işarələnmiş, amma sinfi göstərilməmiş qeyd HEÇ KİMƏ
  // görünməməlidir. Bu davranış TƏSADÜFİ deyil — "düzəldib" sındırma.

  it.each([
    ["anonim", ANONYMOUS],
    ["eyni sinif", classmate],
    ["fərqli sinif", outsider],
    ["admin", admin],
  ])("%s CLASS + null cohort qeydini GÖRMÜR", (_name, viewer) => {
    expect(canView(viewer, resource("CLASS", null))).toBe(false);
  });

  it("yalnız sahibi görür (sahib şaxəsi səviyyədən əvvəl işləyir)", () => {
    expect(canView(owner, resource("CLASS", null))).toBe(true);
  });

  it("SQL şaxəsi `cohortId IN (...)` qurur — NULL heç vaxt uyğun gəlmir", () => {
    // SQL semantikası: `NULL IN (...)` nə TRUE, nə FALSE — UNKNOWN, yəni sətir
    // seçilmir. `canView` ilə eyni nəticə. Şərtin forması burada bərkidilir ki,
    // kimsə onu `OR cohortId IS NULL` ilə "genişləndirməsin".
    const where = visibilityWhere<Record<string, unknown>>(classmate, "authorId");
    const branches = where.OR as Array<Record<string, unknown>>;
    const classBranch = branches.find((b) => b.visibility === "CLASS");

    expect(classBranch).toEqual({ visibility: "CLASS", cohortId: { in: [COHORT_A] } });
    expect(JSON.stringify(where)).not.toContain("null");
  });
});

// ===========================================================================
// 4. visibilityWhere — sorğu səviyyəsində filtr
// ===========================================================================

describe("visibilityWhere", () => {
  it("ANONYMOUS üçün YALNIZ PUBLIC qaytarır", () => {
    expect(visibilityWhere(ANONYMOUS)).toEqual({ visibility: "PUBLIC" });
  });

  it("ANONYMOUS şərtində PRIVATE, CLASS, UNIVERSITY ümumiyyətlə YOXDUR", () => {
    const serialized = JSON.stringify(visibilityWhere(ANONYMOUS));
    expect(serialized).not.toContain("PRIVATE");
    expect(serialized).not.toContain("CLASS");
    expect(serialized).not.toContain("UNIVERSITY");
  });

  it("giriş etmiş istifadəçi üçün 4 şaxə qurur, PRIVATE şaxəsi YOXDUR", () => {
    const where = visibilityWhere<Record<string, unknown>>(classmate, "authorId");
    expect(where).toEqual({
      OR: [
        { authorId: CLASSMATE_ID },
        { visibility: "PUBLIC" },
        { visibility: "UNIVERSITY" },
        { visibility: "CLASS", cohortId: { in: [COHORT_A] } },
      ],
    });
    expect(JSON.stringify(where)).not.toContain("PRIVATE");
  });

  it("ownerField modelə görə dəyişir", () => {
    const where = visibilityWhere<Record<string, unknown>>(owner, "createdById");
    expect((where.OR as Array<Record<string, unknown>>)[0]).toEqual({
      createdById: OWNER_ID,
    });
  });

  it("cohort üzvlüyü olmayan istifadəçidə CLASS şaxəsi boş massivə düşür", () => {
    const noCohorts: Viewer = { ...classmate, cohortIds: [] };
    const where = visibilityWhere<Record<string, unknown>>(noCohorts);
    const branches = where.OR as Array<Record<string, unknown>>;
    // `IN ()` heç bir sətrə uyğun gəlmir — heç nə sızmır.
    expect(branches.find((b) => b.visibility === "CLASS")).toEqual({
      visibility: "CLASS",
      cohortId: { in: [] },
    });
  });
});

// ===========================================================================
// 5. visibleWithStatus — status filtri SAHİBƏ tətbiq olunmur
// ===========================================================================

describe("visibleWithStatus", () => {
  it("sahib şaxəsi status AND-ından KƏNARDADIR", () => {
    const where = visibleWithStatus<Record<string, unknown>>(
      owner,
      ["VERIFIED", "FEATURED"],
      "ownerId",
    );

    expect(where).toEqual({
      OR: [
        // 1) Sahib — statusdan ASILI OLMAYARAQ (öz SUBMITTED nailiyyətini görür)
        { ownerId: OWNER_ID },
        // 2) Başqaları — status + səviyyə birlikdə
        {
          AND: [
            { status: { in: ["VERIFIED", "FEATURED"] } },
            {
              OR: [
                { visibility: "PUBLIC" },
                { visibility: "UNIVERSITY" },
                { visibility: "CLASS", cohortId: { in: [COHORT_A] } },
              ],
            },
          ],
        },
      ],
    });
  });

  it("sahib şaxəsində status şərti YOXDUR", () => {
    const where = visibleWithStatus<Record<string, unknown>>(owner, ["VERIFIED"], "ownerId");
    const ownerBranch = (where.OR as Array<Record<string, unknown>>)[0];
    expect(ownerBranch).not.toHaveProperty("status");
    expect(Object.keys(ownerBranch)).toEqual(["ownerId"]);
  });

  it("ANONYMOUS üçün status VƏ PUBLIC birlikdə tələb olunur", () => {
    expect(visibleWithStatus(ANONYMOUS, ["PUBLISHED", "COMPLETED"], "createdById")).toEqual({
      AND: [
        { status: { in: ["PUBLISHED", "COMPLETED"] } },
        { visibility: "PUBLIC" },
      ],
    });
  });

  it("activeVisibleWhere `ACTIVE` sabitini işlədir (yalnız Post/Memory)", () => {
    const where = activeVisibleWhere<Record<string, unknown>>(ANONYMOUS, "authorId");
    expect(where).toEqual({
      AND: [{ status: { in: ["ACTIVE"] } }, { visibility: "PUBLIC" }],
    });
  });
});

// ===========================================================================
// 6. TƏLƏ 1 — cohortId sütunu OLMAYAN modellər (CareerEntry / EducationEntry)
// ===========================================================================

describe("visibilityWhereForUserOwned (TƏLƏ 1)", () => {
  it("ANONYMOUS üçün yalnız PUBLIC", () => {
    expect(visibilityWhereForUserOwned(ANONYMOUS)).toEqual({ visibility: "PUBLIC" });
  });

  it("CLASS şaxəsi SAHİBİN üzvlüyünə baxır, `cohortId` sütununa YOX", () => {
    const where = visibilityWhereForUserOwned<Record<string, unknown>>(classmate);

    expect(where).toEqual({
      OR: [
        { userId: CLASSMATE_ID },
        { visibility: "PUBLIC" },
        { visibility: "UNIVERSITY" },
        {
          visibility: "CLASS",
          user: { memberships: { some: { cohortId: { in: [COHORT_A] } } } },
        },
      ],
    });
  });

  it("mövcud olmayan `cohortId` sütununa şərt QURMUR", () => {
    // Bu iki modeldə `cohortId` sütunu yoxdur — şaxənin ÖZ səviyyəsində
    // görünsə Prisma xəta verər (və ya daha pisi: səhv nəticə). İç-içə
    // `user.memberships.some.cohortId` isə TAM DÜZGÜNDÜR — o, CohortMembership
    // cədvəlinin sütunudur.
    const where = visibilityWhereForUserOwned<Record<string, unknown>>(classmate);
    const branches = where.OR as Array<Record<string, unknown>>;

    for (const branch of branches) {
      expect(branch).not.toHaveProperty("cohortId");
    }
    expect(branches.at(-1)).toHaveProperty("user");
  });

  it("PRIVATE şaxəsi yoxdur — yalnız sahib şaxəsi ilə görünür", () => {
    expect(JSON.stringify(visibilityWhereForUserOwned(owner))).not.toContain("PRIVATE");
  });
});

// ===========================================================================
// 7. TimelineEntry — sahib sütunu olmayan model
// ===========================================================================

describe("timelineVisibilityWhere", () => {
  it("sahib şaxəsini MƏNBƏ əlaqələrindən qurur", () => {
    const where = timelineVisibilityWhere<Record<string, unknown>>(owner);
    expect(where).toEqual({
      OR: [
        { post: { authorId: OWNER_ID } },
        { achievement: { ownerId: OWNER_ID } },
        { event: { createdById: OWNER_ID } },
        { visibility: "PUBLIC" },
        { visibility: "UNIVERSITY" },
        { visibility: "CLASS", cohortId: { in: [COHORT_A] } },
      ],
    });
  });

  it("TimelineEntry-də olmayan sahib sütunlarına ŞAXƏ SƏVİYYƏSİNDƏ şərt qurmur", () => {
    // `authorId` / `ownerId` / `createdById` TimelineEntry-də YOXDUR — onlar
    // yalnız MƏNBƏ əlaqəsinin içində görünə bilər (`post: { authorId }`).
    const where = timelineVisibilityWhere<Record<string, unknown>>(owner);
    const branches = where.OR as Array<Record<string, unknown>>;

    for (const branch of branches) {
      expect(branch).not.toHaveProperty("authorId");
      expect(branch).not.toHaveProperty("ownerId");
      expect(branch).not.toHaveProperty("createdById");
    }
  });

  it("ANONYMOUS üçün yalnız PUBLIC", () => {
    expect(timelineVisibilityWhere(ANONYMOUS)).toEqual({ visibility: "PUBLIC" });
  });
});

// ===========================================================================
// 8. Naməlum səviyyə → fail closed
// ===========================================================================

describe("naməlum səviyyə (fail closed)", () => {
  it("canView tanınmayan səviyyəni RƏDD edir", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(canView(classmate, resource("SUPER_PUBLIC"))).toBe(false);
    expect(canView(ANONYMOUS, resource(""))).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("sahib naməlum səviyyədə də öz məzmununu görür", () => {
    // Sahib şaxəsi səviyyə yoxlamasından ƏVVƏLdir — istifadəçi pozulmuş
    // dəyər ucbatından öz məzmununu itirməməlidir.
    expect(canView(owner, resource("SUPER_PUBLIC"))).toBe(true);
  });

  it("isVisibility yalnız 4 səviyyəni tanıyır", () => {
    expect(VISIBILITY_LEVELS.every(isVisibility)).toBe(true);
    expect(isVisibility("public")).toBe(false);
    expect(isVisibility("EVERYONE")).toBe(false);
  });
});

// ===========================================================================
// 9. redactProfile — sahə-səviyyə məxfilik
// ===========================================================================

function profileOf(overrides: Partial<ProfileView> = {}): ProfileView {
  return {
    id: OWNER_ID,
    firstName: "Aysel",
    lastName: "Məmmədova",
    cohortIds: [COHORT_A],
    bio: "Salam",
    phone: "+994 50 000 00 00",
    personalEmail: "aysel@mail.az",
    hometown: "Şuşa",
    interests: ["Robototexnika"],
    careerHistory: [{ id: "car-1", company: "QU" }],
    ...overrides,
  };
}

const ALL_CLASS = CONTROLLED_PROFILE_FIELDS.map((field) => ({ field, level: "CLASS" }));

describe("redactProfile", () => {
  it("sahibə HƏR ŞEYİ olduğu kimi qaytarır", () => {
    const profile = profileOf();
    expect(redactProfile(profile, owner, [])).toBe(profile);
  });

  it("ad-soyad həmişə görünür (platformanın minimumu)", () => {
    const result = redactProfile(
      profileOf(),
      ANONYMOUS,
      CONTROLLED_PROFILE_FIELDS.map((field) => ({ field, level: "PRIVATE" })),
    );
    expect(result).toEqual({
      id: OWNER_ID,
      firstName: "Aysel",
      lastName: "Məmmədova",
    });
  });

  it("görünməyən sahə obyektdən TAMAMİLƏ SİLİNİR (null qoyulmur)", () => {
    const result = redactProfile(profileOf(), ANONYMOUS, ALL_CLASS);
    // Açarın MÖVCUDLUĞU belə sızmamalıdır.
    expect("phone" in result).toBe(false);
    expect("bio" in result).toBe(false);
    expect(result.phone).toBeUndefined();
  });

  it("CLASS sahəsini eyni sinif görür, fərqli sinif GÖRMÜR", () => {
    expect(redactProfile(profileOf(), classmate, ALL_CLASS).bio).toBe("Salam");
    expect("bio" in redactProfile(profileOf(), outsider, ALL_CLASS)).toBe(false);
  });

  it("UNIVERSITY sahəsini fərqli sinif görür, anonim GÖRMÜR", () => {
    const levels = [{ field: "bio", level: "UNIVERSITY" }];
    expect(redactProfile(profileOf(), outsider, levels).bio).toBe("Salam");
    expect("bio" in redactProfile(profileOf(), ANONYMOUS, levels)).toBe(false);
  });

  it("PUBLIC sahəsini anonim də görür", () => {
    const levels = [{ field: "bio", level: "PUBLIC" }];
    expect(redactProfile(profileOf(), ANONYMOUS, levels).bio).toBe("Salam");
  });

  it("PRIVATE sahəsini UNIVERSITY_ADMIN da GÖRMÜR", () => {
    const levels = [{ field: "phone", level: "PRIVATE" }];
    expect("phone" in redactProfile(profileOf(), admin, levels)).toBe(false);
  });

  it("sətri olmayan sahə `defaultLevelFor`-a düşür", () => {
    // Boş `fieldVisibility` → phone PRIVATE, bio CLASS.
    const forClassmate = redactProfile(profileOf(), classmate, []);
    expect("phone" in forClassmate).toBe(false);
    expect(forClassmate.bio).toBe("Salam");
  });

  it("naməlum səviyyə sahəni GİZLƏDİR (fail closed)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const levels = [{ field: "bio", level: "EVERYONE" }];
    expect("bio" in redactProfile(profileOf(), ANONYMOUS, levels)).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("idarə olunmayan sahə çıxışa DÜŞMÜR (ağ siyahı prinsipi)", () => {
    const profile = profileOf({ passwordHash: "gizli", email: "a@qu.edu.az" });
    const result = redactProfile(profile, classmate, ALL_CLASS);
    expect("passwordHash" in result).toBe(false);
    expect("email" in result).toBe(false);
  });
});

// ===========================================================================
// 10. TƏLƏ 3 — düzləndirilməmiş əlaqə sahələri
// ===========================================================================

describe("əlaqə sahələrinin düzləndirilməsi (TƏLƏ 3)", () => {
  it("obyektdə OLMAYAN əlaqə sahəsi sadəcə ATLANIR — bu, səssiz uğursuzluqdur", () => {
    // `buildProfileView` düzləndirməsə `redactProfile` bu 7 açarı görmür və
    // həmin məxfilik tənzimləmələri HEÇ NƏ ETMİR. Test bu davranışı sənədləşdirir:
    // qoruma yoxdur, çünki DƏYƏR də yoxdur — təhlükə dəyərin BAŞQA yolla
    // (məsələn xam `user` obyekti ilə) sızmasındadır.
    const flat: ProfileView = {
      id: OWNER_ID,
      firstName: "Aysel",
      lastName: "Məmmədova",
      cohortIds: [COHORT_A],
    };

    const result = redactProfile(flat, classmate, ALL_CLASS);

    for (const field of RELATIONAL_PROFILE_FIELDS) {
      expect(field in result).toBe(false);
    }
  });

  it("düzləndirilmiş əlaqə sahələri məxfilik açarına TABE olur", () => {
    const profile = profileOf({
      interests: ["Robototexnika"],
      hobbies: ["Şahmat"],
      skills: ["TypeScript"],
      languages: [{ name: "İngilis", level: "C1" }],
      clubs: [{ id: "clb-1", name: "IT Klub" }],
      careerHistory: [{ id: "car-1", company: "QU" }],
      education: [{ id: "edu-1", institution: "QU" }],
    });

    // Eyni sinif CLASS sahələrini görür...
    const forClassmate = redactProfile(profile, classmate, ALL_CLASS);
    for (const field of RELATIONAL_PROFILE_FIELDS) {
      expect(forClassmate[field]).toBeDefined();
    }

    // ...fərqli sinif GÖRMÜR.
    const forOutsider = redactProfile(profile, outsider, ALL_CLASS);
    for (const field of RELATIONAL_PROFILE_FIELDS) {
      expect(field in forOutsider).toBe(false);
    }
  });

  it("RELATIONAL_PROFILE_FIELDS tam 7 sahədir və hamısı idarə olunur", () => {
    expect(RELATIONAL_PROFILE_FIELDS).toHaveLength(7);
    for (const field of RELATIONAL_PROFILE_FIELDS) {
      expect(CONTROLLED_PROFILE_FIELDS).toContain(field);
    }
  });
});

// ===========================================================================
// 11. Default səviyyələr
// ===========================================================================

describe("defaultLevelFor", () => {
  it("phone və personalEmail PRIVATE-dir (spec §5)", () => {
    expect(defaultLevelFor("phone")).toBe("PRIVATE");
    expect(defaultLevelFor("personalEmail")).toBe("PRIVATE");
    expect(DEFAULT_PRIVATE_FIELDS).toEqual(["phone", "personalEmail"]);
  });

  it("qalan sahələr CLASS-dır (PUBLIC DEYİL)", () => {
    for (const field of CONTROLLED_PROFILE_FIELDS) {
      const expected = (DEFAULT_PRIVATE_FIELDS as readonly string[]).includes(field)
        ? "PRIVATE"
        : "CLASS";
      expect(defaultLevelFor(field)).toBe(expected);
    }
  });

  it("naməlum sahə də CLASS-a düşür, PUBLIC-ə yox", () => {
    expect(defaultLevelFor("nonexistentField")).toBe("CLASS");
  });
});

// ===========================================================================
// 12. Səviyyə müqayisəsi — narrowest / isStricter
// ===========================================================================

describe("narrowest / isStricter", () => {
  it("sıra istiqaməti: PUBLIC < UNIVERSITY < CLASS < PRIVATE", () => {
    expect(isStricter("PRIVATE", "CLASS")).toBe(true);
    expect(isStricter("CLASS", "UNIVERSITY")).toBe(true);
    expect(isStricter("UNIVERSITY", "PUBLIC")).toBe(true);
    expect(isStricter("PUBLIC", "PRIVATE")).toBe(false);
    expect(isStricter("CLASS", "CLASS")).toBe(false);
  });

  it("narrowest həmişə DAHA MƏHDUD olanı seçir", () => {
    expect(narrowest("PUBLIC", "CLASS")).toBe("CLASS");
    expect(narrowest("CLASS", "PUBLIC")).toBe("CLASS");
    expect(narrowest("PRIVATE", "PUBLIC")).toBe("PRIVATE");
    expect(narrowest("UNIVERSITY", "UNIVERSITY")).toBe("UNIVERSITY");
  });

  it("Timeline mənbədən DAHA AÇIQ ola bilmir", () => {
    // Törəmə qeyd üçün: narrowest(mənbə, tavan) heç vaxt mənbəni genişlətmir.
    for (const source of VISIBILITY_LEVELS) {
      for (const ceiling of VISIBILITY_LEVELS) {
        const derived = narrowest(source, ceiling);
        expect(isStricter(source, derived)).toBe(false);
      }
    }
  });
});

// ===========================================================================
// 13. Aqreqasiya — k-anonimlik
// ===========================================================================

describe("suppressSmallBuckets", () => {
  it("3 nəfərdən KİÇİK xanaları gizlədir", () => {
    const { visible, otherCount } = suppressSmallBuckets([
      { key: "Bakı", count: 12 },
      { key: "Xankəndi", count: 3 },
      { key: "Berlin", count: 2 },
      { key: "Tokio", count: 1 },
    ]);

    expect(visible.map((b) => b.key)).toEqual(["Bakı", "Xankəndi"]);
    expect(otherCount).toBe(3); // 2 + 1
  });

  it("hədd tam 3-dür — sərhəd daxildir", () => {
    expect(MIN_BUCKET_SIZE).toBe(3);
    expect(suppressSmallBuckets([{ count: 3 }]).visible).toHaveLength(1);
    expect(suppressSmallBuckets([{ count: 2 }]).visible).toHaveLength(0);
  });

  it("bütün xanalar kiçikdirsə heç nə göstərilmir", () => {
    const result = suppressSmallBuckets([{ count: 1 }, { count: 2 }, { count: 1 }]);
    expect(result.visible).toEqual([]);
    expect(result.otherCount).toBe(4);
  });

  it("boş girişdə sıfır", () => {
    expect(suppressSmallBuckets([])).toEqual({ visible: [], otherCount: 0 });
  });
});

// ===========================================================================
// 14. /me/privacy paneli bütün sahələri əhatə edir
// ===========================================================================

describe("PRIVACY_SECTIONS", () => {
  it("hər idarə olunan sahə TAM BİR bölmədədir", () => {
    const inSections = PRIVACY_SECTIONS.flatMap((section) => section.fields);

    // Əhatə: unudulan sahə panelə düşməz və istifadəçi onu idarə edə bilməz.
    for (const field of CONTROLLED_PROFILE_FIELDS) {
      expect(inSections).toContain(field);
    }
    // Dublikat: iki bölmədə görünən sahə iki fərqli seçici ilə ziddiyyət yaradar.
    expect(inSections).toHaveLength(CONTROLLED_PROFILE_FIELDS.length);
    expect(new Set(inSections).size).toBe(CONTROLLED_PROFILE_FIELDS.length);
  });
});
