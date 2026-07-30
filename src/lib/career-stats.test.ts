// ============================================================================
// src/lib/career-stats.test.ts
// "İndi haradayıq?" aqreqasiyasının MƏXFİLİK TESTLƏRİ — bu blokun müdafiə
// materialı.
//
// Bazasız işləyir (süni sətirlər). Səbəb: k-anonimlik qaydası seed-dən ASILI
// OLMAYARAQ doğru olmalıdır. Seed dəyişəndə "test yaşıldır, deməli düzgündür"
// yanılması yaranmasın.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  MIN_BUCKET_SIZE,
  UNDISCLOSED_LABEL,
  aggregateCareerStats,
  cellTotal,
  fillStep,
  pinRadius,
  type CareerStatsRow,
  type StatsCell,
  type WhereAreWeNow,
} from "./career-stats";

// ---------------------------------------------------------------------------
// Fixture köməkçiləri
// ---------------------------------------------------------------------------

let nextId = 0;

function row(overrides: Partial<CareerStatsRow> = {}): CareerStatsRow {
  nextId += 1;
  return {
    userId: `u-${nextId}`,
    city: null,
    country: null,
    company: null,
    industry: null,
    jobFunction: null,
    degree: null,
    ...overrides,
  };
}

/** `count` ədəd eyni formalı sətir — xananı eşikdən keçirmək üçün. */
function rows(count: number, overrides: Partial<CareerStatsRow> = {}): CareerStatsRow[] {
  return Array.from({ length: count }, () => row(overrides));
}

/** Bütün xanalar — invariant və "3-dən kiçik yoxdur" yoxlamaları üçün. */
function allCells(stats: WhereAreWeNow): Array<[string, StatsCell<{ count: number }>]> {
  return [
    ["countries", stats.countries],
    ["cities", stats.cities],
    ["companies", stats.companies],
    ["industries", stats.industries],
    ["jobFunctions", stats.jobFunctions],
    ["educationLevels", stats.educationLevels],
  ];
}

// ---------------------------------------------------------------------------
// 1. ESKALASİYA — şəhər → ölkə → Açıqlanmayan
// ---------------------------------------------------------------------------

