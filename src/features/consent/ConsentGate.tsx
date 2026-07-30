// ============================================================================
// src/features/consent/ConsentGate.tsx
// Banneri göstərmək qərarı — SERVER komponenti.
//
// 🔴 QƏRAR SERVERDƏ VERİLİR (TƏLƏ E-nin əsl həlli). Kuki `cookies()` ilə
// oxunur: razılıq varsa `CookieBanner` ÜMUMİYYƏTLƏ render olunmur, yəni HTML-ə
// düşmür və "bir anlıq göründü, sonra yox oldu" sıçraması baş vermir.
// `localStorage` ilə bu mümkün deyil — server onu oxuya bilmir.
//
// ⚠️ `cookies()` çağırışı səhifəni DİNAMİK edir. Bütün ictimai səhifələr onsuz
// da `force-dynamic`-dir (DB-dən oxuyurlar), yəni əlavə xərc yoxdur.
//
// ⚠️ Banner `PublicShell`-dədir, `RootLayout`-da DEYİL: giriş etmiş istifadəçi
// üçün karkas `DashboardShell`-dir və orada da göstərilməlidir — o, ayrıca
// qoşulub. İki yerdə çağırmaq təkrar deyil: qərar bu komponentdədir, çağıran
// yalnız YERİ seçir.
// ============================================================================

import { cookies } from "next/headers";

import { CONSENT_COOKIE_NAME, hasConsentDecision } from "@/lib/consent";

import { CookieBanner } from "./CookieBanner";

export async function ConsentGate() {
  const store = await cookies();
  const decided = hasConsentDecision(store.get(CONSENT_COOKIE_NAME)?.value);

  return decided ? null : <CookieBanner />;
}
