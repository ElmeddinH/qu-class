"use client";

// ============================================================================
// src/features/consent/CookieBanner.tsx
// Kuki razılığı banneri — üç düymə: «Seçimlər» · «Rədd et» · «Hamısını qəbul et».
//
// 🔴 TƏLƏ E — RAZILIQ `localStorage`-DA SAXLANMIR, KUKİDƏ SAXLANILIR.
// `localStorage` yalnız brauzerdədir: server komponenti onu oxuya bilmir, yəni
// banner HƏR YÜKLƏMƏDƏ HTML-ə düşər və hidrasiyadan sonra yox olardı — razılıq
// vermiş istifadəçi onu hər dəfə bir anlıq görərdi (görünən "sıçrayış").
// `document.cookie` isə serverdə `cookies()` ilə oxunur: bu komponent
// ÜMUMİYYƏTLƏ render olunmur (`ConsentGate`), yəni DOM-da izi qalmır.
// Bu qayda «Seçimlər» ekranına da AİDDİR — orada da yazı kukiyə gedir.
//
// ⚠️ `Secure` bayrağı PROTOKOLDAN törəyir (`lib/consent.ts`): `localhost`-da
// (http) `Secure` kuka brauzer tərəfindən səssizcə atılır və banner heç vaxt
// bağlanmazdı — e2e testi məhz http üzərində işləyir.
//
// ⚠️ «Rədd et» = "yalnız zəruri". Zəruri kukiləri (sessiya) söndürmək mümkün
// deyil — onlarsız giriş işləmir. Düymə YALAN VƏD ETMƏMƏLİDİR, ona görə mətn
// bunu açıq yazır (`lib/consent.ts` → `CONSENT_VALUES` şərhi).
//
// 🔴 «SEÇİMLƏR» EKRANI DÜRÜSTDÜR (Blok 12B). Kateqoriyalar
// `lib/consent.ts` → `CONSENT_CATEGORIES`-dən gəlir və orada UYDURMA
// «Analitika» sətri YOXDUR: layihədə analitika qurulmayıb. Ekran bunu açıq
// yazır — mövcud olmayan emal üzərində nəzarət illüziyası satmaqdansa
// «başqa kateqoriya yoxdur» demək düzgündür. Struktur isə hazırdır: real
// kateqoriya əlavə olunanda açar avtomatik burada görünür.
//
// ⚠️ Banner `role="region"`-dur, MODAL DEYİL — səhifəni bloklamır (cookie wall
// yaratmır). «Seçimlər» isə istifadəçinin ÖZ təşəbbüsü ilə açılan ekrandır və
// `Dialog` (modal) burada doğrudur: fokus tələsi qərar verənə qədər saxlanır.
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_CATEGORIES,
  OPTIONAL_CONSENT_CATEGORIES,
  consentCookieString,
  consentValueFor,
  type ConsentValue,
} from "@/lib/consent";
import { legalHref } from "@/lib/content-routes";
import { useDialogFocusRestore } from "@/components/kuds/use-dialog-focus-restore";

export function CookieBanner() {
  // TƏLƏ T44 — modal bağlananda fokus tetikləyiciyə qayıtsın.
  const restoreFocus = useDialogFocusRestore();

  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState(0);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  /**
   * «Seçimlər» ekranında işarələnmiş İXTİYARİ kateqoriyalar.
   * ⚠️ Zəruri kateqoriya buraya DÜŞMÜR — o, seçim deyil.
   */
  const [acceptedOptional, setAcceptedOptional] = useState<string[]>([]);

  // Banner öz hündürlüyünü ölçür — aşağıdaki `spacer` eyni ölçüdə yer tutur.
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (node) setHeight(node.getBoundingClientRect().height);
  }, []);

  const decide = useCallback((value: ConsentValue) => {
    // `Secure` yalnız HTTPS-də (bax fayl başlığı).
    document.cookie = consentCookieString(value, {
      secure: window.location.protocol === "https:",
    });
    setPreferencesOpen(false);
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  function toggleOptional(id: string, enabled: boolean) {
    setAcceptedOptional((current) =>
      enabled ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );
  }

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
                  className="kuds-prose-link"
                >
                  Məxfilik bildirişi
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Button variant="ghost" onClick={() => setPreferencesOpen(true)}>
              Seçimlər
            </Button>

            {/* KUDS §11: ikinci dərəcəli = outline (filled `secondary` DEYİL). */}
            <Button variant="outline" onClick={() => decide("necessary")}>
              Rədd et
            </Button>

            <Button onClick={() => decide("all")}>Hamısını qəbul et</Button>
          </div>
        </div>
      </div>

      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent data-testid="cookie-preferences" className="max-w-lg" onCloseAutoFocus={restoreFocus}>
          <DialogHeader>
            <DialogTitle>Kuki seçimləri</DialogTitle>
            <DialogDescription>
              Hansı kuki kateqoriyalarına icazə verdiyinizi burada seçirsiniz. Seçim
              brauzerinizdə bir il saxlanılır və heç bir identifikator daşımır.
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-4">
            {CONSENT_CATEGORIES.map((category) => {
              const checked = category.required || acceptedOptional.includes(category.id);

              return (
                <li
                  key={category.id}
                  className="flex items-start justify-between gap-4 rounded-card border border-border p-4"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <label
                      htmlFor={`consent-${category.id}`}
                      className="text-body font-medium text-text-primary"
                    >
                      {category.title}
                      {category.required ? (
                        <span className="ml-2 rounded-badge bg-ku-soft px-2 py-1 text-caption font-normal text-ku-dark">
                          söndürülə bilməz
                        </span>
                      ) : null}
                    </label>
                    <p className="text-small text-text-secondary">{category.description}</p>
                  </div>

                  <Switch
                    id={`consent-${category.id}`}
                    checked={checked}
                    // ⚠️ Zəruri kateqoriya AÇIQ və PASSİVDİR — söndürmək
                    // mümkün olmayan şeyi söndürülən kimi göstərmək yalandır.
                    disabled={category.required}
                    onCheckedChange={(next) => toggleOptional(category.id, next)}
                  />
                </li>
              );
            })}
          </ul>

          {/* 🔴 DÜRÜSTLÜK QEYDİ — uydurma kateqoriya yazmaq əvəzinə vəziyyəti
              olduğu kimi demək. Bax fayl başlığı. */}
          {OPTIONAL_CONSENT_CATEGORIES.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-4 text-small text-text-secondary">
              Başqa kateqoriya yoxdur: QU CLASS analitika, reklam və ya üçüncü tərəf
              izləyici kukisi işlətmir. Belə bir kuki əlavə olunarsa burada ayrıca
              açar kimi görünəcək və standart olaraq SÖNÜLÜ olacaq.
            </p>
          ) : null}

          <p className="text-caption text-text-secondary">
            Ətraflı:{" "}
            <Link
              href={legalHref("privacy")}
              className="kuds-prose-link"
            >
              Məxfilik bildirişi
            </Link>
            .
          </p>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => decide("necessary")}>
              Yalnız zəruri
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => decide(consentValueFor(acceptedOptional))}
              >
                Seçimimi saxla
              </Button>
              <Button onClick={() => decide("all")}>Hamısını qəbul et</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
