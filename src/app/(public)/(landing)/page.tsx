// ============================================================================
// src/app/(public)/page.tsx
// / — Public Welcome Page [M1].
//
// Səhifə NAZİKDİR (CLAUDE.md §8): bütün məzmun və sorğular
// `features/welcome/WelcomePage.tsx`-dədir. Karkas (`PublicShell`) isə
// `(public)/layout.tsx`-dən gəlir.
//
// ⚠️ `force-dynamic` — səhifə DB-dən oxuyur (redaksiya səhifələri, kataloq,
// ictimai tədbirlər, FAQ, bələdçi). Statik render seed dəyişəndə köhnə
// məzmunu əbədi göstərərdi.
//
// 🔴 Səhifə ANONİM viewer ilə oxuyur — hətta giriş etmiş istifadəçi üçün də.
// Səbəb `features/welcome/WelcomePage.tsx` başlığındadır (TƏLƏ E).
//
// ⚠️ Bölmə `id`-ləri TƏSADÜFİ DEYİL: naviqasiyadaki hələ mövcud olmayan
// səhifələr (`/about`, `/faculties`, `/events`…) bu bölmələrin anchor-larına
// yönəldilib. Vahid mənbə `layouts/nav.ts` → `LANDING_SECTIONS`.
// Blok 11-də real səhifələr gələndə yalnız `nav.ts`-dəki `href`-lər geri
// qaytarılacaq — bölmələr qalır.
// ============================================================================

import type { Metadata } from "next";

import { WelcomePage } from "@/features/welcome/WelcomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QU CLASS — Qarabağ Universiteti sinif platforması",
  description:
    "Sinfin bir yerdə: tələbəlikdən məzunluğa. Fakültələr, kampus həyatı, " +
    "Xankəndi bələdçisi və açıq tədbirlər.",
};

export default function Page() {
  return <WelcomePage />;
}
