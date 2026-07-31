// ============================================================================
// src/components/shared/RouteNotFound.tsx
// Route QRUPU səviyyəsindəki 404 ekranının ORTAQ görünüşü (Blok 12C · D bəndi).
//
// 🔴 KÖK `app/not-found.tsx` İLƏ FƏRQ — YERİ, MƏZMUNU DEYİL.
// Kök fayl route qrupu layout-larının ÜSTÜNDƏDİR: `(app)` daxilində
// `notFound()` çağırılanda (məsələn mövcud olmayan sinif slug-ı) AppShell də
// yox olur və istifadəçi naviqasiyasız qalır. Qrup daxilindəki `not-found.tsx`
// karkası saxlayır: «sinif tapılmadı» yazısı sidebar-ın yanında görünür və
// istifadəçi bir kliklə başqa sinfə keçir.
//
// ⚠️ SERVER komponentidir — sessiya OXUNMUR (kök faylla eyni səbəb: 404 həm
// giriş etmiş, həm etməmiş istifadəçiyə göstərilir).
// ⚠️ 403 üçün AYRI ekran var (`src/app/forbidden.tsx`) — qarışdırma.
// ============================================================================

import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface RouteNotFoundProps {
  /** Nə tapılmadı — «Sinif səhifəsi», «Admin bölməsi»… */
  title: string;
  description: string;
  homeHref: string;
  homeLabel: string;
}

export function RouteNotFound({
  title,
  description,
  homeHref,
  homeLabel,
}: RouteNotFoundProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-16 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-avatar bg-ku-soft"
        aria-hidden
      >
        <Compass className="h-8 w-8 text-ku-dark" />
      </span>

      <div className="flex flex-col gap-2">
        <p className="text-h3 font-semibold text-ku-green">404</p>
        <h1 className="text-h2 font-semibold text-text-primary">{title}</h1>
        <p className="text-body text-text-secondary">{description}</p>
      </div>

      <Button asChild>
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </div>
  );
}
