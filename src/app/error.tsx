"use client";

// ============================================================================
// src/app/error.tsx
// Route seqmenti xəta sərhədi — BÜTÜN səhifələr üçün.
//
// 🔴 NİYƏ LAZIMDIR: bu fayl olmayanda server komponentində atılan istənilən
// xəta AĞ EKRAN verir. İstifadəçi nə baş verdiyini bilmir, "səhifə açılmır"
// deyir, geri qayıtmaqdan başqa çarəsi qalmır. Next-in öz defolt ekranı isə
// ingiliscədir və KUDS-dan kənardadır.
//
// ⚠️ `"use client"` MƏCBURİDİR — `reset()` funksiyası və `useEffect` client
// tələb edir (Next.js müqaviləsi: error boundary həmişə client komponentidir).
//
// ⚠️ Bu sərhəd ROOT LAYOUT-un xətasını TUTMUR — layout onun ÜSTÜNDƏDİR.
// Ona görə ayrıca `global-error.tsx` da var.
//
// ⚠️ `notFound()` və `forbidden()` bura DÜŞMÜR: onlar xüsusi naviqasiya
// siqnallarıdır və `not-found.tsx` / `forbidden.tsx` ilə işlənir.
// ============================================================================

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  /** Seqmenti YENİDƏN render etməyə cəhd edir (səhifəni yeniləmədən). */
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // İstehsalda mesaj gizlədilir, `digest` isə server loglarında həmin xətanı
    // tapmağa imkan verir — konsola məhz onu yazırıq.
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-16 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-avatar bg-warning/20"
        aria-hidden
      >
        <TriangleAlert className="h-8 w-8 text-warning-strong" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Bir şey səhv getdi</h1>
        <p className="text-body text-text-secondary">
          Səhifə yüklənərkən gözlənilməz xəta baş verdi. Məlumatlarınız
          itməyib — yenidən cəhd edə bilərsiniz.
        </p>
      </div>

      {/* `digest` istehsalda xətanı server logunda tapmağın YEGANƏ yoludur —
          istifadəçidən dəstək sorğusunda məhz bunu soruşuruq. */}
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
          <Link href="/home">Ana səhifəyə qayıt</Link>
        </Button>
      </div>
    </div>
  );
}
