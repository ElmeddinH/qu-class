// ============================================================================
// src/app/(app)/notifications/page.tsx
// /notifications — bildiriş mərkəzi [M15] (spec §15).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): viewer qurur, URL-i `parseNotificationParams`
// ilə oxuyur və `features/notifications`-ə ötürür.
//
// ⚠️ ROUTE İCAZƏSİ: `/notifications` `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də
// ARTIQ VAR (Blok 2-dən bəri) və `nav.ts` → `ME_SECTION` ona link verir. Bu
// blokda yalnız SƏHİFƏ gəldi, icazə məntiqi DƏYİŞMƏDİ.
//
// 🔴 Bildiriş YALNIZ öz sahibinə göstərilir. Şərt (`recipientId = viewer.userId`)
// `services/notification.service.ts`-dədir və `visibilityWhere` ilə həll
// OLUNMUR — bu, ayrıca sahiblik qaydasıdır.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır → `force-dynamic`.
// ============================================================================

import type { Metadata } from "next";

import { NotificationCentre } from "@/features/notifications/NotificationCentre";
import { requireUser } from "@/lib/auth";
import { parseNotificationParams } from "@/lib/notification-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bildirişlər — QU CLASS",
};

interface NotificationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const viewer = await requireUser();

  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır.
  const filters = parseNotificationParams(await searchParams);

  return <NotificationCentre viewer={viewer} filters={filters} />;
}
