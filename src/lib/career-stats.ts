// ============================================================================
// src/lib/career-stats.ts
// "İndi haradayıq?" AQREQASİYASI — bu blokun ürəyi (spec §13, [M11]).
//
// 🔴 SAF MODUL: `prisma` və React importu YOXDUR. Servis yalnız xam sətirləri
// gətirir və bu funksiyanı çağırır; aqreqasiya məntiqi servisdə TƏKRARLANMIR.
// Səbəb sadədir — k-anonimlik qaydası bazasız, süni sətirlərlə sınana bilməlidir
// (`career-stats.test.ts`), yoxsa "seed-lə işləyir" ilə "düzgündür" qarışır.
//
// ============================================================================
// 🔴 TƏLƏ A — ÇARPAZ ÖLÇÜ k-ANONİMLİYİ
// ============================================================================
//
// MÖVCUD SƏHV (Blok 7B-yə qədərki `stats.service`): hər xana ÖZ `groupBy`
// sorğusundan gəlirdi və sorğuların `where`-i eyni DEYİLDİ:
//
//   countries  ← where: { …, country:     { not: null } }
//   industries ← where: { …, industry:    { not: null } }
//   jobFunctions ← where: { …, jobFunction: { not: null } }
//   locations  ← where: { …, country:     { not: null } }  (AYRI sorğu)
//   degrees    ← EducationEntry (sətir sayır, NƏFƏR yox)
//
// Yəni hər xana FƏRQLİ sətir çoxluğu üzərində hesablanırdı. Nəticə:
//   · xanaların cəmləri bir-birinə UYĞUN GƏLMİR (biri 22, biri 19, biri 24),
//   · oxucu iki xananı çıxıb "sənayesi bildirilməyən 3 nəfər" kimi qalıq alır
//     və onu üçüncü xana ilə kəsişdirib fərdə çata bilir,
//   · `jobFunction` xanasında 2 nəfərlik qrup gizlənərkən `industry` xanasında
//     EYNİ 2 nəfər başqa sətir çoxluğuna görə 3 kimi görünə bilir.
//
// DÜZƏLİŞ — üç struktur qayda:
//
//   1. TƏK DATASET. Bir nəfər = BİR sətir (`CareerEntry.isCurrent` təkliyi
//      Blok 7-də təmin edilib — bu qorumaya güvənilir, təkrar yoxlanılmır).
//   2. TƏK KEÇİD. Bütün ölçülər EYNİ sətir çoxluğundan hesablanır.
//   3. HƏR ÖLÇÜ SƏTİRLƏRİN HAMISINI ÖRTÜR. Hər xanada üç say var və cəmi
//      HƏMİŞƏ `respondentCount`-a bərabərdir:
//
//        Σ visible[].count  +  undisclosedCount  +  unknownCount  =  respondentCount
//
//      `undisclosedCount` — dəyəri OLAN, amma 3 nəfərdən kiçik qrupa düşdüyü
//      üçün AÇIQLANMAYAN sətirlər. `unknownCount` — bu ölçü üzrə heç nə
//      bildirməmiş sətirlər. Heç bir sətir heç bir xanadan İTMİR → xanaları
//      çıxmaqla qalıq çıxarmaq mümkün deyil. Bu, TƏLƏ A-nın həndəsi bağlanışıdır.
//
// ============================================================================
// ESKALASİYA (YER ölçüsü) — generalizasiya iyerarxiyası
// ============================================================================
//
//   şəhər xanası < 3  →  sətir ÖLKƏ səviyyəsinə yığılır (şəhəri açıqlanmır)
//   ölkə xanası  < 3  →  sətir "Açıqlanmayan" olur (nə şəhər, nə ölkə)
//
// Şəhər açıqlanmayanda sətir İTMİR — `cities` xanasının `undisclosedCount`-una
// düşür və `countries` xanasında normal sayılır. Bu, k-anonimliyin standart
// generalizasiya mexanizmidir: dəyər GİZLƏDİLMİR, KOBUDLAŞDIRILIR.
//
// ============================================================================
// 🔴 İKİ REJİM VƏ NİYƏ `MARGINAL` DEFAULTDUR (müdafiə sualı)
// ============================================================================
//
// `strictCrossDimension: true` daha güclü qayda tətbiq edir: sətir ƏN AZI BİR
// ölçüdə açıqlanmırsa BÜTÜN ölçülərdə "Açıqlanmayan"a düşür (sətir tamamilə
// çıxarılır, sonra xanalar yenidən hesablanır — sabit nöqtəyə qədər dövr edir,
// çünki sətir çıxarmaq başqa xanaları da həddin altına sala bilər).
//
// Bu rejim TESTLƏ ÖLÇÜLÜB və REAL MƏLUMATDA HƏR ŞEYİ SİLİR:
// 22 razılıq vermiş məzun, 20 fərqli şirkət → hər şirkət xanası ≤ 2 → hər
// sətir "bir ölçüdə açıqlanmır" şərtinə düşür → panel TAM BOŞ qalır. 14-28
// nəfərlik sinifdə yüksək kardinallıqlı sahə (şirkət adı) bütün panelə VETO
// qoyur.
//
// Ona görə səhifə `MARGINAL` (default) rejimi işlədir. Əsaslandırma:
//   · Biz MİKROMƏLUMAT deyil, MARJİNAL bölgü nəşr edirik — hər ölçü ayrı
//     qrafikdir, birgə cədvəl (cross-tab) HEÇ VAXT göstərilmir. Marjinal nəşr
//     üçün tələb "hər açıqlanan xana ≥ k" -dır və bu, yuxarıdaki üç qayda ilə
//     tam ödənilir.
//   · "Bir ölçüdə Açıqlanmayan, başqasında açıq" halı fərdi ifşa etmir, çünki
//     "Açıqlanmayan" ATRİBUT DƏYƏRİ DEYİL — kəsişdirməyə yararlı məlumat
//     daşımır. İfşa yalnız 3-dən kiçik ADLI xana göstərilsə olur, o isə heç bir
//     rejimdə mümkün deyil.
//   · İfşa riski olan yeganə birgə cədvəl — pin tooltip-indəki şəhər × vəzifə
//     bölgüsü — AYRICA eşikdən keçir (aşağıda `MapPin.roles`).
//
// Hər iki rejim testlə örtülüdür; `strictCrossDimension` rejimi müdafiədə
// "niyə belə deyil?" sualının ölçülmüş cavabıdır.
//
// ⚠️ TƏLƏ C — gizlədilmiş qrupun adı **"Açıqlanmayan"**-dır, "Digər" DEYİL:
// `Industry.OTHER` onsuz da "Digər"dir və Blok 5-də iki eyni adlı rozet
// yan-yana düşmüşdü.
//
// ⚠️ TƏLƏ D — ƏMƏK HAQQI QƏSDƏN YOXDUR. Bu faylda maaş/bonus sahəsi nə oxunur,
// nə hesablanır, nə qaytarılır. 14-28 nəfərlik sinifdə aqreqasiya olunmuş maaş
// belə fərdiləşdirilə bilər (bir nəfər öz rəqəmini bilirsə qalanları çıxarır).
// Qərar README və STATE.md-də sənədləşdirilib; `career-stats.test.ts` çıxış
// obyektində belə sahənin OLMADIĞINI yoxlayır.
// ============================================================================

