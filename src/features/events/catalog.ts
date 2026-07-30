// ============================================================================
// src/features/events/catalog.ts
// Tədbir enum-larının UI kataloqu — İKON adları və vizual qaydalar.
//
// ⚠️ ETİKETLƏR BURADA DEYİL. Onlar `src/lib/labels.ts`-dədir (TƏLƏ T13 — eyni
// enum iki faylda iki fərqli adla yaşamamalıdır). Bu fayl yalnız `lib`-də
// yeri olmayanı saxlayır: ikon adı və rəng qaydası.
//
// ⚠️ İkonlar KOMPONENT kimi deyil, AD (sətir) kimi saxlanılır və client
// tərəfdə `EVENT_ICONS` reyestrindən komponentə çevrilir (CLAUDE.md §12:
// React funksiyaları server → client sərhədindən keçmir).
//
// 🔴 `scope` və `category` İKİ AYRI cədvəldir və dəyərləri kəsişmir. Reunion
// `scope = REUNION` ilə işarələnir; `EventCategory`-də belə dəyər YOXDUR.
// ============================================================================

import {
  Award,
  Briefcase,
  CalendarDays,
  Building2,
  GraduationCap,
  Handshake,
  Landmark,
  Laptop,
  MapPin,
  PartyPopper,
  Plane,
  Presentation,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  EVENT_CATEGORY_VALUES,
  EVENT_SCOPE_VALUES,
  EventScope,
  RSVP_STATUS_VALUES,
  RsvpStatus,
  type EventCategory,
  type EventScope as EventScopeType,
  type RsvpStatus as RsvpStatusType,
} from "@/lib/enums";
import { EVENT_CATEGORY_LABELS, EVENT_SCOPE_LABELS } from "@/lib/labels";

