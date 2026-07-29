// ============================================================================
// src/lib/directory-filters.test.ts
// Kataloq filtrlərinin SAF məntiqi — DB olmadan.
//
// Niyə DB-siz: `directory-filters.ts` qəsdən Prisma import etmir (bax fayl
// başlığı). Buradaki testlər 13 filtrin TƏRİFİNİ və URL dövrəsini yoxlayır;
// həmin tərifin DB-də əsl nəticə verdiyini `tests/integration/directory.db.test.ts`
// yoxlayır. İkisi fərqli şeylərdir.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DIRECTORY_FILTERS,
  DIRECTORY_FILTER_COUNT,
  DIRECTORY_FILTER_KEYS,
  DIRECTORY_PAGE_SIZE,
  FACETED_FILTER_KEYS,
  FIRST_PAGE,
  activeFilterCount,
  directoryHref,
  directoryQueryString,
  emptyDirectoryFilters,
  hasActiveFilters,
  pageCountOf,
  parseDirectoryParams,
  serializeDirectoryParams,
  skipOf,
  type DirectoryFilterState,
} from "@/lib/directory-filters";
import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";

/** Bütün 13 filtri dolu olan vəziyyət — dövrə testləri üçün. */
function fullFilters(): DirectoryFilterState {
  return {
    name: "Aysel",
    faculty: "muhendislik",
    program: "komputer-muhendisliyi",
    admissionYear: 2023,
    graduationYear: 2027,
    city: "Xankəndi",
    country: "Azərbaycan",
    industry: "TECHNOLOGY",
    company: "Azercell",
    interest: ["suni-intellekt", "kibertehlukesizlik"],
    language: ["ingilis-dili"],
    club: ["ai-klubu"],
    status: "STUDENT",
    page: 3,
  };
}

// ===========================================================================
// 1. Filtr → profil sahəsi xəritəsi (spec §8)
// ===========================================================================

describe("DIRECTORY_FILTERS xəritəsi", () => {
  it("dəqiq 13 filtr var", () => {
    expect(DIRECTORY_FILTER_KEYS).toHaveLength(DIRECTORY_FILTER_COUNT);
  });

  it("HƏR filtrin `profileField` qeydi var (null da açıq yazılıb)", () => {
    // 🔴 Bu, blokun ən vacib invariantıdır: sahə göstərilməyən filtr məxfilik
    // şərti qurmur. Açar UNUDULA bilməz — `undefined` səhvdir, `null` isə
    // "struktur məlumat, idarə olunan sahə deyil" mənasında QƏSDLİ seçimdir.
    for (const key of DIRECTORY_FILTER_KEYS) {
      const def = DIRECTORY_FILTERS[key];
      expect(Object.hasOwn(def, "profileField"), `${key} → profileField`).toBe(true);
      expect(def.profileField, `${key} → profileField`).not.toBeUndefined();
    }
  });

  it("göstərilən profil sahələri həqiqətən idarə olunan sahələrdir", () => {
    // Səhv yazılmış sahə adı (`currenCity`) məxfilik şərtini SƏSSİZCƏ işləməz
    // edərdi: `fieldVisibility` sətri heç vaxt uyğun gəlməzdi.
    for (const key of DIRECTORY_FILTER_KEYS) {
      const field = DIRECTORY_FILTERS[key].profileField;
      if (field === null) continue;

      expect(CONTROLLED_PROFILE_FIELDS, `${key} → ${field}`).toContain(field);
    }
  });

  it("məxfilik tələb edən filtrlər sahəyə bağlıdır", () => {
    // Sənəddəki cədvəlin qısa yoxlanışı: dəyəri profil sahəsindən oxuyan
    // filtrlər `null` OLMAMALIDIR.
    const mustHaveField = [
      "city",
      "country",
      "industry",
      "company",
      "interest",
      "language",
      "club",
    ] as const;

    for (const key of mustHaveField) {
      expect(DIRECTORY_FILTERS[key].profileField, key).not.toBeNull();
    }
  });

  it("facet açarları mətn filtrini daxil etmir", () => {
    expect(FACETED_FILTER_KEYS).toHaveLength(DIRECTORY_FILTER_COUNT - 1);
    expect(FACETED_FILTER_KEYS).not.toContain("name");
  });

  it("URL parametr adları unikaldır", () => {
    const params = DIRECTORY_FILTER_KEYS.map((key) => DIRECTORY_FILTERS[key].param);
    expect(new Set(params).size).toBe(params.length);
  });
});

