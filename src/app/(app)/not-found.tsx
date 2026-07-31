// ============================================================================
// src/app/(app)/not-found.tsx
// `(app)` route qrupunun 404 ekranı (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteNotFound` -dədir; qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır (karkas itmir).
// ============================================================================

import { RouteNotFound } from "@/components/shared/RouteNotFound";

export default function GroupNotFound() {
  return (
    <RouteNotFound
      title="Bu bölmə tapılmadı"
      description="Axtardığınız sinif, profil və ya tədbir mövcud deyil, silinib, yaxud ona baxmaq üçün icazəniz yoxdur."
      homeHref="/home"
      homeLabel="Sinif səhifəmə qayıt"
    />
  );
}
