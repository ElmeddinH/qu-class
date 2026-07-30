// ============================================================================
// src/features/notifications/NotificationBadge.tsx
// Header-dəki oxunmamış bildiriş rozeti.
//
// 🔴 TƏLƏ C — TANSTACK QUERY BURADA İŞLƏDİLƏ BİLMƏZ.
// `DashboardShell` HƏM `(app)`, HƏM DƏ `(admin)` qrupunda işlədilir, amma
// `QueryClientProvider` YALNIZ `(app)`-dədir (`app/providers.tsx` →
// `(app)/layout.tsx`). `useQuery` işlətsəydik admin paneli «No QueryClient
// set» ilə 500 verərdi — Blok 6-nın T18 dərsi eynilə budur.
//
// HƏLL: rozet SERVER komponentidir. Sayı `countUnreadNotifications` verir,
// təzələnmə isə server action-larındakı `revalidatePath("/", "layout")` ilə
// baş verir (`features/notifications/actions.ts`). Nə client sorğusu, nə
// interval, nə də `AbortController` lazımdır.
//
// ⚠️ Viewer YOXDURSA (anonim) rozet render OLUNMUR — `DashboardShell` onsuz da
// yalnız giriş etmiş istifadəçi üçün qurulur, amma qapı burada da var: rozet
// gələcəkdə başqa karkasda işlədilsə "0 bildiriş" göstərmək səhv olardı.
//
// ⚠️ 99-dan böyük say «99+» kimi qısaldılır — rozet 72px header-də ikonun
// üstündədir və üç rəqəm onu deformasiya edir.
// ============================================================================

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { NOTIFICATIONS_PATH } from "@/lib/notification-filters";
import { countUnreadNotifications } from "@/services/notification.service";

const MAX_DISPLAY = 99;

export async function NotificationBadge() {
  const viewer = await getViewer();

  // Anonim halda ikon linkdir, rəqəm yoxdur (bax fayl başlığı).
  const unread = viewer.kind === "USER" ? await countUnreadNotifications(viewer) : 0;

  const label =
    unread === 0
      ? "Bildirişlər"
      : `Bildirişlər — ${unread} oxunmamış`;

  return (
    <Button variant="ghost" size="icon" aria-label={label} asChild className="relative">
      <Link href={NOTIFICATIONS_PATH}>
        <Bell className="h-6 w-6" aria-hidden />

        {unread > 0 ? (
          <span
            // ⚠️ `aria-hidden`: say onsuz da düymənin `aria-label`-ındadır,
            // yoxsa ekran oxuyucusu rəqəmi iki dəfə oxuyar.
            aria-hidden
            data-testid="notification-badge"
            className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-badge bg-danger-strong px-1 text-caption font-medium leading-5 text-white"
          >
            {unread > MAX_DISPLAY ? `${MAX_DISPLAY}+` : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
