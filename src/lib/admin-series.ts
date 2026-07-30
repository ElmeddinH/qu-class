// ============================================================================
// src/lib/admin-series.ts
// Dashboard qrafikinin HƏFTƏLİK xanaları — SAF modul (Prisma / React yoxdur).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ G — ANALİTİKA PROFİLLƏŞDİRMƏYƏ ÇEVRİLMƏMƏLİDİR
// ────────────────────────────────────────────────────────────────────────────
// Bu modul YALNIZ tarix → xana çevirməsi edir. Giriş `Date[]`-dir, yəni
// funksiyaya HƏTTA `userId` belə ötürülmür: «kim nə qədər paylaşıb» sualını
// ifadə etmək struktur olaraq mümkün deyil.
//
// Zaman seriyası (həftədə neçə paylaşım) məqbuldur — o, platformanın
// canlılığını göstərir və heç bir şəxsi işarə daşımır. ŞƏXSƏ BAĞLI SIRALAMA
// («ən aktiv istifadəçilər» lider cədvəli) YARADILMIR: platformanın öz məxfilik
// mövqeyi ilə ziddiyyət təşkil edərdi — istifadəçi `CLASS` səviyyəli paylaşım
// etdiyi halda adının universitet miqyaslı bir cədvəldə görünməsinə razılıq
// verməyib. Səbəb STATE.md-də də yazılıb.
// ============================================================================

/** Neçə həftə göstərilir — dashboard qrafikinin eni. */
export const SERIES_WEEKS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Həftənin başlanğıcı — BAZAR ERTƏSİ, UTC gecə yarısı.
 *
 * ⚠️ `getUTCDay()` bazar günü üçün `0` qaytarır. Bazar ertəsini başlanğıc
 * saymaq üçün `0` → `6` çevrilir; əks halda bazar günü öz həftəsindən bir
 * gün ƏVVƏLKİ xanaya düşərdi (klassik off-by-one).
 */
export function weekStart(date: Date): Date {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc;
}

export interface SeriesPoint {
  /** Həftənin ilk günü — `YYYY-MM-DD`. */
  week: string;
  /** `05.01` formasında qısa etiket (qrafik oxu üçün). */
  label: string;
  posts: number;
  members: number;
}

/** Boş xanalar da qalır — qrafikdə "heç nə olmayan həftə" görünməlidir. */
function emptyWeeks(now: Date, weeks: number): Date[] {
  const current = weekStart(now);
  return Array.from(
    { length: weeks },
    (_, i) => new Date(current.getTime() - (weeks - 1 - i) * WEEK_MS),
  );
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shortLabel(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/**
 * İki tarix massivini (paylaşım tarixləri · qeydiyyat tarixləri) həftəlik
 * xanalara yığır.
 *
 * @param now  «indi» — testdə sabit verilir, funksiya `new Date()` çağırmır.
 */
export function buildWeeklySeries(
  postDates: readonly Date[],
  memberDates: readonly Date[],
  now: Date,
  weeks: number = SERIES_WEEKS,
): SeriesPoint[] {
  const buckets = emptyWeeks(now, weeks);
  const index = new Map(buckets.map((date, i) => [isoDay(date), i]));

  const points: SeriesPoint[] = buckets.map((date) => ({
    week: isoDay(date),
    label: shortLabel(date),
    posts: 0,
    members: 0,
  }));

  const add = (dates: readonly Date[], field: "posts" | "members") => {
    for (const date of dates) {
      const at = index.get(isoDay(weekStart(date)));
      // Aralıqdan kənar tarix SƏSSİZCƏ atılır — sorğu onsuz da aralığı
      // süzür, bu yalnız sərhəd hallarına qarşı qorumadır.
      if (at !== undefined) points[at][field] += 1;
    }
  };

  add(postDates, "posts");
  add(memberDates, "members");

  return points;
}

/** Seriyanın başlanğıc tarixi — DB sorğusunun `gte` həddi. */
export function seriesRangeStart(now: Date, weeks: number = SERIES_WEEKS): Date {
  return new Date(weekStart(now).getTime() - (weeks - 1) * WEEK_MS);
}
