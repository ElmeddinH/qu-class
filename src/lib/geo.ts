// ============================================================================
// src/lib/geo.ts
// STATİK coğrafi sabitlər — "İndi haradayıq?" xəritəsi (spec §13, [M11]).
//
// 🔴 TƏLƏ B — KOORDİNAT BAZADAN GƏLMİR.
// Bu faylda `prisma` importu YOXDUR və heç vaxt olmamalıdır. Sxemdə
// `CareerEntry.latitude` / `longitude` sütunları QƏSDƏN yoxdur; `GuidePlace`-də
// koordinat var, amma onlar Xankəndi MƏKANLARIDIR (ictimai infrastruktur),
// insanlar deyil. Bir istifadəçinin dəqiq yerini xəritəyə qoymaq spec §13-ün və
// CLAUDE.md-nin («İctimai görünüşdə dəqiq ünvan/koordinat heç vaxt») birbaşa
// pozulmasıdır.
//
// Xəritə buna görə YALNIZ aşağıdaki statik cədvəllərdən oxuyur: pin şəhərin
// (və ya ölkənin) MƏRKƏZİNƏ qoyulur. İki nəfər eyni şəhərdədirsə eyni nöqtədə
// birləşirlər — bu, xəritəni "insan izləyicisi" olmaqdan qoruyan struktur
// qərardır, təsadüf deyil.
//
// ----------------------------------------------------------------------------
// NORMALLAŞDIRMA — NİYƏ AYRI FUNKSİYA VAR
// ----------------------------------------------------------------------------
// `lib/text-search.ts` (Blok 6, T14) SQLite-ın hərf həssaslığını DB SORĞUSUNDA
// həll edir: sorğu sətrindən `az` lokalı ilə variantlar qurub `contains` şərtini
// OR-layır. Orada məqsəd `LIKE`-a nə verməkdir; burada məqsəd İKİ SƏTRİN eyni
// şəhər olub-olmadığını müəyyən etməkdir.
//
// İkisi eyni funksiya OLA BİLMƏZ (biri `where` obyekti qaytarır, biri açar),
// amma LOKAL eynidir və oradan import olunur (`AZ_LOCALE`) — iki fərqli lokal
// iki fərqli nəticə verərdi ("İstanbul" vs "istanbul" məsələsi).
//
// Bundan əlavə burada DİAKRİTİK QATLAMA var (ə→e, ş→s, ğ→g, ö→o, ü→u, ç→c,
// ı→i): istifadəçi "Sheki", "Şəki", "Seki" yaza bilər və üçü də EYNİ şəhərdir.
// `text-search.ts` bunu etmir, çünki `LIKE` şərtinə qatlanmış sətir yazsaq
// bazadaki əsl dəyəri tapmaz.
// ============================================================================

import { AZ_LOCALE } from "@/lib/text-search";

/** Azərbaycan xəritəsi bu ölkə adına görə seçilir (seed və UI eyni sətri işlədir). */
export const AZERBAIJAN = "Azərbaycan";

// ---------------------------------------------------------------------------
// Normallaşdırma
// ---------------------------------------------------------------------------

/**
 * Azərbaycan hərflərinin ASCII qarşılığı.
 *
 * ⚠️ `İ` və `I` burada YOXDUR — onları `toLocaleLowerCase(AZ_LOCALE)` özü
 * `i` / `ı`-ya çevirir, `ı` isə aşağıdaki cədvəldə `i`-yə düşür. Böyük hərfləri
 * də yazsaq iki yerdə eyni qayda saxlanardı.
 */
const FOLD: Record<string, string> = {
  ə: "e",
  ı: "i",
  ş: "s",
  ğ: "g",
  ö: "o",
  ü: "u",
  ç: "c",
};

/**
 * Şəhər / ölkə adını müqayisə açarına çevirir.
 *
 * Addımlar: `az` lokalı ilə kiçik hərf → diakritik qatlama → hərf və rəqəmdən
 * başqa hər şeyi (boşluq, tire, apostrof, nöqtə) at.
 *
 *   "Bakı" · "BAKI" · " baki " · "Bakı." → "baki"
 *   "Nyu-York" · "Nyu York"             → "nyuyork"
 *   "Əbu-Dabi" · "Abu Dabi"             → "ebudabi"
 *
 * ⚠️ ÖLKƏ adları da MƏHZ bu funksiyadan keçir. Ayrı `normalizeCountryKey`
 * yazmaq iki fərqli qatlama qaydası (deməli iki fərqli nəticə) riski deməkdir —
 * bir şəhərin ölkəsi cədvəldə tapılmayanda səbəbi tapmaq günlər alır.
 */
