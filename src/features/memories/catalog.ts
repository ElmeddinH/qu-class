// ============================================================================
// src/features/memories/catalog.ts
// Share Memories [M9] UI kataloqu — 8 xatirə növünün ikonu və kart tonu.
//
// ⚠️ ETİKET BURADA YAZILMIR. Azərbaycanca adlar `lib/labels.ts` →
// `MEMORY_TYPE_LABELS`-dədir (T13 — ikinci cədvəl açma). Lentin kataloqu
// (`features/feed/catalog.ts`) da eyni mənbədən oxuyur; `features/*`
// qovluqları bir-birindən import etmir, ona görə ortaq hissə `lib/`-dədir.
//
// ⚠️ TƏLƏ T1: ikon KOMPONENT kimi deyil, AD (sətir) kimi saxlanılır və client
// tərəfdə `MEMORY_ICONS` reyestrindən komponentə çevrilir. React funksiyaları
// server → client sərhədindən keçmir (CLAUDE.md §12) — `npm run build`
// prerender mərhələsində sınır.
//
// ⚠️ KART TONU YALNIZ FON ÜÇÜNDÜR. `ku-soft`, `ku-blue`, `ku-cream` KUDS §3-də
// "yalnız fon/badge" kimi işarələnib; üzərində HƏMİŞƏ `text-text-primary`
// gəlir, ağ mətn heç vaxt (kontrast cədvəli — CLAUDE.md).
//
// ⚠️ Cədvəl `Record<MemoryType, …>` tipindədir: `lib/enums.ts`-ə yeni növ
// əlavə olunsa `tsc` MƏHZ BURADA dayanır.
// ============================================================================

import {
  BookOpen,
  GraduationCap,
  Handshake,
  Heart,
  Megaphone,
  PartyPopper,
  ScrollText,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

import { MEMORY_TYPE_VALUES, type MemoryType } from "@/lib/enums";
import { MEMORY_TYPE_LABELS } from "@/lib/labels";

/** `icon` sahələrinin açar dəsti. Client komponenti bunu import edir. */
export const MEMORY_ICONS = {
  book: BookOpen,
  graduation: GraduationCap,
  handshake: Handshake,
  heart: Heart,
  megaphone: Megaphone,
  party: PartyPopper,
  scroll: ScrollText,
  sparkles: Sparkles,
  star: Star,
} satisfies Record<string, LucideIcon>;

export type MemoryIconName = keyof typeof MEMORY_ICONS;

/**
 * Kart fonu — üç KUDS accent tonu növbə ilə dövr edir.
 * Sinif adı kimi saxlanılır ki, komponent `cn()` ilə birbaşa işlətsin.
 */
export const MEMORY_TONES = {
  soft: "bg-ku-soft",
  blue: "bg-ku-blue",
  cream: "bg-ku-cream",
} as const;

export type MemoryToneName = keyof typeof MEMORY_TONES;

export interface MemoryTypeEntry {
  label: string;
  icon: MemoryIconName;
  /** Yalnız FON tonu — mətn rəngi kimi işlədilmir. */
  tone: MemoryToneName;
}

/**
 * 8 növün UI məlumatı.
 *
 * Ton `MEMORY_TYPE_VALUES` sırası ilə soft → blue → cream dövr edir: qonşu
 * kartlar eyni fonu almasın, amma palitra üç tonla məhdud qalsın.
 */
export const MEMORY_TYPE_META: Record<MemoryType, MemoryTypeEntry> = {
  SHORT_MEMORY: { label: MEMORY_TYPE_LABELS.SHORT_MEMORY, icon: "sparkles", tone: "soft" },
  UNIVERSITY_STORY: {
    label: MEMORY_TYPE_LABELS.UNIVERSITY_STORY,
    icon: "scroll",
    tone: "blue",
  },
  THANKS_TEACHER: {
    label: MEMORY_TYPE_LABELS.THANKS_TEACHER,
    icon: "graduation",
    tone: "cream",
  },
  THANKS_CLASSMATE: {
    label: MEMORY_TYPE_LABELS.THANKS_CLASSMATE,
    icon: "handshake",
    tone: "soft",
  },
  UNFORGETTABLE_LESSON: {
    label: MEMORY_TYPE_LABELS.UNFORGETTABLE_LESSON,
    icon: "book",
    tone: "blue",
  },
  MEMORABLE_EVENT: {
    label: MEMORY_TYPE_LABELS.MEMORABLE_EVENT,
    icon: "party",
    tone: "cream",
  },
  WHAT_UNI_GAVE_ME: {
    label: MEMORY_TYPE_LABELS.WHAT_UNI_GAVE_ME,
    icon: "star",
    tone: "soft",
  },
  MESSAGE_TO_QU: {
    label: MEMORY_TYPE_LABELS.MESSAGE_TO_QU,
    icon: "megaphone",
    tone: "blue",
  },
};

/** Formada və filtrdə göstərilmə sırası — enum massivi ilə eynidir. */
export const MEMORY_TYPE_OPTIONS = MEMORY_TYPE_VALUES;

const UNKNOWN_ENTRY: MemoryTypeEntry = {
  label: "Xatirə",
  icon: "heart",
  tone: "soft",
};

/** DB sütunu `String`-dir — naməlum növ UI-nı sındırmamalıdır (fail soft). */
export function memoryTypeMeta(value: string): MemoryTypeEntry {
  return MEMORY_TYPE_META[value as MemoryType] ?? UNKNOWN_ENTRY;
}

/** Kartın fon sinfi — `memoryTypeMeta(...).tone` üzərindən. */
export function memoryToneClass(value: string): string {
  return MEMORY_TONES[memoryTypeMeta(value).tone];
}
