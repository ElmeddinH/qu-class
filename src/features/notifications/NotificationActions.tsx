"use client";

// ============================================================================
// src/features/notifications/NotificationActions.tsx
// «Oxunmuş işarələ» və «Hamısını oxunmuş et» düymələri.
//
// ⚠️ `"use client"` MƏCBURİDİR: `useTransition` ilə gözləmə vəziyyəti və
// `toast` nəticəsi lazımdır. Server action-ın ÖZÜ serverdə qalır — bu fayl
// yalnız onu çağırır.
//
// 🔴 TANSTACK QUERY İŞLƏDİLMİR (TƏLƏ C). Bildiriş səthi `(app)` qrupundadır və
// orada `QueryClientProvider` var, amma header rozeti `(admin)`-də DƏ render
// olunur — provider isə yalnız `(app)`-dədir (Blok 6, T18). Vahid yanaşma
// üçün bütün bildiriş axını server action + `revalidatePath` üzərində qurulub:
// rozet server komponentidir və heç bir client sorğusu YOXDUR.
//
// ⚠️ Düymə `disabled` olanda `aria-busy` verilir — ekran oxuyucusu "gözləyir"
// vəziyyətini bilir.
// ============================================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "./actions";

/**
 * ⚠️ `revalidatePath` TƏK BAŞINA KİFAYƏT ETMİR — `router.refresh()` DƏ lazımdır.
 * Server action keşi etibarsız edir, amma AÇIQ olan səhifə özü yenidən
 * çəkilmir: header rozeti köhnə rəqəmdə qalır. Blok 9-un eyni dərsi
 * (`EventComposer`, `AttendeeTable`) — orada da hər ikisi yanaşı işlədilir.
 */
export function MarkOneReadButton({
  notificationId,
  title,
}: {
  notificationId: string;
  /** Bildirişin başlığı — düymənin `aria-label`-ı üçün (siyahıda 20 eyni düymə). */
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      aria-label={`«${title}» bildirişini oxunmuş işarələ`}
      onClick={() =>
        startTransition(async () => {
          const result = await markNotificationReadAction(notificationId);
          if (!result.ok && result.message) toast.error(result.message);
          router.refresh();
        })
      }
    >
      <Check className="h-4 w-4" aria-hidden />
      Oxunmuş
    </Button>
  );
}

export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending || unreadCount === 0}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsReadAction();
          if (result.message) {
            if (result.ok) toast.success(result.message);
            else toast.error(result.message);
          }
          router.refresh();
        })
      }
    >
      <CheckCheck className="h-4 w-4" aria-hidden />
      Hamısını oxunmuş et
    </Button>
  );
}