import { DEGREE_VALUES } from "@/lib/enums";
import { AZERBAIJAN, findCity, findCountry, normalizeCityKey } from "@/lib/geo";
import { MIN_BUCKET_SIZE } from "@/lib/visibility";

/** Gizlədilmiş qrupun adı — TƏLƏ C. */
export const UNDISCLOSED_LABEL = "Açıqlanmayan";

/** Pin radiusu (px) — say ilə böyüyür, amma sərhədlər sabitdir. */
export const PIN_MIN_RADIUS = 6;
export const PIN_MAX_RADIUS = 18;

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

/**
 * Bir nəfərin aqreqasiyaya düşən yekun sətri.
 *
 * ⚠️ `latitude` / `longitude` sahələri QƏSDƏN YOXDUR (TƏLƏ B) — koordinat
 * yalnız `lib/geo.ts`-dəki statik cədvəldən gəlir.
 * ⚠️ Maaş sahəsi QƏSDƏN YOXDUR (TƏLƏ D).
 */
export interface CareerStatsRow {
  userId: string;
  city: string | null;
  country: string | null;
  company: string | null;
  /** `Industry` enum dəyəri (sətir kimi — SQLite native enum dəstəkləmir). */
  industry: string | null;
  /** `JobFunction` enum dəyəri. */
  jobFunction: string | null;
  /** Ən yüksək təhsil pilləsi (`Degree`) — servis nəfər başına BİRİNİ seçir. */
  degree: string | null;
}

