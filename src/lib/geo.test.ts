// ============================================================================
// src/lib/geo.test.ts
// Statik coğrafi cədvəllərin BÜTÖVLÜYÜ.
//
// 🔴 NİYƏ BU TESTLƏR: cədvəl əl ilə yazılıb və səhvləri SƏSSİZDİR. Şəhərin
// ölkəsini səhv yazsan pin yanlış qitəyə düşür; ISO numeric-i səhv yazsan
// doldurma HEÇ NƏ göstərmir (istisna atılmır). Ona görə uyğunluq testlə
// bərkidilir.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  AZERBAIJAN,
  CITY_COORDS,
  COUNTRY_COORDS,
  NAME_TO_ISO,
  countryNumericOf,
  findCity,
  findCountry,
  isAzerbaijan,
  normalizeCityKey,
} from "./geo";

describe("normalizeCityKey", () => {
  it("hərf variantlarını birləşdirir", () => {
    const expected = "baki";
    for (const variant of ["Bakı", "BAKI", "bakı", " Bakı ", "Baki", "BAKİ"]) {
      expect(normalizeCityKey(variant), variant).toBe(expected);
    }
  });

  it("azərbaycanca diakritikaları qatlayır", () => {
    expect(normalizeCityKey("Şəki")).toBe("seki");
    expect(normalizeCityKey("Sheki")).not.toBe("seki"); // «sh» ayrı yazılışdır
    expect(normalizeCityKey("Gəncə")).toBe("gence");
    expect(normalizeCityKey("Göyçay")).toBe("goycay");
    expect(normalizeCityKey("Mingəçevir")).toBe("mingecevir");
    expect(normalizeCityKey("Xankəndi")).toBe("xankendi");
    expect(normalizeCityKey("Naxçıvan")).toBe("naxcivan");
  });

  it("ayırıcıları (tire, boşluq, nöqtə, apostrof) atır", () => {
    expect(normalizeCityKey("Nyu-York")).toBe(normalizeCityKey("Nyu York"));
    expect(normalizeCityKey("Əbu-Dabi")).toBe(normalizeCityKey("Əbu Dabi"));
    expect(normalizeCityKey("Sankt-Peterburq")).toBe("sanktpeterburq");
    expect(normalizeCityKey("St. Louis")).toBe("stlouis");
  });

  it("boş sətir boş açar verir", () => {
    expect(normalizeCityKey("   ")).toBe("");
    expect(normalizeCityKey("")).toBe("");
  });

  it("İ/I fərqini `az` lokalı ilə həll edir (Türkiyə problemi)", () => {
    // ASCII "I" → "ı" → "i"; "İ" → "i". İkisi eyni açara düşür.
    expect(normalizeCityKey("ISTANBUL")).toBe("istanbul");
    expect(normalizeCityKey("İstanbul")).toBe("istanbul");
    expect(normalizeCityKey("İzmir")).toBe(normalizeCityKey("IZMIR"));
  });
});

