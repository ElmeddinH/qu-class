"use client";

// ============================================================================
// src/app/(app)/error.tsx
// `(app)` route qrupunun xəta sərhədi (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteError` -dədir — üç qrup eyni ekranı paylaşır,
// yalnız mətn və «geri» keçidi fərqlənir. Səbəb və qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır.
//
// ⚠️ «Yoxdur» ilə «icazə yoxdur» QƏSDƏN ayırd edilmir — mövcudluğun özü də məlumatdır (PLAN.md §4.3, məxfilik modeli).
// ============================================================================

import { RouteError, type RouteErrorProps } from "@/components/shared/RouteError";

export default function GroupError(
  props: Pick<RouteErrorProps, "error" | "reset">,
) {
  return (
    <RouteError
      {...props}
      scope="Sinif səhifəsi"
      homeHref="/home"
      homeLabel="Sinif səhifəmə qayıt"
    />
  );
}
