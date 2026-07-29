// ============================================================================
// src/features/search/catalog.ts
// Qlobal axtarışın növ etiketləri və ikonları [M16].
//
// ⚠️ İkonlar reyestrdə AD (sətir) ilə saxlanılır — `layouts/nav.ts` → `NAV_ICONS`
// və `features/feed/catalog.ts` → `FEED_ICONS` ilə eyni nümunə (CLAUDE.md §12).
// Konfiq massivi server komponentindən client komponentinə ötürülsə də sınmır:
// React komponentləri (o cümlədən Lucide ikonları) funksiyadır və sərhəddən
// keçmir.
// ============================================================================

import {
  CalendarDays,
  MessageSquare,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { SearchResults } from "@/lib/search";

export const SEARCH_ICONS = {
  users: Users,
  post: MessageSquare,
  event: CalendarDays,
  trophy: Trophy,
} satisfies Record<string, LucideIcon>;

export type SearchIconName = keyof typeof SEARCH_ICONS;

export interface SearchGroupMeta {
  /** `SearchResults` açarı — tip sistemi uyğunluğu təmin edir. */
  key: keyof SearchResults;
  label: string;
  icon: SearchIconName;
  /** Növ üzrə heç nə tapılmadıqda göstərilən mətn (`/search` səhifəsi). */
  emptyText: string;
}

/** Dörd növ — spec §16 (Qlobal axtarış) sırası ilə. */
export const SEARCH_GROUPS: readonly SearchGroupMeta[] = [
  {
    key: "users",
    label: "Sinif yoldaşları",
    icon: "users",
    emptyText: "Bu ada uyğun sinif yoldaşı tapılmadı.",
  },
  {
    key: "posts",
    label: "Paylaşımlar",
    icon: "post",
    emptyText: "Uyğun paylaşım tapılmadı.",
  },
  {
    key: "events",
    label: "Tədbirlər",
    icon: "event",
    emptyText: "Uyğun tədbir tapılmadı.",
  },
  {
    key: "achievements",
    label: "Nailiyyətlər",
    icon: "trophy",
    emptyText: "Uyğun nailiyyət tapılmadı.",
  },
];
