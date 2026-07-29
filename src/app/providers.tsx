"use client";

// ============================================================================
// src/app/providers.tsx
// Müştəri tərəfli provider-lər — TanStack Query + nuqs adapteri.
//
// ⚠️ `QueryClient` MODUL SƏVİYYƏSİNDƏ yaradılmır. Server tərəfdə modul qrafı
// bütün sorğular arasında paylaşılır, yəni tək instans bütün istifadəçilərin
// keşini birləşdirər və bir tələbənin `CLASS` lenti başqasına sızardı.
// `useState(() => new QueryClient())` hər brauzer sessiyasına (və hər SSR
// keçidinə) AYRI instans verir.
//
// nuqs (URL-də saxlanılan filtrlər) App Router-də adapter tələb edir —
// `useQueryState` adapter olmadan işləməz.
// ============================================================================

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Lent tez-tez dəyişmir; 30 saniyə ərzində təkrar sorğu getmir.
            staleTime: 30_000,
            // Pəncərəyə qayıdanda bütün səhifələri yenidən çəkmək infinite
            // scroll-da sıçrayış yaradır.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </QueryClientProvider>
  );
}
