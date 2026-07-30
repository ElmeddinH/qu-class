// ============================================================================
// src/lib/headline-stats.ts
// Class Page başlıq zolağının GİZLƏTMƏ qaydası — SAF modul.
//
// 🔴 Zolaq AQREQASİYADIR: "N üzv · X şəhərdən · Y ölkədən · Z klubda ·
// W nailiyyət". Kiçik sinifdə belə saylar özü fərdi məlumatdır — 2 nəfərlik
// sinifdə "1 ölkədən" cümləsi konkret adamın harada olduğunu deyir. Ona görə
// zolaq TAMAMİLƏ gizlənir (rəqəmi "gizlədilib" kimi göstərmək də cavabdır).
//
// Hədd `MIN_BUCKET_SIZE`-dır — `lib/visibility.ts`-dəki VAHİD sabit
// (`suppressSmallBuckets` da onu işlədir). Burada yeni ədəd YAZILMIR, yalnız
// yenidən ixrac olunur: iki hədd bir-birindən ayrılsaydı "İndi haradayıq?"
// paneli ilə başlıq zolağı fərqli məxfilik vəd edərdi.
//
// Servis (`stats.service.getCohortHeadlineStats`) bu predikatı çağırır; qayda
// burada saf qaldığı üçün bazasız unit testlə yoxlanılır.
// ============================================================================

import { MIN_BUCKET_SIZE } from "@/lib/visibility";

/** Zolağın göstərilməsi üçün minimum üzv sayı. */
export const HEADLINE_MIN_MEMBERS = MIN_BUCKET_SIZE;

/** Sinif bu qədər kiçikdirsə zolaq ÜMUMİYYƏTLƏ render olunmur. */
export function isHeadlineStatsVisible(memberCount: number): boolean {
  return memberCount >= HEADLINE_MIN_MEMBERS;
}
