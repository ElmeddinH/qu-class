// ============================================================================
// src/features/notifications/NotificationFilters.tsx
// Oxunmuş/oxunmamış və 9 tip üzrə filtr — SERVER komponenti, hər filtr LİNKDİR.
//
// 🔴 CLIENT VƏZİYYƏTİ YOXDUR. Filtrlər `<Link>`-dir, çünki (a) vəziyyət URL-də
// olmalıdır (paylaşıla bilən), (b) `(admin)` qrupunda `QueryClientProvider`
// yoxdur və bildiriş səthinin heç bir hissəsi client sorğusuna bağlanmamalıdır
// (TƏLƏ C), (c) JS yüklənməsə də filtr işləyir.
//
// ⚠️ Filtr dəyişəndə SƏHİFƏ NÖMRƏSİ SIFIRLANIR (`page` ötürülmür): 5-ci
// səhifədə «oxunmamış» seçsək nəticə 1 səhifədirsə boş ekran görünərdi.
// ============================================================================

import Link from "next/link";

import {
  NOTIFICATION_STATUS_VALUES,
  hasActiveNotificationFilters,
  notificationsHref,
  type NotificationFilterState,
  type NotificationStatusFilter,
} from "@/lib/notification-filters";
import { notificationTypeLabel } from "@/lib/labels";
import { FILTER_CHIP_BASE, filterChipTone } from "@/components/shared/filter-chip";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<NotificationStatusFilter, string> = {
  unread: "Oxunmamış",
  read: "Oxunmuş",
};

interface NotificationFiltersProps {
  filters: NotificationFilterState;
  types: string[];
  /** Filtrdən keçmiş say — istifadəçi seçimin nəticəsini dərhal görür. */
  total: number;
}

export function NotificationFilters({ filters, types, total }: NotificationFiltersProps) {
  // ⚠️ `page` QƏSDƏN buraxılır — başlıqdaki qeyd.
  const base = { ...filters, page: 1 };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
      <nav aria-label="Oxunma vəziyyəti" className="flex flex-wrap gap-2">
        <Chip
          href={notificationsHref({ ...base, status: null })}
          label="Hamısı"
          active={filters.status === null}
        />
        {NOTIFICATION_STATUS_VALUES.map((status) => (
          <Chip
            key={status}
            href={notificationsHref({ ...base, status })}
            label={STATUS_LABELS[status]}
            active={filters.status === status}
          />
        ))}
      </nav>

      <nav aria-label="Bildiriş növü" className="flex flex-wrap gap-2">
        <Chip
          href={notificationsHref({ ...base, type: null })}
          label="Bütün növlər"
          active={filters.type === null}
        />
        {types.map((type) => (
          <Chip
            key={type}
            href={notificationsHref({
              ...base,
              // Tip `NotificationType` olmalıdır; siyahı enum-dan gəlir.
              type: type as NotificationFilterState["type"],
            })}
            label={notificationTypeLabel(type)}
            active={filters.type === type}
          />
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-secondary" role="status">
          {total} bildiriş
        </p>

        {hasActiveNotificationFilters(filters) ? (
          <Link
            href={notificationsHref()}
            className="kuds-prose-link text-small"
          >
            Filtri sıfırla
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        FILTER_CHIP_BASE,
        filterChipTone(active),
      )}
    >
      {label}
    </Link>
  );
}
