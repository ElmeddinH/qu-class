// ============================================================================
// src/features/notifications/NotificationCentre.tsx
// `/notifications` — bildiriş mərkəzi [M15] (spec §15).
//
// 🔴 YALNIZ ÖZ BİLDİRİŞLƏRİ. Şərt (`recipientId = viewer.userId`) SERVİSDƏDİR
// və burada təkrarlanmır — bu, `visibilityWhere` ilə həll OLUNMUR, ayrıca
// sahiblik qaydasıdır (`services/notification.service.ts` başlığı).
//
// ⚠️ Filtrlər URL-dədir (`?status=unread&type=EVENT_INVITE&page=2`) — vəziyyət
// paylaşıla bilən olmalıdır və server komponentində oxunur.
//
// ⚠️ SİYAHI VƏ SAY EYNİ şərtdən keçir (`notificationWhere`) — ayrılsalar səhifə
// "24 bildiriş" yazıb 12 sətir göstərərdi (Blok 8-in dərsi).
//
// ⚠️ Oxunmamış SAY filtrdən ASILI DEYİL: rozetdəki rəqəm həmişə ümumi
// oxunmamış saydır, yoxsa «tip filtri» seçəndə rozet "azaldı" kimi görünərdi.
// ============================================================================

import { Bell } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { NOTIFICATION_TYPE_VALUES } from "@/lib/enums";
import {
  NOTIFICATION_PAGE_SIZE,
  notificationPageCount,
  notificationSkipOf,
  notificationsHref,
  type NotificationFilterState,
} from "@/lib/notification-filters";
import {
  countNotifications,
  countUnreadNotifications,
  listNotifications,
} from "@/services/notification.service";
import type { AuthenticatedViewer } from "@/lib/viewer";

import { MarkAllReadButton } from "./NotificationActions";
import { NotificationFilters } from "./NotificationFilters";
import { NotificationItem } from "./NotificationItem";

interface NotificationCentreProps {
  viewer: AuthenticatedViewer;
  filters: NotificationFilterState;
}

export async function NotificationCentre({ viewer, filters }: NotificationCentreProps) {
  const serviceFilters = {
    unread: filters.status === null ? undefined : filters.status === "unread",
    type: filters.type ?? undefined,
  };

  const [items, total, unreadTotal] = await Promise.all([
    listNotifications(viewer, {
      ...serviceFilters,
      take: NOTIFICATION_PAGE_SIZE,
      skip: notificationSkipOf(filters),
    }),
    countNotifications(viewer, serviceFilters),
    // Filtrdən ASILI DEYİL — başlıqdaki qeyd.
    countUnreadNotifications(viewer),
  ]);

  const pageCount = notificationPageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Bildirişlər</h1>
          <p className="text-body text-text-secondary" data-testid="unread-summary">
            {unreadTotal === 0
              ? "Oxunmamış bildiriş yoxdur."
              : `${unreadTotal} oxunmamış bildiriş`}
          </p>
        </div>

        <MarkAllReadButton unreadCount={unreadTotal} />
      </header>

      <NotificationFilters
        filters={filters}
        types={[...NOTIFICATION_TYPE_VALUES]}
        total={total}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Bildiriş yoxdur"
          description={
            filters.status !== null || filters.type !== null
              ? "Seçilmiş filtrlərə uyğun bildiriş tapılmadı."
              : "Sinif fəaliyyəti başlayanda bildirişlər burada görünəcək."
          }
          action={
            filters.status !== null || filters.type !== null
              ? { href: notificationsHref(), label: "Filtri sıfırla" }
              : { href: "/home", label: "Ana səhifə" }
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationItem item={item} />
            </li>
          ))}
        </ul>
      )}

      <PagerNav
        page={filters.page}
        pageCount={pageCount}
        // Filtrlər səhifə keçidində SAXLANILIR — link `serializeNotificationParams`
        // ilə qurulur, əl ilə yazılmır.
        hrefFor={(page) => notificationsHref({ ...filters, page })}
        label="Bildiriş səhifələri"
      />
    </div>
  );
}
