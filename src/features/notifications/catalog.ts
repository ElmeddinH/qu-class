// ============================================================================
// src/features/notifications/catalog.ts
// Bildiriş növünün vizual metadatası — 9 tip.
//
// ⚠️ İKON KOMPONENT DEYİL, AD (sətir) kimi saxlanılır (CLAUDE.md §12): bu
// cədvəl SERVER komponentindən oxunur və ikon client komponentinə prop kimi
// ötürülsəydi "Functions cannot be passed directly to Client Components"
// xətası ilə build sınardı. Reyestr `NotificationItem`-dədir.
//
// ⚠️ ETİKET BURADA DEYİL — `lib/labels.ts` → `NOTIFICATION_TYPE_LABELS`
// (TƏLƏ T13: etiket iki yerdə saxlanılsa ayrılır).
//
// ⚠️ `Record<NotificationType, …>` tipindədir: enum-a yeni növ əlavə olunsa
// `tsc` MƏHZ burada dayanır.
// ============================================================================

import type { NotificationType } from "@/lib/enums";

export const NOTIFICATION_ICONS = [
  "heart",
  "message",
  "userPlus",
  "calendar",
  "bell",
  "trophy",
  "shield",
  "at",
  "info",
] as const;

export type NotificationIconName = (typeof NOTIFICATION_ICONS)[number];

export interface NotificationMeta {
  icon: NotificationIconName;
  /** İkonun fon tonu — KUDS yalnız fon kimi işlədilən üç açıq rəng. */
  tone: "soft" | "blue" | "cream";
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  POST_LIKE: { icon: "heart", tone: "cream" },
  POST_COMMENT: { icon: "message", tone: "blue" },
  NEW_MEMBER: { icon: "userPlus", tone: "soft" },
  EVENT_INVITE: { icon: "calendar", tone: "blue" },
  EVENT_REMINDER: { icon: "bell", tone: "cream" },
  ACHIEVEMENT_VERIFIED: { icon: "trophy", tone: "soft" },
  MODERATION_RESULT: { icon: "shield", tone: "cream" },
  MENTION: { icon: "at", tone: "blue" },
  SYSTEM: { icon: "info", tone: "soft" },
};

/** DB sütunu `String`-dir → naməlum dəyər UI-nı sındırmamalıdır. */
export function notificationMetaOf(type: string): NotificationMeta {
  return NOTIFICATION_META[type as NotificationType] ?? NOTIFICATION_META.SYSTEM;
}

/** İkon fonunun Tailwind sinfi — hardcode rəng yoxdur (CLAUDE.md §2). */
export const TONE_CLASS: Record<NotificationMeta["tone"], string> = {
  soft: "bg-ku-soft",
  blue: "bg-ku-blue",
  cream: "bg-ku-cream",
};