export interface AggregateOptions {
  /** Sinif ölçüsü — "N/M üzv razılıq verib" bildirişi üçün. */
  memberCount?: number;
  /**
   * Aqreqasiyaya razılıq vermiş və viewer-ə GÖRÜNƏN üzv sayı.
   *
   * `respondentCount`-dan böyük ola bilər: yalnız təhsil qeydinə razılıq verən,
   * cari iş qeydi olmayan üzv statistikaya DÜŞMÜR (sual "indi haradasan?"-dır),
   * amma razılıq şəffaflığı zolağında sayılır.
   */
  totalConsented?: number;
  /** Baxanın öz `userId`-si — «sənin məlumatın iştirak edir/etmir» sətri üçün. */
  viewerId?: string;
  /** Bax fayl başlığındaki «İKİ REJİM» bölməsi. Default `false` (MARGINAL). */
  strictCrossDimension?: boolean;
}

// ---------------------------------------------------------------------------
// Çıxış
// ---------------------------------------------------------------------------

export interface StatsBucket {
  /** Xam dəyər (enum açarı və ya sərbəst mətn) — etiket UI-da qurulur. */
  key: string;
  count: number;
}

export interface CityBucket {
  city: string;
  country: string;
  count: number;
}

/**
 * Bir ölçünün tam bölgüsü.
 *
 * 🔴 İNVARİANT: `Σ visible[].count + undisclosedCount + unknownCount`
 * HƏMİŞƏ `respondentCount`-a bərabərdir (testlə bərkidilib).
 */
export interface StatsCell<T> {
  /** Açıqlanan xanalar — hər birində `count >= MIN_BUCKET_SIZE`. */
  visible: T[];
  /** Dəyəri var, amma qrup kiçik olduğu üçün açıqlanmır. */
  undisclosedCount: number;
  /** Bu ölçü üzrə məlumat bildirilməyib. */
  unknownCount: number;
}

export interface PinRole {
  /** `JobFunction` enum dəyəri. */
  key: string;
  count: number;
}

/**
 * Xəritə markeri.
 *
 * 🔴 TOOLTIP SƏRHƏDİ: burada AD, ŞİRKƏT–ŞƏXS BAĞI və PROFİL LİNKİ YOXDUR və
 * heç vaxt əlavə edilməməlidir. Marker yalnız şəhər adı, nəfər sayı və (eşikdən
 * keçirsə) vəzifə bölgüsü daşıyır. Bu sərhəd xəritəni "insan izləyicisi"nə
 * çevrilməkdən qoruyur.
 */
export interface MapPin {
  /** Stabil React açarı — normallaşdırılmış `ölkə|şəhər`. */
  id: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  count: number;
  /**
   * Şəhər × vəzifə bölgüsü — YALNIZ bu şəhərdə ≥ 3 nəfər olan vəzifələr.
   *
   * 🔴 Bu, BİRGƏ CƏDVƏLDİR (cross-tab) və ona görə ayrıca k-anonimlikdən
   * keçir: "Bakı · 2 müəllim" tooltip-i marjinal xanalar təmiz olsa da
   * KONKRET iki nəfəri göstərir. Eşikdən keçən vəzifə yoxdursa massiv boşdur
   * və UI bunu açıq yazır ("vəzifə bölgüsü açıqlanmır").
   */
  roles: PinRole[];
  /** Eşikdən keçməyən sətirlərin cəmi — tooltip-də «Açıqlanmayan · N». */
  undisclosedRoles: number;
}

/** Ölkə doldurması — `world-atlas` poliqonuna `numeric` ilə bağlanır. */
export interface CountryFill {
  /** ISO 3166-1 numeric — topologiya `id`-si. */
  numeric: string;
  iso2: string;
  country: string;
  count: number;
}