/** `icon` sahələrinin açar dəsti. Client komponenti bunu import edir. */
export const EVENT_ICONS = {
  award: Award,
  briefcase: Briefcase,
  calendar: CalendarDays,
  building: Building2,
  graduation: GraduationCap,
  handshake: Handshake,
  landmark: Landmark,
  laptop: Laptop,
  mapPin: MapPin,
  party: PartyPopper,
  plane: Plane,
  presentation: Presentation,
  sparkles: Sparkles,
  trophy: Trophy,
  users: Users,
  wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type EventIconName = keyof typeof EVENT_ICONS;

export interface EventCatalogEntry {
  label: string;
  icon: EventIconName;
}

// ---------------------------------------------------------------------------
// Təşkilatçı səviyyəsi (5 dəyər)
// ---------------------------------------------------------------------------

export const EVENT_SCOPE_META: Record<EventScopeType, EventCatalogEntry> = {
  UNIVERSITY: { label: EVENT_SCOPE_LABELS.UNIVERSITY, icon: "landmark" },
  FACULTY: { label: EVENT_SCOPE_LABELS.FACULTY, icon: "building" },
  CLUB: { label: EVENT_SCOPE_LABELS.CLUB, icon: "sparkles" },
  CLASS: { label: EVENT_SCOPE_LABELS.CLASS, icon: "users" },
  REUNION: { label: EVENT_SCOPE_LABELS.REUNION, icon: "party" },
};

export const EVENT_SCOPE_OPTIONS = EVENT_SCOPE_VALUES;

// ---------------------------------------------------------------------------
// Tədbir növü (9 dəyər)
// ---------------------------------------------------------------------------

export const EVENT_CATEGORY_META: Record<EventCategory, EventCatalogEntry> = {
  MEETING: { label: EVENT_CATEGORY_LABELS.MEETING, icon: "users" },
  TRIP: { label: EVENT_CATEGORY_LABELS.TRIP, icon: "plane" },
  SEMINAR: { label: EVENT_CATEGORY_LABELS.SEMINAR, icon: "presentation" },
  WORKSHOP: { label: EVENT_CATEGORY_LABELS.WORKSHOP, icon: "wrench" },
  CEREMONY: { label: EVENT_CATEGORY_LABELS.CEREMONY, icon: "graduation" },
  COMPETITION: { label: EVENT_CATEGORY_LABELS.COMPETITION, icon: "trophy" },
  SOCIAL: { label: EVENT_CATEGORY_LABELS.SOCIAL, icon: "handshake" },
  CAREER: { label: EVENT_CATEGORY_LABELS.CAREER, icon: "briefcase" },
  OTHER: { label: EVENT_CATEGORY_LABELS.OTHER, icon: "calendar" },
};

export const EVENT_CATEGORY_OPTIONS = EVENT_CATEGORY_VALUES;

// ---------------------------------------------------------------------------
// Oxu köməkçiləri — DB sütunu `String`-dir, naməlum dəyər UI-nı sındırmamalıdır
// ---------------------------------------------------------------------------

const UNKNOWN_ENTRY: EventCatalogEntry = { label: "Digər", icon: "calendar" };

export function eventScopeMeta(value: string): EventCatalogEntry {
  return EVENT_SCOPE_META[value as EventScopeType] ?? UNKNOWN_ENTRY;
}

export function eventCategoryMeta(value: string): EventCatalogEntry {
  return EVENT_CATEGORY_META[value as EventCategory] ?? UNKNOWN_ENTRY;
}

// ---------------------------------------------------------------------------
// Reunion vizual fərqi (spec §15 — Blok 9 tələbi)
// ---------------------------------------------------------------------------

/**
 * Məzunlar görüşü digər tədbirlərdən VİZUAL olaraq ayrılır: `ku-cream` accent.
 *
 * ⚠️ KUDS §3 — `ku-cream` YALNIZ FON kimi işlədilir, mətn rəngi kimi YOX.
 * Üzərində həmişə `text-text-primary` / `text-ku-dark` olur, ağ mətn HEÇ VAXT
 * (kontrast 1.1:1-ə düşərdi).
 *
 * ⚠️ Yoxlama `scope`-a görədir, `category`-yə görə YOX — `EventCategory`-də
 * `REUNION` dəyəri yoxdur və olmamalıdır.
 */
export function isReunion(scope: string): boolean {
  return scope === EventScope.REUNION;
}

/** Reunion kartının çərçivə + fon sinifləri. Adi tədbirdə boş sətir. */
export function reunionCardAccent(scope: string): string {
  return isReunion(scope) ? "border-ku-cream bg-ku-cream/25" : "";
}

/** Reunion rozetinin sinifləri (KUDS: fon `ku-cream`, mətn tünd). */
export const REUNION_BADGE_CLASS =
  "border-ku-cream bg-ku-cream text-text-primary hover:bg-ku-cream";

// ---------------------------------------------------------------------------
// Toplu bildiriş — alıcı qrupları
// ---------------------------------------------------------------------------

/**
 * Koordinator panelində göstərilən alıcı qrupları.
 *
 * ⚠️ `NO_SHOW` və `DECLINED` siyahıda YOXDUR: gəlməyən adama "sabah görüşürük"
 * yazmaq mənasızdır və rədd edən adam bir daha xəbərdarlıq istəmir.
 * Koordinator lazım olsa `INVITED` qrupunu seçib xatırlada bilər.
 */
export const NOTIFY_STATUS_OPTIONS = [
  RsvpStatus.REGISTERED,
  RsvpStatus.ACCEPTED,
  RsvpStatus.WAITLISTED,
  RsvpStatus.INVITED,
  RsvpStatus.ATTENDED,
] as const satisfies readonly RsvpStatusType[];

/** Defolt seçim — yerini təsdiqləmiş iştirakçılar. */
export const DEFAULT_NOTIFY_STATUSES: readonly RsvpStatusType[] = [
  RsvpStatus.REGISTERED,
  RsvpStatus.ACCEPTED,
];

/** İştirakçı cədvəlinin status filtri — bütün 7 status. */
export const ATTENDEE_STATUS_OPTIONS = RSVP_STATUS_VALUES;
