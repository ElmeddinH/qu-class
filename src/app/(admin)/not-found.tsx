// ============================================================================
// src/app/(admin)/not-found.tsx
// `(admin)` route qrupunun 404 ekranı (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteNotFound` -dədir; qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır (karkas itmir).
// ============================================================================

import { RouteNotFound } from "@/components/shared/RouteNotFound";

export default function GroupNotFound() {
  return (
    <RouteNotFound
      title="Bu admin bölməsi tapılmadı"
      description="Axtardığınız idarəetmə ekranı mövcud deyil və ya ünvanı dəyişib."
      homeHref="/admin"
      homeLabel="Admin panelinə qayıt"
    />
  );
}
