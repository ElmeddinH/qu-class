"use server";

// ============================================================================
// src/features/notifications/actions.ts
// Bildiriş mərkəzinin [M15] Server Action-ları.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — DB girişi
// `services/notification.service.ts`-dədir (CLAUDE.md §4).
//
// 🔴 SAHİBLİK QAPISI SERVİSDƏDİR, BURADA DEYİL. Action yalnız `requireUser()`
// ilə viewer qurur və `id`-ni ötürür; `recipientId = viewer.userId` şərtini
// `updateMany`-nin `where`-i tətbiq edir. Yəni başqasının bildiriş `id`-si
// göndərilsə sətir DƏYİŞMİR və cavab "tapılmadı" olur — action-da əlavə
// yoxlama yazmaq ikinci (və köhnələn) icazə məntiqi yaradardı.
//
// 🔴 SİLMƏ ƏMƏLİYYATI YOXDUR — qəsdən (bildiriş tarixçəsi qalır).
//
// ⚠️ `revalidatePath` HƏM siyahını, HƏM DƏ header rozetini təzələyir: rozet
// server komponentidir (`NotificationBadge`) və `(app)` / `(admin)`
// layout-larında render olunur — `layout` seçimi ilə hər iki qrupda yenilənir.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { NOTIFICATIONS_PATH } from "@/lib/notification-filters";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";

export interface NotificationActionResult {
  ok: boolean;
  message?: string;
  /** Dəyişdirilmiş sətir sayı — "12 bildiriş oxunmuş işarələndi". */
  changed?: number;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const notificationIdSchema = z.string().min(1, "Bildiriş seçilməyib");

/**
 * Rozet `(app)` VƏ `(admin)` karkaslarında görünür, ona görə `layout`
 * səviyyəsində təzələnir — yalnız `/notifications` yolunu təzələsək admin
 * panelindəki rozet köhnə rəqəmdə qalardı.
 */
function revalidateNotificationSurfaces(): void {
  revalidatePath(NOTIFICATIONS_PATH);
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = notificationIdSchema.safeParse(notificationId);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

    const { changed } = await markNotificationRead(viewer, parsed.data);

    // ⚠️ `changed === 0` İKİ mənaya gəlir: sətir yoxdur VƏ YA başqasınındır.
    // Cavab ikisini AYIRD ETMİR — fərq başqasının bildirişinin mövcudluğunu
    // sızdırardı (servisdəki eyni qayda).
    if (changed === 0) {
      return { ok: false, message: "Bildiriş tapılmadı və ya artıq oxunub." };
    }

    revalidateNotificationSurfaces();
    return { ok: true, changed };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[notifications] markAsRead:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  try {
    const viewer = await requireUser();
    const { changed } = await markAllNotificationsRead(viewer);

    revalidateNotificationSurfaces();

    return {
      ok: true,
      changed,
      message:
        changed === 0
          ? "Oxunmamış bildiriş yox idi."
          : `${changed} bildiriş oxunmuş işarələndi.`,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[notifications] markAllAsRead:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