export function normalizeCityKey(value: string): string {
  const lowered = value.trim().toLocaleLowerCase(AZ_LOCALE);

  let out = "";
  for (const char of lowered) {
    const folded = FOLD[char] ?? char;
    // \p{L} = hər hansı dildə hərf, \p{N} = rəqəm. Qalanı ayırıcıdır.
    if (/[\p{L}\p{N}]/u.test(folded)) out += folded;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Ölkə mərkəzləri + ISO uyğunluğu
// ---------------------------------------------------------------------------

export interface CountryCoord {
  lat: number;
  lon: number;
  /** ISO 3166-1 alpha-2 — `NAME_TO_ISO` bundan törəyir. */
  iso2: string;
  /**
   * ISO 3166-1 numeric (üç rəqəm, sıfırla doldurulmuş).
   *
   * 🔴 `world-atlas` (countries-110m) topologiyasında hər poliqonun `id`-si
   * MƏHZ bu dəyərdir (`properties.name` isə İNGİLİSCƏ addır). Yəni ölkə
   * doldurmasını bağlamaq üçün alpha-2 KİFAYƏT ETMİR — numeric lazımdır.
   * Alpha-2 sənəd/API üçün saxlanılır (oxunaqlıdır və beynəlxalq standartdır).
   */
  numeric: string;
}

/**
 * Ölkə mərkəzləri (təxmini centroid).
 *
 * ⚠️ Bu cədvəl BÜTÜN dünyanı əhatə etmək məqsədi daşımır — seed-dəki və realistik
 * məzun marşrutlarındaki ölkələri əhatə edir. Tanınmayan ölkə "Açıqlanmayan"a
 * düşür (siyahıda görünür, xəritədə görünmür) — səssizcə atılmır.
 *
 * ⚠️ Açar İNSAN OXUYAN addır (seed və profil formaları eyni sətri yazır);
 * müqayisə `normalizeCityKey` ilə qurulan indeksdən gedir.
 */
export const COUNTRY_COORDS: Record<string, CountryCoord> = {
  [AZERBAIJAN]: { lat: 40.14, lon: 47.58, iso2: "AZ", numeric: "031" },
  Türkiyə: { lat: 39.0, lon: 35.24, iso2: "TR", numeric: "792" },
  Gürcüstan: { lat: 42.32, lon: 43.36, iso2: "GE", numeric: "268" },
  Rusiya: { lat: 61.52, lon: 105.32, iso2: "RU", numeric: "643" },
  Ukrayna: { lat: 48.38, lon: 31.17, iso2: "UA", numeric: "804" },
  Belarus: { lat: 53.71, lon: 27.95, iso2: "BY", numeric: "112" },
  Almaniya: { lat: 51.17, lon: 10.45, iso2: "DE", numeric: "276" },
  "Böyük Britaniya": { lat: 54.0, lon: -2.0, iso2: "GB", numeric: "826" },
  İrlandiya: { lat: 53.14, lon: -7.69, iso2: "IE", numeric: "372" },
  Niderland: { lat: 52.13, lon: 5.29, iso2: "NL", numeric: "528" },
  Belçika: { lat: 50.5, lon: 4.47, iso2: "BE", numeric: "056" },
  Fransa: { lat: 46.23, lon: 2.21, iso2: "FR", numeric: "250" },
  İspaniya: { lat: 40.46, lon: -3.75, iso2: "ES", numeric: "724" },
  Portuqaliya: { lat: 39.4, lon: -8.22, iso2: "PT", numeric: "620" },
  İtaliya: { lat: 41.87, lon: 12.57, iso2: "IT", numeric: "380" },
  İsveçrə: { lat: 46.82, lon: 8.23, iso2: "CH", numeric: "756" },
  Avstriya: { lat: 47.52, lon: 14.55, iso2: "AT", numeric: "040" },
  Polşa: { lat: 51.92, lon: 19.15, iso2: "PL", numeric: "616" },
  Çexiya: { lat: 49.82, lon: 15.47, iso2: "CZ", numeric: "203" },
  Slovakiya: { lat: 48.67, lon: 19.7, iso2: "SK", numeric: "703" },
  Macarıstan: { lat: 47.16, lon: 19.5, iso2: "HU", numeric: "348" },
  Rumıniya: { lat: 45.94, lon: 24.97, iso2: "RO", numeric: "642" },
  Bolqarıstan: { lat: 42.73, lon: 25.49, iso2: "BG", numeric: "100" },
  Yunanıstan: { lat: 39.07, lon: 21.82, iso2: "GR", numeric: "300" },
  Xorvatiya: { lat: 45.1, lon: 15.2, iso2: "HR", numeric: "191" },
  Sloveniya: { lat: 46.15, lon: 14.99, iso2: "SI", numeric: "705" },
  Serbiya: { lat: 44.02, lon: 21.01, iso2: "RS", numeric: "688" },
  İsveç: { lat: 60.13, lon: 18.64, iso2: "SE", numeric: "752" },
  Norveç: { lat: 60.47, lon: 8.47, iso2: "NO", numeric: "578" },
  Danimarka: { lat: 56.26, lon: 9.5, iso2: "DK", numeric: "208" },
  Finlandiya: { lat: 61.92, lon: 25.75, iso2: "FI", numeric: "246" },
  Estoniya: { lat: 58.6, lon: 25.01, iso2: "EE", numeric: "233" },
  Latviya: { lat: 56.88, lon: 24.6, iso2: "LV", numeric: "428" },
  Litva: { lat: 55.17, lon: 23.88, iso2: "LT", numeric: "440" },
  İslandiya: { lat: 64.96, lon: -19.02, iso2: "IS", numeric: "352" },
  Kipr: { lat: 35.13, lon: 33.43, iso2: "CY", numeric: "196" },
  ABŞ: { lat: 39.83, lon: -98.58, iso2: "US", numeric: "840" },
  Kanada: { lat: 56.13, lon: -106.35, iso2: "CA", numeric: "124" },
  Meksika: { lat: 23.63, lon: -102.55, iso2: "MX", numeric: "484" },
  Braziliya: { lat: -14.24, lon: -51.93, iso2: "BR", numeric: "076" },
  Argentina: { lat: -38.42, lon: -63.62, iso2: "AR", numeric: "032" },
  "Birləşmiş Ərəb Əmirlikləri": { lat: 23.42, lon: 53.85, iso2: "AE", numeric: "784" },
  Qətər: { lat: 25.35, lon: 51.18, iso2: "QA", numeric: "634" },
  "Səudiyyə Ərəbistanı": { lat: 23.89, lon: 45.08, iso2: "SA", numeric: "682" },
  Küveyt: { lat: 29.31, lon: 47.48, iso2: "KW", numeric: "414" },
  İsrail: { lat: 31.05, lon: 34.85, iso2: "IL", numeric: "376" },
  İran: { lat: 32.43, lon: 53.69, iso2: "IR", numeric: "364" },
  Qazaxıstan: { lat: 48.02, lon: 66.92, iso2: "KZ", numeric: "398" },
  Özbəkistan: { lat: 41.38, lon: 64.59, iso2: "UZ", numeric: "860" },
  Türkmənistan: { lat: 38.97, lon: 59.56, iso2: "TM", numeric: "795" },
  Qırğızıstan: { lat: 41.2, lon: 74.77, iso2: "KG", numeric: "417" },
  Tacikistan: { lat: 38.86, lon: 71.28, iso2: "TJ", numeric: "762" },
  Hindistan: { lat: 20.59, lon: 78.96, iso2: "IN", numeric: "356" },
  Çin: { lat: 35.86, lon: 104.2, iso2: "CN", numeric: "156" },
  Yaponiya: { lat: 36.2, lon: 138.25, iso2: "JP", numeric: "392" },
  "Cənubi Koreya": { lat: 35.91, lon: 127.77, iso2: "KR", numeric: "410" },
  // ⚠️ Sinqapur `countries-110m` topologiyasında YOXDUR (110m miqyasında şəhər
  // dövləti poliqona düşmür). Şəhər markeri yenə çəkilir, yalnız ölkə
  // doldurması olmur — cədvəldəki say dəyişmir (`geo.test.ts` bunu yoxlayır).
  Sinqapur: { lat: 1.35, lon: 103.82, iso2: "SG", numeric: "702" },
  Malayziya: { lat: 4.21, lon: 101.98, iso2: "MY", numeric: "458" },
  Avstraliya: { lat: -25.27, lon: 133.78, iso2: "AU", numeric: "036" },
  "Yeni Zelandiya": { lat: -40.9, lon: 174.89, iso2: "NZ", numeric: "554" },
  Misir: { lat: 26.82, lon: 30.8, iso2: "EG", numeric: "818" },
  Mərakeş: { lat: 31.79, lon: -7.09, iso2: "MA", numeric: "504" },
  "Cənubi Afrika": { lat: -30.56, lon: 22.94, iso2: "ZA", numeric: "710" },
};

/**
 * Ölkə adı → ISO 3166-1 alpha-2.
 *
 * `COUNTRY_COORDS`-dan TÖRƏYİR — əl ilə saxlanılan ikinci cədvəl bir müddət
 * sonra birincidən ayrılır. Yeni ölkə yalnız yuxarıya yazılır.
 */
export const NAME_TO_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_COORDS).map(([name, coord]) => [name, coord.iso2]),
);