// ===========================================================================
// 2. parseDirectoryParams
// ===========================================================================

describe("parseDirectoryParams", () => {
  it("naməlum açarları atır", () => {
    const filters = parseDirectoryParams({
      city: "Bakı",
      // Naməlum açarlar — URL əl ilə redaktə edilə bilər.
      isAdmin: "true",
      password: "x",
      unknownFilter: "y",
    });

    expect(filters.city).toBe("Bakı");
    expect(filters).toEqual({ ...emptyDirectoryFilters(), city: "Bakı" });
  });

  it("çoxlu dəyər massivə düşür — vergüllə", () => {
    const filters = parseDirectoryParams({ interest: "ai,robotika" });
    expect(filters.interest).toEqual(["ai", "robotika"]);
  });

  it("çoxlu dəyər massivə düşür — təkrarlanan parametr", () => {
    const params = new URLSearchParams();
    params.append("language", "ingilis-dili");
    params.append("language", "alman-dili");

    expect(parseDirectoryParams(params).language).toEqual([
      "ingilis-dili",
      "alman-dili",
    ]);
  });

  it("dublikatları və boşları atır", () => {
    const filters = parseDirectoryParams({ club: "ai-klubu,,ai-klubu, debat " });
    expect(filters.club).toEqual(["ai-klubu", "debat"]);
  });

  it("tək dəyərli filtrdə yalnız BİRİNCİ parametr oxunur", () => {
    const params = new URLSearchParams();
    params.append("city", "Bakı");
    params.append("city", "Gəncə");

    expect(parseDirectoryParams(params).city).toBe("Bakı");
  });

  it("boş sətir `null` olur (filtr yoxdur)", () => {
    expect(parseDirectoryParams({ name: "   " }).name).toBeNull();
    expect(parseDirectoryParams({ city: "" }).city).toBeNull();
  });

  it("mətn kənar boşluqlardan təmizlənir", () => {
    expect(parseDirectoryParams({ name: "  Aysel  " }).name).toBe("Aysel");
  });

  it("səhv il filtri LƏĞV edir, xəta atmır", () => {
    expect(parseDirectoryParams({ admissionYear: "iyirmi" }).admissionYear).toBeNull();
    expect(parseDirectoryParams({ admissionYear: "-5" }).admissionYear).toBeNull();
    expect(parseDirectoryParams({ graduationYear: "99999" }).graduationYear).toBeNull();
    expect(parseDirectoryParams({ admissionYear: "2023" }).admissionYear).toBe(2023);
  });

  it("naməlum status LƏĞV edilir (enum-dan kənar dəyər)", () => {
    expect(parseDirectoryParams({ status: "TEACHER" }).status).toBeNull();
    expect(parseDirectoryParams({ status: "ALUMNI" }).status).toBe("ALUMNI");
  });

  it("səhifə nömrəsi 1-dən kiçik ola bilmir", () => {
    expect(parseDirectoryParams({}).page).toBe(FIRST_PAGE);
    expect(parseDirectoryParams({ page: "0" }).page).toBe(FIRST_PAGE);
    expect(parseDirectoryParams({ page: "-3" }).page).toBe(FIRST_PAGE);
    expect(parseDirectoryParams({ page: "abc" }).page).toBe(FIRST_PAGE);
    expect(parseDirectoryParams({ page: "4" }).page).toBe(4);
  });

  it("Next.js `searchParams` massiv formasını da qəbul edir", () => {
    expect(parseDirectoryParams({ interest: ["ai", "robotika"] }).interest).toEqual([
      "ai",
      "robotika",
    ]);
  });
});

