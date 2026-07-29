// ============================================================================
// src/features/class-home/icons.ts
// Class Page widget-lərinin ikon reyestri.
//
// ⚠️ İkonlar reyestrdə AD (sətir) ilə saxlanılır — `layouts/nav.ts` → `NAV_ICONS`
// və `features/feed/catalog.ts` → `FEED_ICONS` ilə eyni nümunə (CLAUDE.md §12).
// Widget reyestri (`registry.tsx`) hazırda tam server tərəfdədir, yəni funksiya
// ötürülməsi problemi yaranmır; ad işlətmək həmin konfiqi gələcəkdə client
// komponentinə ötürmək lazım gələndə də təhlükəsiz saxlayır.
// ============================================================================

import {
  BookOpenCheck,
  CalendarPlus,
  CalendarDays,
  Compass,
  Handshake,
  Heart,
  MapPin,
  MessageSquarePlus,
  PartyPopper,
  ScrollText,
  Sparkles,
  Trophy,
  UserPlus,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export const CLASS_HOME_ICONS = {
  calendar: CalendarDays,
  calendarPlus: CalendarPlus,
  compass: Compass,
  guide: BookOpenCheck,
  handshake: Handshake,
  heart: Heart,
  map: MapPin,
  postPlus: MessageSquarePlus,
  reunion: PartyPopper,
  sparkles: Sparkles,
  timeline: ScrollText,
  trophy: Trophy,
  userCheck: UserRoundCheck,
  userPlus: UserPlus,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type ClassHomeIconName = keyof typeof CLASS_HOME_ICONS;
