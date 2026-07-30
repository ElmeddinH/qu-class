// ============================================================================
// src/utils/date.ts
// Azərbaycanca tarix formatlaması — BÜTÜN qatlar üçün vahid mənbə.
//
// İki fərqli giriş forması var və hər ikisi eyni funksiyadan keçməlidir:
//   · Server komponenti  → servisdən birbaşa `Date` obyekti gəlir
//   · Client komponenti  → `/api/*` cavabı JSON-dur, `Date` ISO SƏTRİDİR
//
// Buna görə hər köməkçi `string | Date` qəbul edir. `features/feed/format.ts`
// bu funksiyaları yenidən ixrac edir — lent komponentləri köhnə import yolunu
// saxlayır, məntiq isə tək yerdə yaşayır.
//
// `date-fns/locale/az` işlədilir; `Intl` ilə əl ilə qurmaq əvəzinə hazır
// lokalizasiya götürülür ("2 saat əvvəl", "5 İyul 2026").
// ============================================================================

import { format, formatDistanceToNow, isValid } from "date-fns";
import { az } from "date-fns/locale";

/** Formatlana bilməyən dəyər üçün UI-da göstərilən yer tutucu. */
const INVALID = "—";

/** ISO sətri və ya `Date` → `Date`. Xarab dəyər `null` qaytarır. */
export function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? date : null;
}

/** "təxminən 2 saat əvvəl" — lent kartının başlığında. */
export function relativeTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return INVALID;
  return formatDistanceToNow(date, { addSuffix: true, locale: az });
}

/** "5 İyul 2026, 14:30" — `title` atributunda dəqiq vaxt. */
export function exactDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return INVALID;
  return format(date, "d MMMM yyyy, HH:mm", { locale: az });
}

/** "5 İyul 2026" — nailiyyət / tədbir tarixi. */
export function shortDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return INVALID;
  return format(date, "d MMMM yyyy", { locale: az });
}

/** "5 İyul" — dar tədbir kartlarında (il sətri şişirdir). */
export function dayMonth(value: string | Date): string {
  const date = toDate(value);
  if (!date) return INVALID;
  return format(date, "d MMMM", { locale: az });
}

/** "14:30" — tədbir saatı. */
export function timeOfDay(value: string | Date): string {
  const date = toDate(value);
  if (!date) return INVALID;
  return format(date, "HH:mm", { locale: az });
}

// ---------------------------------------------------------------------------
// Forma girişi — `<input type="datetime-local">` / `<input type="date">`
// ---------------------------------------------------------------------------

/**
 * `<input type="datetime-local">` üçün dəyər: "YYYY-MM-DDTHH:mm".
 *
 * ⚠️ `toISOString()` İŞLƏTMƏ — o, UTC-yə çevirir və istifadəçinin saat
 * qurşağında saat sürüşür. Yerli komponentlərdən əl ilə qurulur.
 *
 * ⚠️ Yuxarıdakı formatlayıcılardan fərqli olaraq bu funksiya `Date` TƏLƏB
 * EDİR: forma dəyəri həmişə koddan gəlir (defolt tarix), API cavabından yox.
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
