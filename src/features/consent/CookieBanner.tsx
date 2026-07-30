"use client";

// ============================================================================
// src/features/consent/CookieBanner.tsx
// Kuki razılığı banneri — üç düymə (Seçimlər / Rədd et / Qəbul et).
//
// 🔴 TƏLƏ E — RAZILIQ `localStorage`-DA SAXLANMIR, KUKİDƏ SAXLANILIR.
// `localStorage` yalnız brauzerdədir: server komponenti onu oxuya bilmir, yəni
// banner HƏR YÜKLƏMƏDƏ HTML-ə düşər və hidrasiyadan sonra yox olardı — razılıq
// vermiş istifadəçi onu hər dəfə bir anlıq görərdi (görünən "sıçrayış").
// `document.cookie` isə serverdə `cookies()` ilə oxunur: bu komponent
// ÜMUMİYYƏTLƏ render olunmur (`ConsentGate`), yəni DOM-da izi qalmır.
//
// ⚠️ `Secure` bayrağı PROTOKOLDAN törəyir (`lib/consent.ts`): `localhost`-da
// (http) `Secure` kuka brauzer tərəfindən səssizcə atılır və banner heç vaxt
// bağlanmazdı — e2e testi məhz http üzərində işləyir.
//
// ⚠️ «Rədd et» = "yalnız zəruri". Zəruri kukiləri (sessiya) söndürmək mümkün
// deyil — onlarsız giriş işləmir. Düymə YALAN VƏD ETMƏMƏLİDİR, ona görə mətn
// bunu açıq yazır (`lib/consent.ts` → `CONSENT_VALUES` şərhi).
//
// ⚠️ `role="dialog"` DEYİL, `role="region"`: banner MODAL deyil — səhifəni
// bloklamır və fokus tələsi qurmur. Modal etsək məzmuna çatmaq üçün seçim
// etmək məcburi olardı ("cookie wall").
//
// 🔴 SƏHİFƏNİN SONUNDA YER AYRILIR (`spacer`) — və bu, kosmetik deyil.
// `fixed` element axından KƏNARDADIR, yəni səhifənin son ~120 pikseli DAİMİ
// örtülü qalır: orada duran düymə (məsələn profil formasının «Yadda saxla»
// düyməsi) klikə cavab vermir — pointer hadisəsini banner tutur. Bu, e2e
// dəstində DƏRHAL üzə çıxdı (üç fayl qırıldı) və istifadəçi üçün də eyni
// nasazlıqdır. Banner öz hündürlüyünü ölçüb axına eyni ölçüdə boşluq əlavə
// edir, yəni səhifə bir qədər aşağı sürüşə bilir və heç bir element örtülü
// qalmır. `ResizeObserver` LAZIM DEYİL — ölçü yalnız ekran enindən asılıdır və
// `ref` callback-i hər render-də yenidən ölçür.
// ============================================================================

import { useCallback, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  consentCookieString,
  type ConsentValue,
} from "@/lib/consent";
import { legalHref } from "@/lib/content-routes";

export function CookieBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState(0);

  // Banner öz hündürlüyünü ölçür — aşağıdaki `spacer` eyni ölçüdə yer tutur.
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (node) setHeight(node.getBoundingClientRect().height);
  }, []);

  if (dismissed) return null;

  const decide = (value: ConsentValue) => {
    // `Secure` yalnız HTTPS-də (bax fayl başlığı).
    document.cookie = consentCookieString(value, {
      secure: window.location.protocol === "https:",
    });
    setDismissed(true);
  };

  return (
    <>
    {/* Axında yer tutan boşluq — səhifənin son elementi banner altında
        qalmasın (bax fayl başlığındaki qeyd). */}
    <div style={{ height }} aria-hidden />

    <div
      ref={measure}
      role="region"
      aria-label="Kuki razılığı"
      data-testid="cookie-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-md-kuds sm:p-6"
    >
      <div className="mx-auto flex max-w-content flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <Cookie className="mt-0.5 h-6 w-6 shrink-0 text-ku-green" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-text-primary">
              Bu sayt kukilərdən istifadə edir
            </p>
            <p className="text-small text-text-secondary">
              Zəruri kukilər sessiyanı saxlayır — onlarsız giriş işləmir, ona görə
              «Rədd et» seçimi «yalnız zəruri» deməkdir. Seçiminiz bir il müddətinə
              saxlanılır və heç bir identifikator daşımır.{" "}
              <Link
                href={legalHref("privacy")}
                className="text-ku-green underline-offset-4 hover:underline"
              >
                Məxfilik bildirişi
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:shrink-0">
          {/* «Seçimlər» ayrıca ekran DEYİL — hazırda yalnız iki kateqoriya var
              (zəruri / analitika) və onları məxfilik bildirişi izah edir. Saxta
              "parametrlər" modalı açmaqdansa sənədə aparmaq dürüstdür. */}
          <Button variant="ghost" asChild>
            <Link href={legalHref("privacy")}>Seçimlər</Link>
          </Button>

          {/* KUDS §11: ikinci dərəcəli = outline (filled `secondary` DEYİL). */}
          <Button variant="outline" onClick={() => decide("necessary")}>
            Rədd et
          </Button>

          <Button onClick={() => decide("all")}>Qəbul et</Button>
        </div>
      </div>
    </div>
    </>
  );
}
