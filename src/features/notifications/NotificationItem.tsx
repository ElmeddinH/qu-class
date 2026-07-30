// ============================================================================
// src/features/notifications/NotificationItem.tsx
// Bir bildiriş sətri.
//
// 🔴 LİNK YOXLANIR — 404 VERƏN KEÇİD GÖSTƏRİLMİR.
// `Notification.url` bildiriş YARADILARKƏN yazılıb, yəni ölü sətirdir: route
// xəritəsi sonra dəyişsə ünvan mövcud olmaya bilər. `safeNotificationUrl`
// (SAF modul, ağ siyahı) tanınmayan formanı `null`-a çevirir və başlıq link
// deyil, MƏTN kimi render olunur. Bu, həm 404-ün, həm də açıq yönləndirmənin
// (`//evil.example.com`) qarşısını alır.
//
// ⚠️ İKON REYESTRİ BURADADIR (CLAUDE.md §12): `catalog.ts` ikonu AD kimi
// saxlayır ki, cədvəl server komponentindən oxunsun və React funksiyası
// server → client sərhədindən keçməsin.
//
// ⚠️ Oxunmamış sətir SOL ZOLAQLA və fonla fərqlənir — RƏNG TƏK KANAL DEYİL:
// «Yeni» rozeti mətn olaraq da var (KUDS §21 / WCAG 1.4.1).
// ============================================================================

import Link from "next/link";
import {
  AtSign,
  Bell,
  CalendarDays,
  Heart,
  Info,
  MessageSquare,
  Shield,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { notificationTypeLabel } from "@/lib/labels";
import { safeNotificationUrl } from "@/lib/notification-links";
import { cn } from "@/lib/utils";
import type { NotificationItem as NotificationRow } from "@/services/notification.service";
import { exactDateTime, relativeTime } from "@/utils/date";

import { MarkOneReadButton } from "./NotificationActions";
import { TONE_CLASS, notificationMetaOf, type NotificationIconName } from "./catalog";

/** Ad → komponent. Server sərhədindən yalnız AD keçir (CLAUDE.md §12). */
const ICONS: Record<NotificationIconName, LucideIcon> = {
  heart: Heart,
  message: MessageSquare,
  userPlus: UserPlus,
  calendar: CalendarDays,
  bell: Bell,
  trophy: Trophy,
  shield: Shield,
  at: AtSign,
  info: Info,
};

export function NotificationItem({ item }: { item: NotificationRow }) {
  const meta = notificationMetaOf(item.type);
  const Icon = ICONS[meta.icon];
  const href = safeNotificationUrl(item.url);
  const unread = item.readAt === null;

  return (
    <article
      className={cn(
        "flex gap-4 rounded-card border p-4 shadow-xs-kuds sm:p-6",
        unread ? "border-l-4 border-l-ku-green border-border bg-surface" : "border-border bg-surface/60",
      )}
      data-unread={unread ? "true" : "false"}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-avatar",
          TONE_CLASS[meta.tone],
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5 text-ku-dark" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-badge bg-muted px-3 py-1 text-caption text-text-secondary">
            {notificationTypeLabel(item.type)}
          </span>

          {unread ? (
            // Rəngdən BAŞQA kanal — mətn rozeti (WCAG 1.4.1).
            <span className="rounded-badge bg-ku-green px-3 py-1 text-caption font-medium text-white">
              Yeni
            </span>
          ) : null}

          <time
            dateTime={item.createdAt.toISOString()}
            title={exactDateTime(item.createdAt)}
            className="text-caption text-text-secondary"
          >
            {relativeTime(item.createdAt)}
          </time>
        </div>

        <h2 className="text-body font-medium text-text-primary">
          {href ? (
            <Link href={href} className="transition-colors hover:text-ku-green">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h2>

        {item.body ? (
          <p className="line-clamp-2 text-small text-text-secondary">{item.body}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {item.actor ? (
            <span className="flex items-center gap-2 text-caption text-text-secondary">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={item.actor.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-muted text-caption text-text-primary">
                  {item.actor.firstName.charAt(0)}
                  {item.actor.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {item.actor.firstName} {item.actor.lastName}
            </span>
          ) : (
            <span />
          )}

          {unread ? (
            <MarkOneReadButton notificationId={item.id} title={item.title} />
          ) : (
            <span className="text-caption text-text-secondary">
              Oxunub · {relativeTime(item.readAt!)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