describe("YER ölçüsünün eskalasiyası", () => {
  it("🔴 şəhər xanası 2 nəfərdirsə ÖLKƏ səviyyəsinə yığılır", () => {
    // Azərbaycan: 4 nəfər (eşikdən keçir) — ondan yalnız 2-si Gəncədə.
    const stats = aggregateCareerStats([
      ...rows(2, { city: "Gəncə", country: "Azərbaycan" }),
      ...rows(2, { city: "Bakı", country: "Azərbaycan" }),
    ]);

    // Ölkə AÇIQDIR...
    expect(stats.countries.visible).toEqual([{ key: "Azərbaycan", count: 4 }]);
    // ...şəhər isə YOX: heç bir şəhər xanası 3-ə çatmır.
    expect(stats.cities.visible).toEqual([]);
    // Sətirlər İTMİR — şəhər xanasının "açıqlanmayan" hissəsindədir.
    expect(stats.cities.undisclosedCount).toBe(4);
    expect(stats.cities.unknownCount).toBe(0);
  });

  it("şəhər 3 nəfərə çatanda açılır, 2 nəfərlik qonşu şəhər açılmır", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan" }),
      ...rows(2, { city: "Gəncə", country: "Azərbaycan" }),
    ]);

    expect(stats.cities.visible).toEqual([
      { city: "Bakı", country: "Azərbaycan", count: 3 },
    ]);
    expect(stats.cities.undisclosedCount).toBe(2);
    expect(stats.countries.visible).toEqual([{ key: "Azərbaycan", count: 5 }]);
  });

  it("🔴 ölkə də 2 nəfərdirsə «Açıqlanmayan»a düşür (nə şəhər, nə ölkə)", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan" }),
      ...rows(2, { city: "Tbilisi", country: "Gürcüstan" }),
    ]);

    expect(stats.countries.visible).toEqual([{ key: "Azərbaycan", count: 3 }]);
    expect(stats.countries.undisclosedCount).toBe(2);
    // Gürcüstan pin-i də YOXDUR.
    expect(stats.mapPins.map((pin) => pin.city)).toEqual(["Bakı"]);
  });

  it("ölkəsi bildirilməyən sətir `unknownCount`-a düşür, `undisclosed`-a YOX", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan" }),
      ...rows(2, { city: null, country: null }),
    ]);

    expect(stats.countries.unknownCount).toBe(2);
    expect(stats.countries.undisclosedCount).toBe(0);
    expect(stats.cities.unknownCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. 🔴 TƏLƏ A — ÇARPAZ ÖLÇÜ k-ANONİMLİYİ
// ---------------------------------------------------------------------------

describe("🔴 TƏLƏ A — çarpaz ölçü k-anonimliyi", () => {
  /**
   * Trap-in nümunəsi: "Bakı: 5" açıqdır, "Google: 1" gizlidir. Səhv qurulmuş
   * aqreqasiyada həmin sətir sənaye xanasında BAŞQA sətir çoxluğuna görə
   * görünə bilər. Burada hər xananın CƏMİ eynidir → çıxma ilə qalıq alınmır.
   */
  const mixed: CareerStatsRow[] = [
    ...rows(5, {
      city: "Bakı",
      country: "Azərbaycan",
      company: "Azercell",
      industry: "TECHNOLOGY",
      jobFunction: "ENGINEERING",
    }),
    row({
      city: "Bakı",
      country: "Azərbaycan",
      company: "Google",
      industry: "TECHNOLOGY",
      jobFunction: "ENGINEERING",
    }),
  ];

  it("HEÇ BİR ölçüdə 3 nəfərdən kiçik ADLI xana qalmır", () => {
    const stats = aggregateCareerStats(mixed);

    for (const [name, cell] of allCells(stats)) {
      for (const bucket of cell.visible) {
        expect(bucket.count, `${name} xanasında kiçik qrup açıq qaldı`).toBeGreaterThanOrEqual(
          MIN_BUCKET_SIZE,
        );
      }
    }
  });

  it("kiçik qrupdaki sətir HEÇ BİR ADLI xanaya düşmür (yalnız Açıqlanmayan)", () => {
    const stats = aggregateCareerStats(mixed);

    expect(stats.companies.visible).toEqual([{ key: "Azercell", count: 5 }]);
    expect(stats.companies.undisclosedCount).toBe(1);
    // Şirkət adı HEÇ YERDƏ görünmür.
    expect(JSON.stringify(stats)).not.toContain("Google");
  });

  it("🔴 hər xana BÜTÜN sətirləri örtür — xanaları çıxıb qalıq almaq mümkün deyil", () => {
    const stats = aggregateCareerStats(mixed);

    // Bütün xanaların cəmi EYNİDİR. Fərqli olsaydı oxucu "sənayesi
    // bildirilməyən N nəfər" kimi qalıq çıxarıb onu başqa ölçü ilə
    // kəsişdirərdi — TƏLƏ A-nın əsl mexanizmi məhz budur.
    for (const [name, cell] of allCells(stats)) {
      expect(cellTotal(cell), `${name} xanasının cəmi uyğun gəlmir`).toBe(
        stats.respondentCount,
      );
    }
  });

  it("STRICT rejimdə sətir bir ölçüdə açıqlanmırsa BÜTÜN ölçülərdə Açıqlanmayandır", () => {
    // Bu, tapşırığın hərfi tələbidir: per-sətir uniformluq.
    const stats = aggregateCareerStats(mixed, { strictCrossDimension: true });

    // "Google" sətri tamamilə çıxarıldı → Bakı xanası 6 yox, 5-dir.
    expect(stats.cities.visible).toEqual([
      { city: "Bakı", country: "Azərbaycan", count: 5 },
    ]);
    expect(stats.countries.visible).toEqual([{ key: "Azərbaycan", count: 5 }]);
    expect(stats.industries.visible).toEqual([{ key: "TECHNOLOGY", count: 5 }]);
    expect(stats.jobFunctions.visible).toEqual([{ key: "ENGINEERING", count: 5 }]);
    expect(stats.companies.visible).toEqual([{ key: "Azercell", count: 5 }]);

    // Sətir hər ölçüdə tam olaraq BİR dəfə açıqlanmayan kimi sayılır.
    for (const [name, cell] of allCells(stats)) {
      expect(cellTotal(cell), `${name}`).toBe(stats.respondentCount);
    }
    expect(stats.suppressedCount).toBe(1);
  });

  it("STRICT rejim SABİT NÖQTƏYƏ qədər dövr edir (kaskad)", () => {
    // 3 nəfər Bakı/Azercell + 1 nəfər Bakı/Google. Google sətri çıxınca
    // Bakı 3-də qalır. Amma Google sətrinin sənayesi FINANCE-dir və onunla
    // birlikdə FINANCE xanası da yox olur.
    const stats = aggregateCareerStats(
      [
        ...rows(3, {
          city: "Bakı",
          country: "Azərbaycan",
          company: "Azercell",
          industry: "TECHNOLOGY",
        }),
        row({ city: "Bakı", country: "Azərbaycan", company: "Google", industry: "FINANCE" }),
      ],
      { strictCrossDimension: true },
    );

    expect(stats.cities.visible).toEqual([
      { city: "Bakı", country: "Azərbaycan", count: 3 },
    ]);
    expect(stats.industries.visible).toEqual([{ key: "TECHNOLOGY", count: 3 }]);
    expect(stats.suppressedCount).toBe(1);
  });

  it("STRICT rejim yüksək kardinallıqlı sahədə HƏR ŞEYİ silir (ölçülmüş fakt)", () => {
    // Bu test `MARGINAL` defaultunun SƏBƏBİNİ sənədləşdirir: 6 nəfər eyni
    // şəhərdə, amma hər biri fərqli şirkətdə → strict rejim panelin hamısını
    // bağlayır, halbuki "Bakı: 6" tək başına heç kimi ifşa etmir.
    const spread = Array.from({ length: 6 }, (_, i) =>
      row({ city: "Bakı", country: "Azərbaycan", company: `Şirkət-${i}` }),
    );

    const strict = aggregateCareerStats(spread, { strictCrossDimension: true });
    expect(strict.cities.visible).toEqual([]);
    expect(strict.countries.visible).toEqual([]);
    expect(strict.suppressedCount).toBe(6);

    const marginal = aggregateCareerStats(spread);
    expect(marginal.cities.visible).toEqual([
      { city: "Bakı", country: "Azərbaycan", count: 6 },
    ]);
    expect(marginal.companies.visible).toEqual([]);
    expect(marginal.companies.undisclosedCount).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// 3. 🔴 CƏM İNVARİANTI
// ---------------------------------------------------------------------------

describe("🔴 cəm invariantı", () => {
  const messy: CareerStatsRow[] = [
    ...rows(4, {
      city: "Bakı",
      country: "Azərbaycan",
      company: "Azercell",
      industry: "TECHNOLOGY",
      jobFunction: "ENGINEERING",
      degree: "MASTER",
    }),
    ...rows(3, { city: "İstanbul", country: "Türkiyə", industry: "FINANCE" }),
    ...rows(2, { city: "Turin", country: "İtaliya", company: "Fiat" }),
    ...rows(3, { city: null, country: "Almaniya", jobFunction: "DATA", degree: "PHD" }),
    row({}),
  ];

  it("hər xananın sayları cəmi = giriş sətirlərinin sayı", () => {
    const stats = aggregateCareerStats(messy);

    expect(stats.respondentCount).toBe(13);
    for (const [name, cell] of allCells(stats)) {
      expect(cellTotal(cell), `${name}`).toBe(13);
    }
  });

  it("STRICT rejimdə də invariant qorunur", () => {
    const stats = aggregateCareerStats(messy, { strictCrossDimension: true });

    for (const [name, cell] of allCells(stats)) {
      expect(cellTotal(cell), `${name}`).toBe(stats.respondentCount);
    }
  });

  it("eyni istifadəçinin təkrar sətri sayı İKİLƏŞDİRMİR", () => {
    const duplicate = row({ city: "Bakı", country: "Azərbaycan" });
    const stats = aggregateCareerStats([duplicate, duplicate, duplicate, duplicate]);

    expect(stats.respondentCount).toBe(1);
    expect(cellTotal(stats.countries)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Pinlər və xəritə
// ---------------------------------------------------------------------------

describe("xəritə pinləri", () => {
  it("tanınmayan şəhər PIN YARATMIR, amma sətir sayılır", () => {
    const stats = aggregateCareerStats(
      rows(4, { city: "Bilinməyənşəhər", country: "Azərbaycan" }),
    );

    // Şəhər xanası açıqdır (4 nəfər), amma koordinat cədvəlində yoxdur.
    expect(stats.cities.visible).toEqual([
      { city: "Bilinməyənşəhər", country: "Azərbaycan", count: 4 },
    ]);
    expect(stats.mapPins).toEqual([]);
    // Ölkə doldurması sətirləri yenə tutur.
    expect(stats.countryFills).toEqual([
      { numeric: "031", iso2: "AZ", country: "Azərbaycan", count: 4 },
    ]);
  });

  it("tanınmayan ÖLKƏ doldurma yaratmır (siyahıda var, xəritədə yox)", () => {
    const stats = aggregateCareerStats(rows(3, { country: "Testlandiya" }));

    expect(stats.countries.visible).toEqual([{ key: "Testlandiya", count: 3 }]);
    expect(stats.countryFills).toEqual([]);
  });

  it("hərf variantı eyni pinə düşür (normalizeCityKey)", () => {
    const stats = aggregateCareerStats([
      ...rows(2, { city: "Bakı", country: "Azərbaycan" }),
      ...rows(2, { city: "BAKI", country: "AZERBAYCAN" }),
    ]);

    expect(stats.mapPins).toHaveLength(1);
    expect(stats.mapPins[0]?.count).toBe(4);
    // Etiket kanonik yazılışdadır — istifadəçinin yazdığı "BAKI" deyil.
    expect(stats.mapPins[0]?.city).toBe("Bakı");
    expect(stats.countries.visible).toEqual([{ key: "Azərbaycan", count: 4 }]);
  });

  it("azPins yalnız Azərbaycan şəhərlərini saxlayır", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan" }),
      ...rows(3, { city: "İstanbul", country: "Türkiyə" }),
    ]);

    expect(stats.mapPins.map((pin) => pin.city).sort()).toEqual(["Bakı", "İstanbul"]);
    expect(stats.azPins.map((pin) => pin.city)).toEqual(["Bakı"]);
  });

  it("🔴 pin tooltip-indəki vəzifə bölgüsü DƏ k-anonimlikdən keçir (cross-tab)", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan", jobFunction: "ENGINEERING" }),
      ...rows(2, { city: "Bakı", country: "Azərbaycan", jobFunction: "EDUCATION" }),
    ]);

    const pin = stats.mapPins[0];
    expect(pin?.count).toBe(5);
    // 3 mühəndis açıqlanır, 2 müəllim YOX — "2 müəllim" konkret iki nəfərdir.
    expect(pin?.roles).toEqual([{ key: "ENGINEERING", count: 3 }]);
    expect(pin?.undisclosedRoles).toBe(2);
    // Tooltip cəmi tam olsun.
    expect((pin?.roles.reduce((s, r) => s + r.count, 0) ?? 0) + (pin?.undisclosedRoles ?? 0)).toBe(
      pin?.count,
    );
  });

  it("pin radiusu sərhədləri aşmır", () => {
    expect(pinRadius(3, 3)).toBe(6);
    expect(pinRadius(3, 20)).toBe(6);
    expect(pinRadius(20, 20)).toBe(18);
    expect(pinRadius(12, 20)).toBeGreaterThan(6);
    expect(pinRadius(12, 20)).toBeLessThan(18);
  });

  it("doldurma pilləsi 0…steps-1 arasındadır", () => {
    expect(fillStep(0, 10, 5)).toBe(0);
    expect(fillStep(10, 10, 5)).toBe(4);
    expect(fillStep(1, 10, 5)).toBe(0);
    expect(fillStep(5, 10, 5)).toBe(2);
    expect(fillStep(3, 0, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Təhsil pillələri
// ---------------------------------------------------------------------------

describe("təhsil pillələri", () => {
  it("ENUM SIRASINDADIR, say sırasında deyil", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { degree: "PHD" }),
      ...rows(5, { degree: "BACHELOR" }),
      ...rows(4, { degree: "MASTER" }),
    ]);

    expect(stats.educationLevels.visible.map((bucket) => bucket.key)).toEqual([
      "BACHELOR",
      "MASTER",
      "PHD",
    ]);
  });

  it("təhsil qeydi olmayan sətir `unknownCount`-dadır", () => {
    const stats = aggregateCareerStats([...rows(3, { degree: "MASTER" }), ...rows(2)]);

    expect(stats.educationLevels.visible).toEqual([{ key: "MASTER", count: 3 }]);
    expect(stats.educationLevels.unknownCount).toBe(2);
    expect(cellTotal(stats.educationLevels)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 6. TƏLƏ C və TƏLƏ D
// ---------------------------------------------------------------------------

describe("adlandırma və sahə qadağaları", () => {
  it("🔴 TƏLƏ C — gizlədilmiş qrup «Digər» ADLANMIR", () => {
    expect(UNDISCLOSED_LABEL).toBe("Açıqlanmayan");

    // `Industry.OTHER` xanası ("Digər") ilə toqquşma olmamalıdır: aqreqasiya
    // çıxışında ümumiyyətlə "Digər" sətri yoxdur — etiket UI-da qurulur.
    const stats = aggregateCareerStats(rows(3, { industry: "OTHER" }));
    expect(JSON.stringify(stats)).not.toContain("Digər");
    expect(stats.industries.visible).toEqual([{ key: "OTHER", count: 3 }]);
  });

  it("🔴 TƏLƏ D — çıxışda maaş/salary/bonus adlı sahə YOXDUR", () => {
    const stats = aggregateCareerStats([
      ...rows(3, { city: "Bakı", country: "Azərbaycan", company: "Azercell" }),
    ]);

    const forbidden = /salary|maaş|maas|bonus|wage|income|compensation|əmək\s*haqq/i;

    // Rekursiv açar auditi — iç-içə obyektlərdə də yoxlanılır.
    const walk = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (value === null || typeof value !== "object") return;

      for (const [key, child] of Object.entries(value)) {
        expect(forbidden.test(key), `«${path}.${key}» qadağan olunmuş sahədir`).toBe(false);
        walk(child, `${path}.${key}`);
      }
    };

    walk(stats, "stats");
    expect(forbidden.test(JSON.stringify(stats))).toBe(false);
  });

  it("çıxışda dəqiq koordinat SƏTİRDƏN gəlmir — yalnız statik cədvəldən", () => {
    // Giriş sətrində koordinat sahəsi YOXDUR (tip səviyyəsində). Pin
    // koordinatı `lib/geo.ts` cədvəlindəki dəyərdir.
    const stats = aggregateCareerStats(rows(3, { city: "Bakı", country: "Azərbaycan" }));

    expect(stats.mapPins[0]?.lat).toBe(40.4093);
    expect(stats.mapPins[0]?.lon).toBe(49.8671);
  });
});

// ---------------------------------------------------------------------------
// 7. Şəffaflıq sahələri
// ---------------------------------------------------------------------------

describe("razılıq şəffaflığı sahələri", () => {
  it("viewerIncluded baxanın öz sətrinə görə hesablanır", () => {
    const own = row({ userId: "me", city: "Bakı", country: "Azərbaycan" });
    const data = [own, ...rows(3, { city: "Bakı", country: "Azərbaycan" })];

    expect(aggregateCareerStats(data, { viewerId: "me" }).viewerIncluded).toBe(true);
    expect(aggregateCareerStats(data, { viewerId: "kimsə" }).viewerIncluded).toBe(false);
    // Viewer verilməsə iddia edilmir.
    expect(aggregateCareerStats(data).viewerIncluded).toBe(false);
  });

  it("memberCount / totalConsented seçimlərdən gəlir", () => {
    const stats = aggregateCareerStats(rows(3, { country: "Azərbaycan" }), {
      memberCount: 25,
      totalConsented: 8,
    });

    expect(stats.respondentCount).toBe(3);
    expect(stats.totalConsented).toBe(8);
    expect(stats.memberCount).toBe(25);
  });

  it("boş giriş — bütün xanalar boş, invariant 0", () => {
    const stats = aggregateCareerStats([]);

    expect(stats.respondentCount).toBe(0);
    expect(stats.mapPins).toEqual([]);
    expect(stats.azPins).toEqual([]);
    expect(stats.countryFills).toEqual([]);
    for (const [name, cell] of allCells(stats)) {
      expect(cellTotal(cell), `${name}`).toBe(0);
      expect(cell.visible, `${name}`).toEqual([]);
    }
  });
});