describe("cədvəl bütövlüyü", () => {
  it("🔴 hər şəhərin ölkəsi COUNTRY_COORDS-da var (orfan şəhər yoxdur)", () => {
    for (const [city, coord] of Object.entries(CITY_COORDS)) {
      expect(COUNTRY_COORDS, `«${city}» → «${coord.country}» cədvəldə yoxdur`).toHaveProperty(
        coord.country,
      );
    }
  });

  it("koordinatlar etibarlı diapazondadır", () => {
    const entries = [
      ...Object.entries(CITY_COORDS).map(([name, c]) => [`şəhər ${name}`, c] as const),
      ...Object.entries(COUNTRY_COORDS).map(([name, c]) => [`ölkə ${name}`, c] as const),
    ];

    for (const [label, coord] of entries) {
      expect(coord.lat, label).toBeGreaterThanOrEqual(-90);
      expect(coord.lat, label).toBeLessThanOrEqual(90);
      expect(coord.lon, label).toBeGreaterThanOrEqual(-180);
      expect(coord.lon, label).toBeLessThanOrEqual(180);
      // 0/0 (Gulf of Guinea) — doldurulmamış sətrin klassik izi.
      expect(coord.lat === 0 && coord.lon === 0, label).toBe(false);
    }
  });

  it("ISO kodları formaca düzgündür və UNİKALDIR", () => {
    const iso2 = new Set<string>();
    const numeric = new Set<string>();

    for (const [name, coord] of Object.entries(COUNTRY_COORDS)) {
      expect(coord.iso2, name).toMatch(/^[A-Z]{2}$/);
      expect(coord.numeric, name).toMatch(/^\d{3}$/);
      expect(iso2.has(coord.iso2), `${name}: alpha-2 dublikatı`).toBe(false);
      expect(numeric.has(coord.numeric), `${name}: numeric dublikatı`).toBe(false);
      iso2.add(coord.iso2);
      numeric.add(coord.numeric);
    }
  });

  it("NAME_TO_ISO cədvəldən TÖRƏYİR (əl ilə saxlanılan ikinci siyahı yoxdur)", () => {
    expect(Object.keys(NAME_TO_ISO).sort()).toEqual(Object.keys(COUNTRY_COORDS).sort());
    expect(NAME_TO_ISO[AZERBAIJAN]).toBe("AZ");
    expect(NAME_TO_ISO.Türkiyə).toBe("TR");
  });

  it("normallaşdırılmış açarlar toqquşmur (iki şəhər bir açara düşmür)", () => {
    const keys = new Map<string, string>();
    for (const name of Object.keys(CITY_COORDS)) {
      const key = normalizeCityKey(name);
      expect(keys.has(key), `«${name}» ↔ «${keys.get(key)}» eyni açara düşür`).toBe(false);
      keys.set(key, name);
    }
  });

  it("Azərbaycan şəhərləri ölkənin təxmini sərhədləri içindədir", () => {
    // Kobud çərçivə: 38.3…41.95 N, 44.7…50.4 E. Səhv işarə / rəqəm sırası tutulur.
    for (const [city, coord] of Object.entries(CITY_COORDS)) {
      if (coord.country !== AZERBAIJAN) continue;
      expect(coord.lat, city).toBeGreaterThan(38.3);
      expect(coord.lat, city).toBeLessThan(41.95);
      expect(coord.lon, city).toBeGreaterThan(44.7);
      expect(coord.lon, city).toBeLessThan(50.4);
    }
  });

  it("Qarabağ və Şərqi Zəngəzur şəhərləri cədvəldədir", () => {
    for (const city of [
      "Xankəndi",
      "Şuşa",
      "Ağdam",
      "Laçın",
      "Kəlbəcər",
      "Zəngilan",
      "Cəbrayıl",
      "Füzuli",
      "Qubadlı",
    ]) {
      expect(CITY_COORDS, city).toHaveProperty(city);
    }
  });

  it("seed-dəki bütün şəhərlər tanınır (xəritə boş qalmasın)", () => {
    // `prisma/seed-data/content.ts` → COUNTRIES siyahısı. Burada TƏKRARLANIR,
    // çünki test faylı seed-i (və deməli Prisma-nı) import etməməlidir.
    const seedCities = [
      "Bakı", "Gəncə", "Sumqayıt", "Xankəndi", "Şuşa", "Mingəçevir",
      "İstanbul", "Ankara", "İzmir", "Antalya",
      "Berlin", "Münhen", "Hamburq", "Köln",
      "London", "Mançester", "Edinburq",
      "Nyu-York", "Boston", "Sietl", "Ostin",
      "Toronto", "Vankuver", "Monreal",
      "Amsterdam", "Rotterdam", "Eyndhoven",
      "Varşava", "Krakov", "Vroslav",
      "Tbilisi", "Batumi",
      "Dubay", "Əbu-Dabi",
      "Almatı", "Astana",
      "Milan", "Roma", "Turin",
      "Paris", "Lion", "Tuluza",
      "Stokholm", "Göteborq",
      "Praqa", "Brno",
    ];

    for (const city of seedCities) {
      expect(findCity(city), `seed şəhəri «${city}» cədvəldə yoxdur`).not.toBeNull();
    }
  });

  it("müəllimin tələb etdiyi əsas şəhərlər cədvəldədir", () => {
    for (const city of ["Moskva", "Kiyev", "Doha"]) {
      expect(findCity(city), city).not.toBeNull();
    }
  });
});

describe("axtarış funksiyaları", () => {
  it("findCity kanonik adı qaytarır", () => {
    expect(findCity("BAKI")?.name).toBe("Bakı");
    expect(findCity("bakı")?.country).toBe(AZERBAIJAN);
  });

  it("tanınmayan / boş dəyər `null` verir — uydurma koordinat YOX", () => {
    expect(findCity("Atlantis")).toBeNull();
    expect(findCity(null)).toBeNull();
    expect(findCity(undefined)).toBeNull();
    expect(findCity("")).toBeNull();
    expect(findCountry("Testlandiya")).toBeNull();
    expect(countryNumericOf("Testlandiya")).toBeNull();
  });

  it("countryNumericOf world-atlas `id` formatındadır", () => {
    expect(countryNumericOf("Azərbaycan")).toBe("031");
    expect(countryNumericOf("AZERBAYCAN")).toBe("031");
    expect(countryNumericOf("Türkiyə")).toBe("792");
  });

  it("isAzerbaijan hərf variantlarına dözümlüdür", () => {
    expect(isAzerbaijan("Azərbaycan")).toBe(true);
    expect(isAzerbaijan("AZERBAYCAN")).toBe(true);
    expect(isAzerbaijan("azerbaycan")).toBe(true);
    expect(isAzerbaijan("Türkiyə")).toBe(false);
    expect(isAzerbaijan(null)).toBe(false);
  });
});