// ---------------------------------------------------------------------------
// Şəhər mərkəzləri
// ---------------------------------------------------------------------------

export interface CityCoord {
  lat: number;
  lon: number;
  /** `COUNTRY_COORDS` açarı — testlə bərkidilib (orfan şəhər ola bilməz). */
  country: string;
}

/**
 * Şəhər mərkəzləri.
 *
 * Azərbaycan hissəsi Qarabağ və Şərqi Zəngəzur şəhərlərini də əhatə edir
 * (Xankəndi, Şuşa, Ağdam, Laçın, Kəlbəcər, Zəngilan, Cəbrayıl, Füzuli…) —
 * universitetin öz şəhəri Xankəndidir və məzunların bir hissəsi bölgəyə qayıdır.
 *
 * ⚠️ RAYON SƏRHƏDLƏRİ YOXDUR və tələb DEYİL: Azərbaycan görünüşü dünya
 * topologiyasındaki AZ poliqonundan + bu markerlərdən qurulur (ayrı geojson
 * axtarılmır).
 */
export const CITY_COORDS: Record<string, CityCoord> = {
  // --- Azərbaycan ---
  Bakı: { lat: 40.4093, lon: 49.8671, country: AZERBAIJAN },
  Xırdalan: { lat: 40.4553, lon: 49.7556, country: AZERBAIJAN },
  Sumqayıt: { lat: 40.5855, lon: 49.6317, country: AZERBAIJAN },
  Xankəndi: { lat: 39.8153, lon: 46.7519, country: AZERBAIJAN },
  Şuşa: { lat: 39.7597, lon: 46.7489, country: AZERBAIJAN },
  Xocalı: { lat: 39.9139, lon: 46.7889, country: AZERBAIJAN },
  Ağdərə: { lat: 40.2103, lon: 46.8306, country: AZERBAIJAN },
  Ağdam: { lat: 39.9931, lon: 46.9306, country: AZERBAIJAN },
  Laçın: { lat: 39.6383, lon: 46.5464, country: AZERBAIJAN },
  Kəlbəcər: { lat: 40.1022, lon: 46.0364, country: AZERBAIJAN },
  Qubadlı: { lat: 39.3453, lon: 46.5817, country: AZERBAIJAN },
  Zəngilan: { lat: 39.0872, lon: 46.6528, country: AZERBAIJAN },
  Cəbrayıl: { lat: 39.3994, lon: 47.0264, country: AZERBAIJAN },
  Füzuli: { lat: 39.6003, lon: 47.1428, country: AZERBAIJAN },
  Tərtər: { lat: 40.3439, lon: 46.9319, country: AZERBAIJAN },
  Bərdə: { lat: 40.3744, lon: 47.1264, country: AZERBAIJAN },
  Ağcabədi: { lat: 40.0533, lon: 47.46, country: AZERBAIJAN },
  Beyləqan: { lat: 39.7722, lon: 47.6161, country: AZERBAIJAN },
  İmişli: { lat: 39.8697, lon: 48.0653, country: AZERBAIJAN },
  Yevlax: { lat: 40.6194, lon: 47.15, country: AZERBAIJAN },
  Mingəçevir: { lat: 40.77, lon: 47.0489, country: AZERBAIJAN },
  Gəncə: { lat: 40.6828, lon: 46.3606, country: AZERBAIJAN },
  Naftalan: { lat: 40.5069, lon: 46.8206, country: AZERBAIJAN },
  Şəmkir: { lat: 40.8294, lon: 46.0206, country: AZERBAIJAN },
  Tovuz: { lat: 40.9931, lon: 45.6247, country: AZERBAIJAN },
  Qazax: { lat: 41.0925, lon: 45.3661, country: AZERBAIJAN },
  Şəki: { lat: 41.1975, lon: 47.1706, country: AZERBAIJAN },
  Zaqatala: { lat: 41.6317, lon: 46.6444, country: AZERBAIJAN },
  Balakən: { lat: 41.7231, lon: 46.4058, country: AZERBAIJAN },
  Qax: { lat: 41.4206, lon: 46.9247, country: AZERBAIJAN },
  Oğuz: { lat: 41.0714, lon: 47.465, country: AZERBAIJAN },
  Qəbələ: { lat: 40.9822, lon: 47.845, country: AZERBAIJAN },
  İsmayıllı: { lat: 40.7897, lon: 48.1519, country: AZERBAIJAN },
  Göyçay: { lat: 40.6533, lon: 47.7406, country: AZERBAIJAN },
  Zərdab: { lat: 40.2183, lon: 47.7089, country: AZERBAIJAN },
  Şamaxı: { lat: 40.6317, lon: 48.6414, country: AZERBAIJAN },
  Ağsu: { lat: 40.5719, lon: 48.3903, country: AZERBAIJAN },
  Quba: { lat: 41.3625, lon: 48.5128, country: AZERBAIJAN },
  Xaçmaz: { lat: 41.4589, lon: 48.8022, country: AZERBAIJAN },
  Şirvan: { lat: 39.9333, lon: 48.92, country: AZERBAIJAN },
  Salyan: { lat: 39.5964, lon: 48.9797, country: AZERBAIJAN },
  Sabirabad: { lat: 40.0056, lon: 48.4761, country: AZERBAIJAN },
  Cəlilabad: { lat: 39.2089, lon: 48.5106, country: AZERBAIJAN },
  Masallı: { lat: 39.0339, lon: 48.6633, country: AZERBAIJAN },
  Lənkəran: { lat: 38.7539, lon: 48.8511, country: AZERBAIJAN },
  Astara: { lat: 38.4561, lon: 48.8725, country: AZERBAIJAN },
  Naxçıvan: { lat: 39.2089, lon: 45.4122, country: AZERBAIJAN },
  Ordubad: { lat: 38.9053, lon: 46.0233, country: AZERBAIJAN },
  Culfa: { lat: 38.955, lon: 45.63, country: AZERBAIJAN },

  // --- Türkiyə ---
  İstanbul: { lat: 41.0082, lon: 28.9784, country: "Türkiyə" },
  Ankara: { lat: 39.9334, lon: 32.8597, country: "Türkiyə" },
  İzmir: { lat: 38.4237, lon: 27.1428, country: "Türkiyə" },
  Antalya: { lat: 36.8969, lon: 30.7133, country: "Türkiyə" },
  Bursa: { lat: 40.1826, lon: 29.0665, country: "Türkiyə" },
  Trabzon: { lat: 41.0027, lon: 39.7168, country: "Türkiyə" },

  // --- Qafqaz və post-sovet ---
  Tbilisi: { lat: 41.7151, lon: 44.8271, country: "Gürcüstan" },
  Batumi: { lat: 41.6168, lon: 41.6367, country: "Gürcüstan" },
  Moskva: { lat: 55.7558, lon: 37.6173, country: "Rusiya" },
  "Sankt-Peterburq": { lat: 59.9311, lon: 30.3609, country: "Rusiya" },
  Kiyev: { lat: 50.4501, lon: 30.5234, country: "Ukrayna" },
  Minsk: { lat: 53.9006, lon: 27.559, country: "Belarus" },
  Almatı: { lat: 43.222, lon: 76.8512, country: "Qazaxıstan" },
  Astana: { lat: 51.1694, lon: 71.4491, country: "Qazaxıstan" },
  Daşkənd: { lat: 41.2995, lon: 69.2401, country: "Özbəkistan" },
  Aşqabad: { lat: 37.9601, lon: 58.3261, country: "Türkmənistan" },
  Bişkek: { lat: 42.8746, lon: 74.5698, country: "Qırğızıstan" },

  // --- Avropa ---
  Berlin: { lat: 52.52, lon: 13.405, country: "Almaniya" },
  Münhen: { lat: 48.1351, lon: 11.582, country: "Almaniya" },
  Hamburq: { lat: 53.5511, lon: 9.9937, country: "Almaniya" },
  Köln: { lat: 50.9375, lon: 6.9603, country: "Almaniya" },
  Frankfurt: { lat: 50.1109, lon: 8.6821, country: "Almaniya" },
  Ştutqart: { lat: 48.7758, lon: 9.1829, country: "Almaniya" },
  Düsseldorf: { lat: 51.2277, lon: 6.7735, country: "Almaniya" },
  Varşava: { lat: 52.2297, lon: 21.0122, country: "Polşa" },
  Krakov: { lat: 50.0647, lon: 19.945, country: "Polşa" },
  Vroslav: { lat: 51.1079, lon: 17.0385, country: "Polşa" },
  London: { lat: 51.5074, lon: -0.1278, country: "Böyük Britaniya" },
  Mançester: { lat: 53.4808, lon: -2.2426, country: "Böyük Britaniya" },
  Edinburq: { lat: 55.9533, lon: -3.1883, country: "Böyük Britaniya" },
  Dublin: { lat: 53.3498, lon: -6.2603, country: "İrlandiya" },
  Amsterdam: { lat: 52.3676, lon: 4.9041, country: "Niderland" },
  Rotterdam: { lat: 51.9244, lon: 4.4777, country: "Niderland" },
  Eyndhoven: { lat: 51.4416, lon: 5.4697, country: "Niderland" },
  Brüssel: { lat: 50.8503, lon: 4.3517, country: "Belçika" },
  Paris: { lat: 48.8566, lon: 2.3522, country: "Fransa" },
  Lion: { lat: 45.764, lon: 4.8357, country: "Fransa" },
  Tuluza: { lat: 43.6047, lon: 1.4442, country: "Fransa" },
  Madrid: { lat: 40.4168, lon: -3.7038, country: "İspaniya" },
  Barselona: { lat: 41.3874, lon: 2.1686, country: "İspaniya" },
  Lissabon: { lat: 38.7223, lon: -9.1393, country: "Portuqaliya" },
  Milan: { lat: 45.4642, lon: 9.19, country: "İtaliya" },
  Roma: { lat: 41.9028, lon: 12.4964, country: "İtaliya" },
  Turin: { lat: 45.0703, lon: 7.6869, country: "İtaliya" },
  Sürix: { lat: 47.3769, lon: 8.5417, country: "İsveçrə" },
  Cenevrə: { lat: 46.2044, lon: 6.1432, country: "İsveçrə" },
  Vyana: { lat: 48.2082, lon: 16.3738, country: "Avstriya" },
  Praqa: { lat: 50.0755, lon: 14.4378, country: "Çexiya" },
  Brno: { lat: 49.1951, lon: 16.6068, country: "Çexiya" },
  Stokholm: { lat: 59.3293, lon: 18.0686, country: "İsveç" },
  Göteborq: { lat: 57.7089, lon: 11.9746, country: "İsveç" },
  Oslo: { lat: 59.9139, lon: 10.7522, country: "Norveç" },
  Kopenhagen: { lat: 55.6761, lon: 12.5683, country: "Danimarka" },
  Helsinki: { lat: 60.1699, lon: 24.9384, country: "Finlandiya" },

  // --- Yaxın Şərq ---
  Dubay: { lat: 25.2048, lon: 55.2708, country: "Birləşmiş Ərəb Əmirlikləri" },
  "Əbu-Dabi": { lat: 24.4539, lon: 54.3773, country: "Birləşmiş Ərəb Əmirlikləri" },
  Doha: { lat: 25.2854, lon: 51.531, country: "Qətər" },
  Riyad: { lat: 24.7136, lon: 46.6753, country: "Səudiyyə Ərəbistanı" },
  "Tel-Əviv": { lat: 32.0853, lon: 34.7818, country: "İsrail" },
  Tehran: { lat: 35.6892, lon: 51.389, country: "İran" },

  // --- Amerika ---
  "Nyu-York": { lat: 40.7128, lon: -74.006, country: "ABŞ" },
  Boston: { lat: 42.3601, lon: -71.0589, country: "ABŞ" },
  Sietl: { lat: 47.6062, lon: -122.3321, country: "ABŞ" },
  Ostin: { lat: 30.2672, lon: -97.7431, country: "ABŞ" },
  Çikaqo: { lat: 41.8781, lon: -87.6298, country: "ABŞ" },
  "Los-Anceles": { lat: 34.0522, lon: -118.2437, country: "ABŞ" },
  "San-Fransisko": { lat: 37.7749, lon: -122.4194, country: "ABŞ" },
  Vaşinqton: { lat: 38.9072, lon: -77.0369, country: "ABŞ" },
  Hyuston: { lat: 29.7604, lon: -95.3698, country: "ABŞ" },
  Toronto: { lat: 43.6532, lon: -79.3832, country: "Kanada" },
  Vankuver: { lat: 49.2827, lon: -123.1207, country: "Kanada" },
  Monreal: { lat: 45.5019, lon: -73.5674, country: "Kanada" },
  Kalqari: { lat: 51.0447, lon: -114.0719, country: "Kanada" },

  // --- Asiya-Sakit okean və Afrika ---
  Pekin: { lat: 39.9042, lon: 116.4074, country: "Çin" },
  Şanxay: { lat: 31.2304, lon: 121.4737, country: "Çin" },
  Tokio: { lat: 35.6762, lon: 139.6503, country: "Yaponiya" },
  Seul: { lat: 37.5665, lon: 126.978, country: "Cənubi Koreya" },
  Sidney: { lat: -33.8688, lon: 151.2093, country: "Avstraliya" },
  Qahirə: { lat: 30.0444, lon: 31.2357, country: "Misir" },
  Kazablanka: { lat: 33.5731, lon: -7.5898, country: "Mərakeş" },
};

