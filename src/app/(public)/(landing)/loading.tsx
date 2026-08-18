// ============================================================================
// A SİYAHISI — açılış səhifəsi (`/`).
//
// 🔴 NİYƏ ROUTE QRUPU (`(landing)`) VAR. `loading.tsx` BÜTÜN ALT AĞACA şamil
// olunur (TƏLƏ B). Fayl `(public)/loading.tsx` kimi qoyulsaydı `/about`,
// `/legal/[slug]`, `/faculties/[slug]` — yəni `notFound()` çağıran ON səhifə —
// axınla render olunar və 404-ləri 200-ə çevrilərdi. Route qrupu URL-i
// DƏYİŞMİR (`/` yenə `/`-dır), amma seqment ağacında ayrıca səviyyə yaradır,
// yəni bu skeleton YALNIZ açılış səhifəsinə düşür.
//
// Səhifənin özündə `notFound()` yoxdur: `WelcomePage` yeddi paralel sorğu edir
// və boş nəticədə də ekran göstərir.
//
// 🔴 NİYƏ ÜMUMİ `PageSkeleton` DEYİL. Blok 12D burada
// `PageSkeleton variant="cards"` işlədirdi — ~730px yer tutan kart şəbəkəsi.
// Real açılış səhifəsi ~6400px-dir və `PublicShell`-in `<footer>`-i Suspense
// sərhədindən KƏNARDADIR: skeleton anında footer ekranın İÇİNDƏ dayanır,
// məzmun gələndə isə aşağı tullanırdı. Lighthouse bunu `/` üçün
// **CLS 0.223** (performance 88) kimi ölçdü — açılış səhifəsi layihənin ilk
// göründüyü yerdir. `WelcomeSkeleton` real səhifənin formasını (hero +
// bölmələr) verir və footer-i ekrandan kənarda saxlayır; qapı
// `tests/e2e/landing-cls.spec.ts`-dədir.
// ============================================================================

import { WelcomeSkeleton } from "@/features/welcome/WelcomeSkeleton";

export default function LandingLoading() {
  return <WelcomeSkeleton />;
}
