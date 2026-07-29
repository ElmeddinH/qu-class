// ============================================================================
// src/features/feed/format.ts
// Lentə xas formatlama köməkçiləri.
//
// ⚠️ Tarix funksiyaları ARTIQ BURADA DEYİL — `src/utils/date.ts`-dədir və
// aşağıda yenidən ixrac olunur (lent komponentlərinin import yolu dəyişmir).
//
// Səbəb: Blok 5-dəki Class Page widget-ləri SERVER komponentidir və servisdən
// birbaşa `Date` obyekti alır, lent isə `/api/feed` cavabından ISO SƏTRİ alır.
// İki qat eyni funksiyadan keçməlidir, yoxsa azərbaycanca formatlama iki yerdə
// ayrı-ayrı sürüşür.
//
// Burada yalnız lentə xas olanlar qalır: forma girişi üçün YERLİ tarix dəyəri
// və yükləmə önizləməsindəki fayl ölçüsü.
// ============================================================================

export {
  toDate,
  relativeTime,
  exactDateTime,
  shortDate,
  dayMonth,
  timeOfDay,
} from "@/utils/date";

/**
 * `<input type="datetime-local">` üçün dəyər: "YYYY-MM-DDTHH:mm".
 *
 * ⚠️ `toISOString()` İŞLƏTMƏ — o, UTC-yə çevirir və istifadəçi saat qurşağında
 * saat sürüşür. Yerli komponentlərdən əl ilə qurulur.
 */
export function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** `<input type="date">` üçün dəyər: "YYYY-MM-DD" (eyni səbəb — yerli vaxt). */
export function toLocalDateValue(date: Date): string {
  return toLocalDateTimeValue(date).slice(0, 10);
}

/** "1,2 MB" / "340 KB" — yükləmə önizləməsində. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
