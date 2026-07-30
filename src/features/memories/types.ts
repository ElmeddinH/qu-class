// ============================================================================
// src/features/memories/types.ts
// Server → client sərhədindən keçən formalar.
//
// ⚠️ `Date` obyektləri BURADA `string`-dir: server komponenti servisdən `Date`
// alır və client komponentinə ötürərkən Next onu seriallaşdırır. Tip yalanı
// olmasın deyə sərhəddən keçən forma ayrıca yazılır (eyni nümunə:
// `features/feed/types.ts`).
// ============================================================================

import type { MemoryType, Visibility } from "@/lib/enums";

/** Kompozitordakı «hansı məkanla bağlıdır?» seçimi. */
export interface MemoryPlaceOption {
  id: string;
  title: string;
  /** `GuideCategory` — DB-də `String`. */
  category: string;
}

/** Redaktə rejimində formaya ötürülən başlanğıc dəyərlər. */
export interface MemoryDraft {
  id: string;
  type: MemoryType;
  title: string;
  body: string;
  dedicatedTo: string | null;
  imageUrl: string | null;
  /** ISO sətri — forma `YYYY-MM-DD` hissəsini götürür. */
  occurredAt: string;
  guidePlaceId: string | null;
  visibility: Visibility;
  showInProfile: boolean;
  showInFeed: boolean;
  showInTimeline: boolean;
  showInYearbook: boolean;
}

/** Siyahı kartının gözlədiyi forma (server komponentindən gəlir). */
export interface MemoryCardView extends MemoryDraft {
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  guidePlace: { id: string; title: string; category: string } | null;
  /** Viewer müəllifdirmi? — redaktə/silmə menyusu. */
  isOwner: boolean;
  /** Viewer moderasiya edə bilirmi? Müəllif üçün `false` (o, sahib yolu ilə). */
  canModerate: boolean;
}