// ---------------------------------------------------------------------------
// Axtarış — normallaşdırılmış indekslər (modul yüklənəndə bir dəfə qurulur)
// ---------------------------------------------------------------------------

export interface ResolvedCity extends CityCoord {
  /** Cədvəldəki kanonik ad — istifadəçinin yazdığı variant deyil. */
  name: string;
}

export interface ResolvedCountry extends CountryCoord {
  name: string;
}

const CITY_INDEX = new Map<string, ResolvedCity>(
  Object.entries(CITY_COORDS).map(([name, coord]) => [
    normalizeCityKey(name),
    { ...coord, name },
  ]),
);

const COUNTRY_INDEX = new Map<string, ResolvedCountry>(
  Object.entries(COUNTRY_COORDS).map(([name, coord]) => [
    normalizeCityKey(name),
    { ...coord, name },
  ]),
);

/**
 * Şəhər adını koordinata çevirir. Tanınmasa `null` — çağıran tərəf pin
 * YARATMIR və sətri ölkə səviyyəsində sayır (bax `lib/career-stats.ts`).
 */
export function findCity(city: string | null | undefined): ResolvedCity | null {
  if (!city) return null;
  return CITY_INDEX.get(normalizeCityKey(city)) ?? null;
}

/** Ölkə adını koordinat + ISO-ya çevirir. Tanınmasa `null`. */
export function findCountry(country: string | null | undefined): ResolvedCountry | null {
  if (!country) return null;
  return COUNTRY_INDEX.get(normalizeCityKey(country)) ?? null;
}

/**
 * `world-atlas` poliqonunun `id`-si (ISO numeric). Ölkə tanınmasa `null` —
 * xəritədə heç bir sahə doldurulmur, say yalnız siyahıda görünür.
 */
export function countryNumericOf(country: string | null | undefined): string | null {
  return findCountry(country)?.numeric ?? null;
}

/** Ölkənin Azərbaycan olub-olmadığı (hərf variantlarına dözümlü). */
export function isAzerbaijan(country: string | null | undefined): boolean {
  return findCountry(country)?.name === AZERBAIJAN;
}
