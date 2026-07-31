"use client";

// ============================================================================
// src/components/shared/RouteError.tsx
// Route QRUPU səviyyəsindəki xəta sərhədinin ORTAQ görünüşü (Blok 12C · D bəndi).
//
// 🔴 NİYƏ QRUP SƏVİYYƏSİNDƏ AYRICA SƏRHƏD LAZIMDIR — kök `app/error.tsx` VAR,
// amma o, route qrupu layout-larının ÜSTÜNDƏDİR: `(app)` səhifəsində xəta
// baş verəndə AppShell (sidebar + header + naviqasiya) da yox olur və
// istifadəçi «çılpaq» xəta ekranında qalır — geri qayıtmağın yeganə yolu
// brauzerin geri düyməsidir. Qrup daxilindəki `error.tsx` isə həmin qrupun
// layout-unun İÇİNDƏ render olunur: karkas yerində qalır, istifadəçi
// naviqasiyanı itirmir.
//
// 🔴 BU, HƏM DƏ SİYAHILARIN «XƏTA» AYAĞIDIR. Sinif siyahıları (kataloq,
// xronologiya, xatirələr, tədbirlər, nailiyyətlər) SERVER komponentləridir və
// `Suspense` ilə yüklənir: onların «skeleton» və «boş vəziyyət» ayaqları
// komponentin öz içindədir, «xəta» ayağı isə TƏK YOLLA — sərhəd komponenti ilə
// verilə bilər. 12C-yə qədər həmin ayaq yalnız kök sərhədində vardı.
//
// ⚠️ `"use client"` MƏCBURİDİR (Next.js müqaviləsi: hər `error.tsx` client-dir).
// ⚠️ Mesaj mətni İSTEHSALDA gizlədilir; `digest` server logunda xətanı tapmağın
// yeganə yoludur, ona görə ekranda göstərilir.
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface RouteErrorProps {
  error: Error & { digest?: string };
  /** Seqmenti YENİDƏN render etməyə cəhd edir (tam səhifə yeniləməsi olmadan). */
  reset: () => void;
  /** «Geri qayıt» düyməsinin ünvanı — qrupdan qrupa dəyişir. */
  homeHref: string;
  /** Həmin düymənin etiketi. */
  homeLabel: string;
  /** Xəta hansı səthdə baş verdi — «Sinif səhifəsi», «Admin paneli»… */
  scope: string;
}

export function RouteError({
  error,
  reset,
  homeHref,
  homeLabel,
  scope,
}: RouteErrorProps) {
  useEffect(() => {
    console.error(`[error-boundary:${scope}]`, error.digest ?? error.message);
  }, [error, scope]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-16 text-center"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-avatar bg-warning/20"
        aria-hidden
      >
        <TriangleAlert className="h-8 w-8 text-warning-strong" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-h2 font-semibold text-text-primary">
          {scope} yüklənmədi
        </h1>
        <p className="text-body text-text-secondary">
          Məlumat çəkilərkən gözlənilməz xəta baş verdi. Heç nə itməyib —
          yenidən cəhd edə və ya başqa bölməyə keçə bilərsiniz.
        </p>
      </div>

      {error.digest ? (
        <p className="rounded-input bg-background px-3 py-2 font-mono text-caption text-text-secondary">
          Xəta kodu: {error.digest}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden />
          Yenidən cəhd et
        </Button>
        {/* KUDS §11: Secondary = outline */}
        <Button variant="outline" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