export interface WhereAreWeNow {
  /** Statistikada sayılan nəfər — giriş sətirlərinin sayı. */
  respondentCount: number;
  /** Razılıq vermiş və görünən üzv sayı (bax `AggregateOptions.totalConsented`). */
  totalConsented: number;
  /** Sinif ölçüsü — bilinmirsə `null`. */
  memberCount: number | null;
  /** Ən azı bir ölçüdə açıqlanmayan sətir sayı — şəffaflıq göstəricisi. */
  suppressedCount: number;
  /** Baxanın öz məlumatı bu statistikada iştirak edirmi? */
  viewerIncluded: boolean;

  // --- 8 xana (7 vizual + vəzifə qrafiki) ---
  countries: StatsCell<StatsBucket>;
  cities: StatsCell<CityBucket>;
  companies: StatsCell<StatsBucket>;
  industries: StatsCell<StatsBucket>;
  jobFunctions: StatsCell<StatsBucket>;
  educationLevels: StatsCell<StatsBucket>;
  /** Dünya xəritəsi markerləri (tanınan şəhərlər). */
  mapPins: MapPin[];
  /** Azərbaycan görünüşü markerləri — `mapPins`-in AZ alt çoxluğu. */
  azPins: MapPin[];
  /** Dünya xəritəsində ölkə doldurması. */
  countryFills: CountryFill[];
}

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

/** Boş sətir `null` sayılır — " " məlumat daşımır. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? null : trimmed;
}

function countBy<T>(rows: T[], keyOf: (row: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Eşikdən keçən açarlar. */
function disclosedKeys(counts: Map<string, number>): Set<string> {
  const out = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= MIN_BUCKET_SIZE) out.add(key);
  }
  return out;
}

/**
 * Xanaların sırası DETERMİNİSTİKDİR: say azalan, bərabərlikdə açar əlifba sırası.
 *
 * ⚠️ Vacibdir: `profile.db.test.ts` iki çağırışın `visible` massivlərini
 * `toEqual` ilə müqayisə edir. `Map` gəzinti sırası daxil olma sırasıdır və
 * sorğu planı dəyişəndə fərqlənə bilər.
 */
function sortBuckets<T extends { count: number }>(
  buckets: T[],
  keyOf: (bucket: T) => string,
): T[] {
  return [...buckets].sort(
    (a, b) => b.count - a.count || keyOf(a).localeCompare(keyOf(b), "az"),
  );
}

// ---------------------------------------------------------------------------
// Sətir vəziyyəti
// ---------------------------------------------------------------------------

/** Sətrin YER ölçüsündə hansı dəqiqlikdə açıqlandığı. */
type LocationLevel = "CITY" | "COUNTRY" | "HIDDEN";

interface RowState {
  row: CareerStatsRow;
  /** Şəhər xanasının açarı (`ölkə|şəhər`) — şəhər və ölkə varsa. */
  cityKey: string | null;
  countryKey: string | null;
  level: LocationLevel;
}

interface Pass {
  states: RowState[];
  cityCounts: Map<string, number>;
  countryCounts: Map<string, number>;
  disclosedCities: Set<string>;
  disclosedCountries: Set<string>;
  disclosed: {
    company: Set<string>;
    industry: Set<string>;
    jobFunction: Set<string>;
    degree: Set<string>;
  };
}

/** Xam sətirdən açar hesablaması — yer səviyyəsi hələ təyin edilmir. */
function makeStates(rows: CareerStatsRow[]): RowState[] {
  return rows.map((row) => {
    const city = clean(row.city);
    const country = clean(row.country);
    const countryKey = country === null ? null : normalizeCityKey(country);

    return {
      row,
      countryKey,
      cityKey:
        city === null || countryKey === null
          ? null
          : `${countryKey}|${normalizeCityKey(city)}`,
      level: "HIDDEN",
    };
  });
}

/**
 * Bir keçid: verilmiş sətir çoxluğu üzərində bütün ölçülərin açıqlanan
 * dəyərlərini və hər sətrin yer səviyyəsini hesablayır.
 *
 * 🔴 ÖLKƏ SAYI ŞƏHƏRDƏN ASILI DEYİL: şəhəri gizlədilmiş sətir ölkə xanasında
 * NORMAL sayılır (generalizasiya, silinmə deyil).
 */
