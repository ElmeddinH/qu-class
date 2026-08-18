// ============================================================================
// A SİYAHISI — status kodu əhəmiyyətsiz, `loading.tsx` təhlükəsizdir.
//
// `/notifications` LEAF seqmentdir (alt route yoxdur) və nə səhifə, nə də
// `features/notifications` `notFound()` / `forbidden()` çağırır: naməlum filtr
// 404 vermir, sadəcə nəzərə alınmır (səhifə başlığındakı qeyd). Yeganə qapı
// `requireUser()`-dir və o, `redirect()` ilə `/login`-ə aparır — yönləndirmə
// isə seqment sərhədindən ƏVVƏL, middleware-də də tutulur.
//
// Axın/`notFound()` ziddiyyətinin tam izahı: `(admin)/loading.tsx`.
// ============================================================================

import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function NotificationsLoading() {
  return <PageSkeleton variant="list" label="Bildirişlər yüklənir" />;
}