// ===========================================================================
// 3. serialize → parse dövrəsi (paylaşıla bilən link)
// ===========================================================================

describe("serializeDirectoryParams", () => {
  it("dövrə eyni obyekti verir — 13 filtr + səhifə", () => {
    const filters = fullFilters();
    expect(parseDirectoryParams(serializeDirectoryParams(filters))).toEqual(filters);
  });

  it("boş vəziyyət boş sorğu sətri verir", () => {
    const empty = emptyDirectoryFilters();
    expect(serializeDirectoryParams(empty).toString()).toBe("");
    expect(directoryQueryString(empty)).toBe("");
    expect(parseDirectoryParams(serializeDirectoryParams(empty))).toEqual(empty);
  });

  it("birinci səhifə URL-ə yazılmır", () => {
    const filters = { ...emptyDirectoryFilters(), city: "Bakı" };
    expect(serializeDirectoryParams(filters).has("page")).toBe(false);
    expect(serializeDirectoryParams({ ...filters, page: 2 }).get("page")).toBe("2");
  });

  it("parametr sırası TƏRİF sırasıdır — eyni filtr dəsti eyni URL verir", () => {
    const a = serializeDirectoryParams({
      ...emptyDirectoryFilters(),
      city: "Bakı",
      faculty: "muhendislik",
    });
    const b = serializeDirectoryParams({
      ...emptyDirectoryFilters(),
      faculty: "muhendislik",
      city: "Bakı",
    });

    expect(a.toString()).toBe(b.toString());
    expect(a.toString()).toBe("faculty=muhendislik&city=Bak%C4%B1");
  });

  it("kataloq linki filtrləri saxlayır", () => {
    const href = directoryHref("informasiya-tehlukesizliyi-2027", {
      ...emptyDirectoryFilters(),
      city: "Bakı",
      page: 2,
    });

    expect(href).toBe(
      "/class/informasiya-tehlukesizliyi-2027/directory?city=Bak%C4%B1&page=2",
    );
  });

  it("azərbaycan hərfləri dövrədən keçir", () => {
    const filters = { ...emptyDirectoryFilters(), city: "Şəki", name: "Şükür Əliyev" };
    expect(parseDirectoryParams(serializeDirectoryParams(filters))).toEqual(filters);
  });
});

// ===========================================================================
// 4. Köməkçilər
// ===========================================================================

describe("filtr köməkçiləri", () => {
  it("activeFilterCount səhifəni saymır", () => {
    expect(activeFilterCount(emptyDirectoryFilters())).toBe(0);
    expect(activeFilterCount({ ...emptyDirectoryFilters(), page: 5 })).toBe(0);
    expect(hasActiveFilters({ ...emptyDirectoryFilters(), page: 5 })).toBe(false);
  });

  it("activeFilterCount çoxlu filtri BİR sayır", () => {
    const filters = {
      ...emptyDirectoryFilters(),
      interest: ["ai", "robotika"],
      city: "Bakı",
    };
    expect(activeFilterCount(filters)).toBe(2);
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("13 filtrin hamısı birlikdə sayılır", () => {
    expect(activeFilterCount(fullFilters())).toBe(DIRECTORY_FILTER_COUNT);
  });

  it("pageCountOf ən azı 1 qaytarır", () => {
    expect(pageCountOf(0)).toBe(1);
    expect(pageCountOf(1)).toBe(1);
    expect(pageCountOf(DIRECTORY_PAGE_SIZE)).toBe(1);
    expect(pageCountOf(DIRECTORY_PAGE_SIZE + 1)).toBe(2);
  });

  it("skipOf səhifə ölçüsünə bağlıdır", () => {
    expect(skipOf(emptyDirectoryFilters())).toBe(0);
    expect(skipOf({ ...emptyDirectoryFilters(), page: 3 })).toBe(DIRECTORY_PAGE_SIZE * 2);
  });
});
