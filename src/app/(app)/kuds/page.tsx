import type { Metadata } from "next";

import { StyleGuide } from "@/features/kuds/StyleGuide";

export const metadata: Metadata = {
  title: "KUDS stil bələdçisi",
  description: "QU CLASS-ın dizayn tokenləri və komponent nümunələri (daxili sənəd).",
  robots: { index: false, follow: false },
};

/**
 * ⚠️ Daxili sənəddir → `(app)` qrupundadır, yəni auth arxasındadır.
 * Route qrupu URL-i DƏYİŞMİR: ünvan yenə də `/kuds`-dur.
 * Karkas (AppShell) `(app)/layout.tsx`-dən gəlir.
 */
export default function KudsPage() {
  return <StyleGuide />;
}