function runPass(rows: CareerStatsRow[]): Pass {
  const base = makeStates(rows);

  const cityCounts = countBy(base, (s) => s.cityKey);
  const countryCounts = countBy(base, (s) => s.countryKey);
  const disclosedCities = disclosedKeys(cityCounts);
  const disclosedCountries = disclosedKeys(countryCounts);

  for (const state of base) {
    if (state.countryKey === null || !disclosedCountries.has(state.countryKey)) {
      state.level = "HIDDEN";
      continue;
    }
    state.level =
      state.cityKey !== null && disclosedCities.has(state.cityKey) ? "CITY" : "COUNTRY";
  }

  return {
    states: base,
    cityCounts,
    countryCounts,
    disclosedCities,
    disclosedCountries,
    disclosed: {
      company: disclosedKeys(countBy(base, (s) => clean(s.row.company))),
      industry: disclosedKeys(countBy(base, (s) => clean(s.row.industry))),
      jobFunction: disclosedKeys(countBy(base, (s) => clean(s.row.jobFunction))),
      degree: disclosedKeys(countBy(base, (s) => clean(s.row.degree))),
    },
  };
}

/** Sətir hər sahibi olduğu ölçüdə ən incə səviyyədə açıqlanırmı? */
function isFullyDisclosed(state: RowState, pass: Pass): boolean {
  if (state.level === "HIDDEN") return false;
  // Şəhəri var, amma yalnız ölkə səviyyəsində açıqlanır → tam deyil.
  if (state.cityKey !== null && state.level !== "CITY") return false;

  const { row } = state;
  const checks: Array<[string | null, Set<string>]> = [
    [clean(row.company), pass.disclosed.company],
    [clean(row.industry), pass.disclosed.industry],
    [clean(row.jobFunction), pass.disclosed.jobFunction],
    [clean(row.degree), pass.disclosed.degree],
  ];

  return checks.every(([value, allowed]) => value === null || allowed.has(value));
}

// ---------------------------------------------------------------------------
// Xana qurucuları
// ---------------------------------------------------------------------------

interface CellInput<T> {
  /** Sətrin bu ölçüdəki dəyəri — `null` = məlumat yoxdur. */
  valueOf: (state: RowState) => string | null;
  disclosed: Set<string>;
  /** Açardan görünən xana obyektini qurur. */
  bucketOf: (key: string, count: number) => T;
  sortKeyOf: (bucket: T) => string;
}

