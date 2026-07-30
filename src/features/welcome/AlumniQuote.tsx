// ============================================================================
// src/features/welcome/AlumniQuote.tsx
// «Məzun sitatı» — MESSAGE_TO_QU / WHAT_UNI_GAVE_ME növündən fırlanan sitat
// (GW analizi #12).
//
// 🔴 ANONİM VIEWER İLƏ ÇƏKİLİR — yalnız `PUBLIC` xatirələr (səhifə səviyyəli
// qayda, `WelcomePage` başlığı). Sitat müəllifin ADI ilə göstərilir və bu,
// sızma DEYİL: `PUBLIC` seçimi məhz "hamı görsün" deməkdir.
//
// ⚠️ SİTAT «FIRLANIR», amma TƏSADÜFİ DEYİL. `Math.random()` server
// komponentində hər sorğuda başqa nəticə verir və HİDRASİYA UYĞUNSUZLUĞU
// riski yaradır; üstəlik e2e testi sabit bir dəyəri gözləyə bilmir. Bunun
// əvəzinə GÜN NÖMRƏSİ ilə seçilir: eyni gün ərzində sitat sabitdir, hər gün
// dəyişir. Seçim SAF funksiyadır (`pickRotatingIndex`) və testlə örtülüb.
//
// ⚠️ Sitat yoxdursa bölmə GİZLƏNİR (`null`) — açılışda boş sitat çərçivəsi
// «məzunumuz yoxdur» kimi oxunur.
// ============================================================================

import { Quote } from "lucide-react";

import { memoryTypeLabel } from "@/lib/labels";
import type { MemoryItem } from "@/services/memory.service";

/**
 * Gün nömrəsinə görə dönən indeks — SAF (test edilə bilir).
 *
 * ⚠️ `Math.random()` ƏVƏZİNƏ işlədilir: server komponentində təsadüf hər
 * sorğuda başqa HTML deməkdir (keş və hidrasiya problemi), gün nömrəsi isə
 * deterministikdir. `epochDay` = 1970-dən bəri keçən tam gün sayı.
 */
export function pickRotatingIndex(count: number, now: Date): number {
  if (count <= 0) return -1;
  const epochDay = Math.floor(now.getTime() / 86_400_000);
  return ((epochDay % count) + count) % count;
}

interface AlumniQuoteProps {
  quotes: MemoryItem[];
  /** Səhifə render vaxtı — test üçün ötürülə bilir. */
  now?: Date;
}

export function AlumniQuote({ quotes, now = new Date() }: AlumniQuoteProps) {
  const index = pickRotatingIndex(quotes.length, now);
  if (index < 0) return null;

  const quote = quotes[index];

  return (
    <figure className="flex flex-col gap-6 rounded-card bg-ku-blue p-6 sm:p-12">
      <Quote className="h-8 w-8 shrink-0 text-ku-dark" aria-hidden />

      <blockquote className="text-h3 font-medium leading-relaxed text-text-primary">
        {quote.body}
      </blockquote>

      <figcaption className="flex flex-col gap-1">
        <span className="text-body font-semibold text-text-primary">
          {quote.author.firstName} {quote.author.lastName}
        </span>
        <span className="text-small text-text-primary/80">
          {/* ⚠️ «İxtisas / məzuniyyət ili» cohort-un GÖSTƏRİLƏN ADIDIR
              («İnformatika — Class of 2030»): fərdi ixtisas sahəsi sxemdə
              yoxdur (Blok 10A-nın qalan borcu) və uydurulmur. */}
          {quote.cohort.displayName} · {memoryTypeLabel(quote.type)}
        </span>
      </figcaption>
    </figure>
  );
}
