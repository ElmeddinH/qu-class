"use client";

// ============================================================================
// src/features/accessibility/BarrierReportForm.tsx
// «Əlçatanlıq maneəsi bildir» forması (KUDS §21 / WCAG 2.2).
//
// 🔴 FORMA GİRİŞ TƏLƏB EDİR — `Report.reporterId` sxemdə məcburidir. Anonim
// ziyarətçi bu komponenti GÖRMÜR: səhifə onun yerinə giriş çağırışını və
// e-poçt kanalını göstərir (`AccessibilityScreen`). Səbəb və alternativ
// `features/accessibility/actions.ts` başlığındadır.
//
// ⚠️ Səhifə yolu ÖZÜ DOLDURULUR (`usePathname` → istifadəçi haradan gəlib) və
// dəyişdirilə bilir: maneə başqa səhifədə görülmüş ola bilər. Sahə `readOnly`
// deyil, çünki ziyarətçi ünvanı yadında saxlaya bilməz — seçim siyahısı isə
// bütün ictimai səthi sadalamağı tələb edərdi.
//
// ⚠️ Doğrulama İKİ YERDƏ: burada (dərhal geribildirim) və server action-da
// (əsl qapı). UI qoruma sayılmır — action `barrierReportSchema`-nı yenidən
// işlədir.
// ============================================================================

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitBarrierReportAction } from "./actions";
import { BARRIER_DETAILS_MAX, BARRIER_DETAILS_MIN } from "./schemas";

export function BarrierReportForm() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pagePath, setPagePath] = useState(pathname);
  const [details, setDetails] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const result = await submitBarrierReportAction({ pagePath, details });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        if (result.message) toast.error(result.message);
        return;
      }

      setSent(true);
      setDetails("");
      if (result.message) toast.success(result.message);
    });
  }

  if (sent) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-card border border-success-strong bg-surface p-6"
      >
        <p className="text-h4 font-medium text-text-primary">Bildiriş qeydə alındı</p>
        <p className="text-small text-text-secondary">
          Əlçatanlıq maneələri 10 iş günü ərzində baxılır. Başqa maneə görsəniz
          formanı yenidən aça bilərsiniz.
        </p>
        <Button variant="outline" className="w-fit" onClick={() => setSent(false)}>
          Yeni bildiriş
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="barrier-page">Maneənin görüldüyü səhifə</Label>
        <Input
          id="barrier-page"
          name="pagePath"
          value={pagePath}
          onChange={(event) => setPagePath(event.target.value)}
          aria-invalid={fieldErrors.pagePath ? "true" : undefined}
          aria-describedby={fieldErrors.pagePath ? "barrier-page-error" : "barrier-page-hint"}
          required
        />
        {fieldErrors.pagePath ? (
          <p id="barrier-page-error" className="text-small text-danger-strong">
            {fieldErrors.pagePath}
          </p>
        ) : (
          <p id="barrier-page-hint" className="text-caption text-text-secondary">
            Sayt daxilindəki ünvan — məsələn <code>/khankendi</code>.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="barrier-details">Maneəni təsvir edin</Label>
        <Textarea
          id="barrier-details"
          name="details"
          rows={5}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={BARRIER_DETAILS_MAX}
          placeholder="Nə etməyə çalışdınız, nə baş verdi və hansı köməkçi texnologiyadan istifadə edirsiniz?"
          aria-invalid={fieldErrors.details ? "true" : undefined}
          aria-describedby={
            fieldErrors.details ? "barrier-details-error" : "barrier-details-hint"
          }
          required
        />
        {fieldErrors.details ? (
          <p id="barrier-details-error" className="text-small text-danger-strong">
            {fieldErrors.details}
          </p>
        ) : (
          <p id="barrier-details-hint" className="text-caption text-text-secondary">
            Ən azı {BARRIER_DETAILS_MIN} simvol. {details.length}/{BARRIER_DETAILS_MAX}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Send className="h-4 w-4" aria-hidden />
        )}
        Bildirişi göndər
      </Button>
    </form>
  );
}