function buildCell<T extends { count: number }>(
  states: RowState[],
  alive: Set<RowState>,
  input: CellInput<T>,
): StatsCell<T> {
  const counts = new Map<string, number>();
  let undisclosedCount = 0;
  let unknownCount = 0;

  for (const state of states) {
    const value = input.valueOf(state);

    if (value === null) {
      unknownCount += 1;
      continue;
    }

    if (!alive.has(state) || !input.disclosed.has(value)) {
      undisclosedCount += 1;
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const visible = sortBuckets(
    [...counts.entries()].map(([key, count]) => input.bucketOf(key, count)),
    input.sortKeyOf,
  );

  return { visible, undisclosedCount, unknownCount };
}

/**
 * Təhsil pillələri ENUM SIRASINDADIR (bakalavr → magistr → doktorantura →
 * sertifikat), say sırasında DEYİL: pillə şkalasıdır, reytinq deyil.
 */
function orderDegrees(cell: StatsCell<StatsBucket>): StatsCell<StatsBucket> {
  const rank = new Map<string, number>(DEGREE_VALUES.map((value, index) => [value, index]));

  return {
    ...cell,
    visible: [...cell.visible].sort(
      (a, b) =>
        (rank.get(a.key) ?? DEGREE_VALUES.length) - (rank.get(b.key) ?? DEGREE_VALUES.length),
    ),
  };
}

// ---------------------------------------------------------------------------
// Pinlər
// ---------------------------------------------------------------------------

/**
 * Açıqlanan şəhər xanalarından marker qurur.
 *
 * ⚠️ Tanınmayan şəhər PIN YARATMIR (`lib/geo.ts` cədvəlində yoxdur) — sətir
 * `cities` xanasında normal sayılır və ölkə doldurmasına düşür. Uydurma
 * koordinat YAZILMIR.
 */
function buildPins(cityStates: Map<string, RowState[]>): MapPin[] {
  const pins: MapPin[] = [];

  for (const [key, states] of cityStates) {
    const cityName = clean(states[0].row.city);
    const countryName = clean(states[0].row.country);
    if (cityName === null || countryName === null) continue;

    const resolved = findCity(cityName);
    if (resolved === null) continue; // tanınmayan şəhər → pin yox

    const roleCounts = countBy(states, (s) => clean(s.row.jobFunction));
    const roles: PinRole[] = [];
    let undisclosedRoles = 0;

    for (const [role, count] of roleCounts) {
      if (count >= MIN_BUCKET_SIZE) roles.push({ key: role, count });
      else undisclosedRoles += count;
    }
    // Vəzifəsi bildirilməyənlər də açıqlanmayan sayılır (tooltip-də cəm düz olsun).
    undisclosedRoles += states.filter((s) => clean(s.row.jobFunction) === null).length;

    pins.push({
      id: key,
      city: resolved.name,
      country: countryName,
      lat: resolved.lat,
      lon: resolved.lon,
      count: states.length,
      roles: sortBuckets(roles, (role) => role.key),
      undisclosedRoles,
    });
  }

  return sortBuckets(pins, (pin) => pin.id);
}

// ---------------------------------------------------------------------------
// Əsas funksiya
// ---------------------------------------------------------------------------

/**
 * Xam sətirləri "İndi haradayıq?" panelinə çevirir.
 *
 * DÖRD ADDIM, sıra pozulmamalıdır:
 *   a) sətirlər yığılır (nəfər başına BİR sətir)
 *   b) YER ölçüsü eskalasiya edilir (şəhər → ölkə → Açıqlanmayan)
 *   c) digər ölçülər EYNİ eşiklə açıqlanan/açıqlanmayan kimi bölünür
 *      (`strictCrossDimension` rejimində sabit nöqtəyə qədər dövr edir)
 *   d) yalnız BUNDAN SONRA saylar hesablanır və çıxış qurulur
 */
export function aggregateCareerStats(
  input: CareerStatsRow[],
  options: AggregateOptions = {},
): WhereAreWeNow {
  // --- (a) nəfər başına bir sətir ---
  // `isCurrent` təkliyi Blok 7-də təmin edilib; bu, yalnız qorunma xəttidir
  // (təkrar sətir gəlsə say ikiləşərdi və invariant sınardı).
  const seen = new Set<string>();
  const rows: CareerStatsRow[] = [];
  for (const row of input) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    rows.push(row);
  }

  // --- (b) + (c) ---
  // `pass` AÇIQLAMA QƏRARLARINI daşıyır və (strict rejimdə) yalnız sağ qalan
  // sətirlər üzərində hesablanır. `states` isə HƏMİŞƏ bütün sətirləri örtür —
  // yoxsa xanalar sətir itirər və invariant sınar (TƏLƏ A).
  let pass = runPass(rows);

  if (options.strictCrossDimension === true) {
    // Sabit nöqtə: sətir çıxarmaq xanaları kiçildir, kiçilmiş xana yeni
    // sətirləri həddin altına salır. Hər addımda ən azı bir sətir çıxır →
    // dövr ən çoxu `rows.length` addımda dayanır.
    for (;;) {
      const survivors = pass.states.filter((s) => isFullyDisclosed(s, pass)).map((s) => s.row);
      if (survivors.length === pass.states.length) break;
      pass = runPass(survivors);
      if (survivors.length === 0) break;
    }
  }

  const levelById = new Map(pass.states.map((s) => [s.row.userId, s.level]));
  const aliveIds = new Set(pass.states.map((s) => s.row.userId));

  const states = makeStates(rows);
  for (const state of states) {
    state.level = levelById.get(state.row.userId) ?? "HIDDEN";
  }
  const alive = new Set(states.filter((state) => aliveIds.has(state.row.userId)));

  // --- (d) saylar ---
  const countryCell = buildCountryCell(states, alive, pass);
  const cityCell = buildCityCell(states, alive);

  const companies = buildCell(states, alive, {
    valueOf: (s) => clean(s.row.company),
    disclosed: pass.disclosed.company,
    bucketOf: (key, count) => ({ key, count }),
    sortKeyOf: (bucket) => bucket.key,
  });

  const industries = buildCell(states, alive, {
    valueOf: (s) => clean(s.row.industry),
    disclosed: pass.disclosed.industry,
    bucketOf: (key, count) => ({ key, count }),
    sortKeyOf: (bucket) => bucket.key,
  });

  const jobFunctions = buildCell(states, alive, {
    valueOf: (s) => clean(s.row.jobFunction),
    disclosed: pass.disclosed.jobFunction,
    bucketOf: (key, count) => ({ key, count }),
    sortKeyOf: (bucket) => bucket.key,
  });

  const educationLevels = orderDegrees(
    buildCell(states, alive, {
      valueOf: (s) => clean(s.row.degree),
      disclosed: pass.disclosed.degree,
      bucketOf: (key, count) => ({ key, count }),
      sortKeyOf: (bucket) => bucket.key,
    }),
  );

  // Pinlər YALNIZ açıqlanan şəhər xanalarından qurulur.
  const cityStates = new Map<string, RowState[]>();
  for (const state of states) {
    if (!alive.has(state) || state.level !== "CITY" || state.cityKey === null) continue;
    const list = cityStates.get(state.cityKey);
    if (list) list.push(state);
    else cityStates.set(state.cityKey, [state]);
  }
  const mapPins = buildPins(cityStates);

  const countryFills: CountryFill[] = [];
  for (const bucket of countryCell.visible) {
    const resolved = findCountry(bucket.key);
    if (resolved === null) continue; // tanınmayan ölkə → doldurma yox
    countryFills.push({
      numeric: resolved.numeric,
      iso2: resolved.iso2,
      country: resolved.name,
      count: bucket.count,
    });
  }

  const suppressedCount = states.filter(
    (state) => !alive.has(state) || !isFullyDisclosed(state, pass),
  ).length;

  return {
    respondentCount: rows.length,
    totalConsented: options.totalConsented ?? rows.length,
    memberCount: options.memberCount ?? null,
    suppressedCount,
    viewerIncluded:
      options.viewerId !== undefined && rows.some((row) => row.userId === options.viewerId),

    countries: countryCell,
    cities: cityCell,
    companies,
    industries,
    jobFunctions,
    educationLevels,
    mapPins,
    azPins: mapPins.filter((pin) => findCountry(pin.country)?.name === AZERBAIJAN),
    countryFills,
  };
}

/**
 * Ölkə xanası — açar İNSAN OXUYAN ölkə adıdır, eşik yoxlaması isə
 * normallaşdırılmış açar üzərindən gedir ("Azerbaycan" və "Azərbaycan" EYNİ
 * xanadır; ayrı saysaydıq hər ikisi eşiyin altına düşüb gizlənərdi).
 */
function buildCountryCell(
  states: RowState[],
  alive: Set<RowState>,
  pass: Pass,
): StatsCell<StatsBucket> {
  const counts = new Map<string, number>();
  const labelOf = new Map<string, string>();
  let undisclosedCount = 0;
  let unknownCount = 0;

  for (const state of states) {
    const country = clean(state.row.country);
    if (country === null || state.countryKey === null) {
      unknownCount += 1;
      continue;
    }

    if (!alive.has(state) || !pass.disclosedCountries.has(state.countryKey)) {
      undisclosedCount += 1;
      continue;
    }

    counts.set(state.countryKey, (counts.get(state.countryKey) ?? 0) + 1);
    // Kanonik ad: cədvəldəki yazılış, yoxsa ilk görülən dəyər.
    if (!labelOf.has(state.countryKey)) {
      labelOf.set(state.countryKey, findCountry(country)?.name ?? country);
    }
  }

  const visible = sortBuckets(
    [...counts.entries()].map(([key, count]) => ({
      key: labelOf.get(key) ?? key,
      count,
    })),
    (bucket) => bucket.key,
  );

  return { visible, undisclosedCount, unknownCount };
}

/** Şəhər xanası — açar `ölkə|şəhər` cütüdür (eyni adlı şəhərlər qarışmasın). */
function buildCityCell(states: RowState[], alive: Set<RowState>): StatsCell<CityBucket> {
  const counts = new Map<string, number>();
  const labelOf = new Map<string, { city: string; country: string }>();
  let undisclosedCount = 0;
  let unknownCount = 0;

  for (const state of states) {
    const city = clean(state.row.city);
    if (city === null || state.cityKey === null) {
      unknownCount += 1;
      continue;
    }

    if (!alive.has(state) || state.level !== "CITY") {
      undisclosedCount += 1;
      continue;
    }

    counts.set(state.cityKey, (counts.get(state.cityKey) ?? 0) + 1);
    if (!labelOf.has(state.cityKey)) {
      const country = clean(state.row.country) ?? "";
      labelOf.set(state.cityKey, {
        city: findCity(city)?.name ?? city,
        country: findCountry(country)?.name ?? country,
      });
    }
  }

  const visible = sortBuckets(
    [...counts.entries()].map(([key, count]) => ({
      city: labelOf.get(key)?.city ?? key,
      country: labelOf.get(key)?.country ?? "",
      count,
    })),
    (bucket) => `${bucket.country}|${bucket.city}`,
  );

  return { visible, undisclosedCount, unknownCount };
}

// ---------------------------------------------------------------------------
// UI köməkçiləri (saf — komponentlərdə hesablama təkrarlanmasın)
// ---------------------------------------------------------------------------

/**
 * Bir nəfərin BİR təhsil pilləsi — ən yüksəyi.
 *
 * 🔴 NİYƏ LAZIMDIR: `EducationEntry` çoxdur (bakalavr + magistr + sertifikat).
 * Sətirləri saysaq bir nəfər üç dəfə sayılar və CƏM İNVARİANTI sınar. "İndi
 * haradayıq?" sualı nəfər sayır, diplom sayı yox.
 *
 * ⚠️ Rütbə `DEGREE_VALUES` sırası DEYİL: enum sırası UI üçündür (pillə şkalası
 * BACHELOR → MASTER → PHD → CERTIFICATE), burada isə "hansı daha yüksəkdir"
 * sualı var və sertifikat akademik pillə deyil — ən aşağı sayılır.
 */
const DEGREE_RANK: Record<string, number> = {
  CERTIFICATE: 1,
  BACHELOR: 2,
  MASTER: 3,
  PHD: 4,
};

export function pickHighestDegree(degrees: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestRank = 0;

  for (const degree of degrees) {
    const value = clean(degree);
    if (value === null) continue;
    // Naməlum dəyər ən aşağı rütbə alır, amma tamamilə atılmır (fail soft:
    // sxemə yeni pillə əlavə olunsa say itməsin).
    const rank = DEGREE_RANK[value] ?? 0;
    if (best === null || rank > bestRank) {
      best = value;
      bestRank = rank;
    }
  }

  return best;
}

/** Xananın cəmi — invariant yoxlaması və "kifayətsiz məlumat" qərarı üçün. */
export function cellTotal<T extends { count: number }>(cell: StatsCell<T>): number {
  return (
    cell.visible.reduce((sum, bucket) => sum + bucket.count, 0) +
    cell.undisclosedCount +
    cell.unknownCount
  );
}

/** Açıqlanmayan sətirlərin cəmi — UI-da tək «Açıqlanmayan» sətri kimi göstərilir. */
export function undisclosedTotal<T extends { count: number }>(cell: StatsCell<T>): number {
  return cell.undisclosedCount + cell.unknownCount;
}

/** Xanada göstərməyə dəyər məlumat varmı? Yoxsa "kifayət qədər məlumat yoxdur". */
export function hasDisclosedData<T extends { count: number }>(cell: StatsCell<T>): boolean {
  return cell.visible.length > 0;
}

/**
 * Pin radiusu — say ilə mütənasib, `PIN_MIN_RADIUS`…`PIN_MAX_RADIUS` arasında.
 * `max <= min` olanda bütün pinlər minimum ölçüdə qalır (bir şəhər halı).
 */
export function pinRadius(count: number, maxCount: number): number {
  if (maxCount <= MIN_BUCKET_SIZE) return PIN_MIN_RADIUS;
  const ratio = (count - MIN_BUCKET_SIZE) / (maxCount - MIN_BUCKET_SIZE);
  return PIN_MIN_RADIUS + Math.round(ratio * (PIN_MAX_RADIUS - PIN_MIN_RADIUS));
}

/** Ölkə doldurma intensivliyi — 0…`steps-1` arası indeks (rəng tokeni seçimi). */
export function fillStep(count: number, maxCount: number, steps: number): number {
  if (steps <= 1 || maxCount <= 0) return 0;
  const ratio = Math.min(1, count / maxCount);
  return Math.min(steps - 1, Math.max(0, Math.ceil(ratio * steps) - 1));
}

export { MIN_BUCKET_SIZE };
