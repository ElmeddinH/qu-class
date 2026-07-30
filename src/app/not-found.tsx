// ============================================================================
// src/app/not-found.tsx
// 404 — `notFound()` çağırışlarının və mövcud olmayan ünvanların ekranı.
//
// 🔴 NİYƏ LAZIMDIR: Blok 9-da `notFound()` GENİŞ işlədilir — tədbir detalı,
// koordinator paneli və hesabat "yoxdur" ilə "icazə yoxdur"-u QƏSDƏN ayırd
// etmir (mövcudluğun özü də məlumatdır). Bu fayl olmayanda həmin hallar
// Next-in ingiliscə defolt ekranını göstərirdi.
//
// ⚠️ SERVER komponentidir — sessiya OXUNMUR. Səbəb: 404 həm giriş etmiş, həm
// etməmiş istifadəçiyə göstərilir və `requireUser()` burada yönləndirmə
// döngəsi yarada bilər (`/login` özü də mövcud olmayan alt yola düşsə).
// Ona görə keçidlər neytral saxlanılır.
//
// ⚠️ `403` üçün AYRI ekran var (`src/app/forbidden.tsx`) — ikisi
// qarışdırılmamalıdır.
// ============================================================================

import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
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
        <h1 className="text-h1 font-bold text-text-primary">Səhifə tapılmadı</h1>
        <p className="text-body text-text-secondary">
          Axtardığınız səhifə silinib, ünvanı dəyişib və ya ona baxmaq üçün
          icazəniz yoxdur.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/home">Ana səhifə</Link>
        </Button>
        {/* KUDS §11: Secondary = outline */}
        <Button variant="outline" asChild>
          <Link href="/">Açılış səhifəsi</Link>
        </Button>
      </div>
    </div>
  );
}
