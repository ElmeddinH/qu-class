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
// ⚠️ Blok 9: forma girişi üçün YERLİ tarix köməkçiləri də `utils/date.ts`-ə
// köçdü — tədbir formu (`features/events/EventComposer`) onlara ehtiyac duyur,
// `features/*` isə BİR-BİRİNDƏN import etməməlidir (istiqamət həmişə
// features → lib / utils / shared). Burada yenidən ixrac olunurlar.
//
// Burada yalnız lentə xas olan qalır: yükləmə önizləməsindəki fayl ölçüsü.
// ============================================================================

export {
  toDate,
  relativeTime,
  exactDateTime,
  shortDate,
  dayMonth,
  timeOfDay,
  toLocalDateTimeValue,
  toLocalDateValue,
} from "@/utils/date";

/** "1,2 MB" / "340 KB" — yükləmə önizləməsində. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
