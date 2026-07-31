// ============================================================================
// src/app/(public)/not-found.tsx
// `(public)` route qrupunun 404 ekranı (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteNotFound` -dədir; qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır (karkas itmir).
// ============================================================================

import { RouteNotFound } from "@/components/shared/RouteNotFound";

export default function GroupNotFound() {
  return (
    <RouteNotFound
      title="Bu səhifə tapılmadı"
      description="Axtardığınız ictimai səhifə silinib və ya ünvanı dəyişib. Aşağıdakı keçidlə açılış səhifəsinə qayıda bilərsiniz."
      homeHref="/"
      homeLabel="Açılış səhifəsinə qayıt"
    />
  );
}
