"use client";

// ============================================================================
// src/app/(admin)/error.tsx
// `(admin)` route qrupunun xəta sərhədi (Blok 12C · D bəndi).
//
// Görünüş `components/shared/RouteError` -dədir — üç qrup eyni ekranı paylaşır,
// yalnız mətn və «geri» keçidi fərqlənir. Səbəb və qrup səviyyəsinin niyə
// lazım olduğu həmin faylın başlığındadır.
//
// Admin səthində xəta mesajı DAHA ÇOX detal vermir: `digest` kifayətdir, mətn isə istehsalda onsuz da gizlədilir.
// ============================================================================

import { RouteError, type RouteErrorProps } from "@/components/shared/RouteError";

export default function GroupError(
  props: Pick<RouteErrorProps, "error" | "reset">,
) {
  return (
    <RouteError
      {...props}
      scope="Admin paneli"
      homeHref="/admin"
      homeLabel="Admin panelinə qayıt"
    />
  );
}
