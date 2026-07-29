// ============================================================================
// src/features/class-home/types.ts
// Class Page widget-lərinin ortaq müqaviləsi.
//
// Hər widget SERVER komponentidir və öz məlumatını özü çəkir. Viewer prop kimi
// ÖTÜRÜLMÜR — widget `getViewer()` çağırır. Bu, təhlükəsizdir və ucuzdur:
// `getViewer` React `cache()` ilə sarılıb, yəni render başına DB-yə bir sorğu
// gedir (bax `src/lib/viewer.ts`).
// ============================================================================

import type { CohortHeader } from "@/services/cohort.service";

export interface ClassHomeWidgetProps {
  cohort: CohortHeader;
  /** `WidgetCard` başlığının `id`-si — `<section aria-labelledby>` ilə bağlanır. */
  headingId: string;
}

/** Widget-in siyahıda göstərdiyi element sayı — hamısı üçün eyni hədd. */
export const WIDGET_ITEM_LIMIT = 5;
