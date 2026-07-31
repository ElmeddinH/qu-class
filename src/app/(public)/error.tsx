"use client";

// ============================================================================
// src/app/(public)/error.tsx
// `(public)` route qrupunun xəta sərhədi (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteError` -dədir — üç qrup eyni ekranı paylaşır,
// yalnız mətn və «geri» keçidi fərqlənir. Səbəb və qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır.
//
// İCTİMAİ qrup — ziyarətçi hələ giriş etməyib, ona görə bütün keçidlər açılış səhifəsinə baxır (`/home` giriş tələb edərdi və yönləndirmə döngəsi yaradardı).
// ============================================================================

import { RouteError, type RouteErrorProps } from "@/components/shared/RouteError";

export default function GroupError(
  props: Pick<RouteErrorProps, "error" | "reset">,
) {
  return (
    <RouteError
      {...props}
      scope="Səhifə"
      homeHref="/"
      homeLabel="Açılış səhifəsinə qayıt"
    />
  );
}
