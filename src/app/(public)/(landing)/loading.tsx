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
// ============================================================================

import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function LandingLoading() {
  return <PageSkeleton variant="cards" label="Açılış səhifəsi yüklənir" />;
}
