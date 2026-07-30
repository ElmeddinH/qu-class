// ============================================================================
// src/app/(public)/accessibility/page.tsx
// /accessibility — əlçatanlıq bəyanatı + maneə bildirmə forması (GW #14).
//
// 🔴 SƏHİFƏ İCTİMAİDİR, FORMA İSƏ GİRİŞ TƏLƏB EDİR.
// `getViewer()` burada yalnız "forma göstərilsinmi?" sualına cavab verir —
// heç bir məzmun viewer-ə görə SÜZÜLMÜR (bəyanat hamı üçün eynidir). Səbəb və
// alternativlərin müqayisəsi `features/accessibility/actions.ts` başlığındadır,
// qərar isə STATE.md-dədir.
//
// ⚠️ `force-dynamic` — `getViewer()` sessiya kukisini oxuyur.
// ============================================================================

import type { Metadata } from "next";

import { AccessibilityScreen } from "@/features/accessibility/AccessibilityScreen";
import { getViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Əlçatanlıq bəyanatı — QU CLASS",
  description:
    "KUDS §21 / WCAG 2.2 uyğunluq bəyanatı, bilinən məhdudiyyətlər və maneə bildirmə forması.",
};

export default async function AccessibilityPage() {
  const viewer = await getViewer();

  return <AccessibilityScreen isAuthenticated={viewer.kind === "USER"} />;
}
