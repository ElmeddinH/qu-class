// ============================================================================
// src/services/notification.service.ts
// Bildiriş mərkəzi [M15] — spec §15.
//
// 🔴 BURADA MƏXFİLİK ŞƏRTİ `visibilityWhere` DEYİL — SAHİBLİKDİR.
// Bildiriş dörd səviyyəli görünürlük modelinə DÜŞMÜR: onun `visibility` sütunu
// YOXDUR və olmamalıdır. Bildiriş bir nəfərə ünvanlanmış mesajdır, yəni yeganə
// qayda budur:
//
//     recipientId = viewer.userId
//
// və o, HƏR sorğuya (siyahı, say, oxunmuş işarələmə) ayrıca yazılır. `Viewer`
// yenə də ilk arqumentdir (CLAUDE.md §4) — ondan `userId` oxunur, sahiblik
// şərti isə çağırana buraxılmır.
//
// 🔴 `markAsRead` `updateMany` İŞLƏDİR, `update` YOX.
// `update({ where: { id } })` sahiblik şərtini QƏBUL ETMİR (yalnız unikal
// sahələr) — yəni başqasının bildiriş `id`-si göndərilsə sətir DƏYİŞƏRDİ.
// `updateMany` isə `where`-ə `recipientId` əlavə etməyə imkan verir və uyğun
// sətir yoxdursa `count: 0` qaytarır. Bu, "IDOR" sinfindən bir səhvin
// struktur bağlanışıdır və ayrıca inteqrasiya testi ilə bərkidilib.
//
// ⚠️ SİLMƏ ƏMƏLİYYATI YOXDUR — qəsdən. Bildiriş tarixçəsi moderasiya və
// «nə vaxt xəbərdar edildim?» sualı üçün qalır; istifadəçi onu yalnız oxunmuş
// işarələyə bilir.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { NotificationType } from "@/lib/enums";
import { NOTIFICATION_PAGE_SIZE } from "@/lib/notification-filters";
import type { AuthenticatedViewer } from "@/lib/viewer";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
}

export interface NotificationFilters {
  /** `true` → yalnız oxunmamış, `false` → yalnız oxunmuş, `undefined` → hamısı. */
  unread?: boolean;
  type?: NotificationType;
  take?: number;
  skip?: number;
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  url: true,
  entityType: true,
  entityId: true,
  readAt: true,
  createdAt: true,
  actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} satisfies Prisma.NotificationSelect;

/**
 * Siyahı və sayın ORTAQ şərti.
 *
 * ⚠️ Şərt TƏK yerdə qurulur: `listNotifications` və `countNotifications`
 * ayrılsa səhifə "24 bildiriş" yazıb 12 sətir göstərərdi (Blok 8-in
 * `achievementWhere` dərsi). Sahiblik şərti də məhz burada, BİRİNCİ yazılır.
 */
function notificationWhere(
  viewer: AuthenticatedViewer,
  filters: NotificationFilters,
): Prisma.NotificationWhereInput {
  return {
    recipientId: viewer.userId,
    ...(filters.unread === undefined ? {} : { readAt: filters.unread ? null : { not: null } }),
    ...(filters.type ? { type: filters.type } : {}),
  };
}

export async function listNotifications(
  viewer: AuthenticatedViewer,
  filters: NotificationFilters = {},
): Promise<NotificationItem[]> {
  return prisma.notification.findMany({
    where: notificationWhere(viewer, filters),
    // Oxunmamışlar ÖNCƏ deyil — xronoloji sıra bildiriş lentində gözlənilən
    // davranışdır və "oxunmuşu oxunmamış etmək" düyməsi olmadığı üçün sıra
    // istifadəçinin altında sürüşməz.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: filters.take ?? NOTIFICATION_PAGE_SIZE,
    skip: filters.skip ?? 0,
    select: NOTIFICATION_SELECT,
  });
}

/** `listNotifications` ilə EYNİ şərtin sayı — səhifələmə üçün. */
export async function countNotifications(
  viewer: AuthenticatedViewer,
  filters: NotificationFilters = {},
): Promise<number> {
  return prisma.notification.count({ where: notificationWhere(viewer, filters) });
}

/**
 * Header rozetinin rəqəmi — oxunmamış bildiriş sayı.
 *
 * ⚠️ Rozet `(admin)` qrupunda DA render olunur (`DashboardShell` ortaqdır), ona
 * görə bu funksiya TanStack Query ilə deyil, SERVER komponentindən çağırılır —
 * `QueryClientProvider` yalnız `(app)`-dədir (Blok 6, T18: admin paneli
 * "No QueryClient set" ilə 500 verirdi).
 */
export async function countUnreadNotifications(
  viewer: AuthenticatedViewer,
): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: viewer.userId, readAt: null },
  });
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

export interface MarkReadOutcome {
  /** Dəyişdirilmiş sətir sayı. `0` → sətir yoxdur VƏ YA başqasınındır. */
  changed: number;
}

/**
 * Tək bildirişi oxunmuş işarələyir.
 *
 * 🔴 `where`-də `recipientId` MƏCBURİDİR (fayl başlığındakı qeyd). Nəticə
 * `NOT_FOUND` ilə `FORBIDDEN` arasında FƏRQ QOYMUR: hər iki halda `changed: 0`
 * qayıdır, yəni cavab başqasının bildirişinin MÖVCUDLUĞUNU da sızdırmır.
 *
 * ⚠️ `readAt: null` şərti də var — artıq oxunmuş bildirişin vaxt möhürü
 * DƏYİŞMİR (istifadəçi siyahını iki dəfə açsa "oxundu" vaxtı sürüşməməlidir).
 */
export async function markNotificationRead(
  viewer: AuthenticatedViewer,
  notificationId: string,
  now: Date = new Date(),
): Promise<MarkReadOutcome> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: viewer.userId, readAt: null },
    data: { readAt: now },
  });

  return { changed: result.count };
}

/** Hamısını oxunmuş işarələyir — yalnız SAHİBİNİN oxunmamışları. */
export async function markAllNotificationsRead(
  viewer: AuthenticatedViewer,
  now: Date = new Date(),
): Promise<MarkReadOutcome> {
  const result = await prisma.notification.updateMany({
    where: { recipientId: viewer.userId, readAt: null },
    data: { readAt: now },
  });

  return { changed: result.count };
}
