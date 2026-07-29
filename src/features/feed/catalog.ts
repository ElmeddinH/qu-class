// ============================================================================
// src/features/feed/catalog.ts
// Lent enum-larının UI kataloqu — azərbaycanca etiket + ikon adı.
//
// ⚠️ İkonlar KOMPONENT kimi deyil, AD (sətir) kimi saxlanılır və client tərəfdə
// `FEED_ICONS` reyestrindən komponentə çevrilir. Səbəb CLAUDE.md §12: React
// funksiyaları server → client sərhədindən keçmir, `npm run build` prerender
// mərhələsində sınır. Eyni nümunə: `layouts/nav.ts` → `NAV_ICONS`,
// `components/shared/visibility-meta.ts` → `VISIBILITY_ICONS`.
//
// ⚠️ `PostCategory` və `AchievementCategory` TAMAMİLƏ AYRI siyahılardır:
//   PostCategory        → FIRST_DAY, ORIENTATION, EXAM_PERIOD, CAPSTONE, …
//   AchievementCategory → AWARD, STARTUP, PATENT, REPRESENTATION, …
// Kəsişən yalnız `COMPETITION` adıdır və o da iki fərqli enum-un üzvüdür.
// Birini digərinin yerinə İŞLƏTMƏ.
//
// ⚠️ Hər cədvəl `Record<Enum, …>` tipindədir — enum-a yeni dəyər əlavə olunsa
// `tsc` burada dayanır, etiket səssizcə çatmamış qalmır.
// ============================================================================

import {
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  Compass,
  Dumbbell,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  HandHeart,
  Handshake,
  Heart,
  HeartHandshake,
  Images,
  Landmark,
  Lightbulb,
  Link2,
  Medal,
  Megaphone,
  MessageSquare,
  Newspaper,
  PartyPopper,
  Plane,
  Rocket,
  ScrollText,
  Sparkles,
  Star,
  Sunrise,
  ThumbsUp,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import {
  ACHIEVEMENT_CATEGORY_VALUES,
  MEMORY_TYPE_VALUES,
  POST_CATEGORY_VALUES,
  POST_KIND_VALUES,
  REACTION_TYPE_VALUES,
  type AchievementCategory,
  type MemoryType,
  type PostCategory,
  type PostKind,
  type ReactionType,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// İkon reyestri
// ---------------------------------------------------------------------------

/** `icon` sahələrinin açar dəsti. Client komponenti bunu import edir. */
export const FEED_ICONS = {
  award: Award,
  banknote: Banknote,
  book: BookOpen,
  briefcase: Briefcase,
  calendar: CalendarDays,
  camera: Camera,
  compass: Compass,
  dumbbell: Dumbbell,
  file: FileText,
  flask: FlaskConical,
  globe: Globe,
  graduation: GraduationCap,
  handHeart: HandHeart,
  handshake: Handshake,
  heart: Heart,
  heartHandshake: HeartHandshake,
  images: Images,
  landmark: Landmark,
  lightbulb: Lightbulb,
  link: Link2,
  medal: Medal,
  megaphone: Megaphone,
  message: MessageSquare,
  newspaper: Newspaper,
  party: PartyPopper,
  plane: Plane,
  rocket: Rocket,
  scroll: ScrollText,
  sparkles: Sparkles,
  star: Star,
  sunrise: Sunrise,
  thumbsUp: ThumbsUp,
  trophy: Trophy,
  users: Users,
  video: Video,
} satisfies Record<string, LucideIcon>;

export type FeedIconName = keyof typeof FEED_ICONS;

export interface CatalogEntry {
  label: string;
  icon: FeedIconName;
}

// ---------------------------------------------------------------------------
// 1. Post kateqoriyaları — 12 dəyər, MƏCBURİ seçim (spec §6)
// ---------------------------------------------------------------------------

export const POST_CATEGORY_META: Record<PostCategory, CatalogEntry> = {
  FIRST_DAY: { label: "İlk gün", icon: "sunrise" },
  ORIENTATION: { label: "Oriyentasiya", icon: "compass" },
  EVENT_PHOTOS: { label: "Tədbir fotoları", icon: "camera" },
  ACADEMIC_ACHIEVEMENT: { label: "Akademik nailiyyət", icon: "graduation" },
  SOCIAL_ACHIEVEMENT: { label: "İctimai nailiyyət", icon: "users" },
  TRIPS: { label: "Səyahətlər", icon: "plane" },
  EXAM_PERIOD: { label: "İmtahan dövrü", icon: "book" },
  INTERNSHIP: { label: "Təcrübə", icon: "briefcase" },
  CLUB_ACTIVITY: { label: "Klub fəaliyyəti", icon: "sparkles" },
  COMPETITION: { label: "Yarışlar", icon: "trophy" },
  CAPSTONE: { label: "Buraxılış layihəsi", icon: "scroll" },
  GENERAL: { label: "Ümumi", icon: "message" },
};

/** UI-da göstərilmə sırası — enum massivi ilə eynidir. */
export const POST_CATEGORY_OPTIONS = POST_CATEGORY_VALUES;

// ---------------------------------------------------------------------------
// 2. Post növləri — 8 dəyər (spec §6)
// ---------------------------------------------------------------------------

export interface PostKindEntry extends CatalogEntry {
  /** Kompozitorda seçimin altında göstərilən izah. */
  hint: string;
}

/**
 * ⚠️ «Bu növ şəkil tələb edirmi?» sualının cavabı BURADA DEYİL —
 * `features/feed/schemas.ts` → `MEDIA_REQUIRED_KINDS`. Doğrulama qaydası tək
 * yerdə yaşayır (Zod sxemi), yoxsa forma bir şeyi, server başqasını tələb edər.
 */
export const POST_KIND_META: Record<PostKind, PostKindEntry> = {
  TEXT: { label: "Mətn", icon: "message", hint: "Sadə paylaşım — yalnız mətn." },
  PHOTO: { label: "Foto", icon: "camera", hint: "Bir şəkil və qısa izah." },
  ALBUM: {
    label: "Albom",
    icon: "images",
    hint: "Bir neçə şəkil — sırasını dəyişə bilərsiniz.",
  },
  VIDEO: { label: "Video", icon: "video", hint: "Video keçidi və ya kadr şəkli." },
  LINK: {
    label: "Keçid",
    icon: "link",
    hint: "Xarici ünvan — başlığı və şəklini əl ilə yazın.",
  },
  EVENT: { label: "Tədbir", icon: "calendar", hint: "Mövcud tədbirə istinad edir." },
  ACHIEVEMENT: {
    label: "Nailiyyət",
    icon: "trophy",
    hint: "Nailiyyət təsdiq üçün göndərilir.",
  },
  MEMORY: { label: "Xatirə", icon: "heart", hint: "Xatirə mətni — 8 növdən biri." },
};

export const POST_KIND_OPTIONS = POST_KIND_VALUES;

// ---------------------------------------------------------------------------
// 3. Nailiyyət kateqoriyaları — 12 dəyər (spec §12)
//    ⚠️ Post kateqoriyaları ilə QARIŞDIRMA (fayl başlığındaki xəbərdarlıq).
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_CATEGORY_META: Record<AchievementCategory, CatalogEntry> = {
  AWARD: { label: "Mükafat", icon: "award" },
  STARTUP: { label: "Startap", icon: "rocket" },
  PUBLICATION: { label: "Elmi nəşr", icon: "newspaper" },
  GRANT: { label: "Qrant", icon: "banknote" },
  INTERNATIONAL_PROGRAM: { label: "Beynəlxalq proqram", icon: "globe" },
  SPORTS: { label: "İdman", icon: "dumbbell" },
  VOLUNTEERING: { label: "Könüllülük", icon: "handHeart" },
  CAREER: { label: "Karyera", icon: "briefcase" },
  SOCIAL_PROJECT: { label: "Sosial layihə", icon: "lightbulb" },
  COMPETITION: { label: "Müsabiqə", icon: "medal" },
  PATENT: { label: "Patent", icon: "flask" },
  REPRESENTATION: { label: "Təmsilçilik", icon: "landmark" },
};

export const ACHIEVEMENT_CATEGORY_OPTIONS = ACHIEVEMENT_CATEGORY_VALUES;

// ---------------------------------------------------------------------------
// 4. Xatirə növləri — 8 dəyər (spec §11)
// ---------------------------------------------------------------------------

export const MEMORY_TYPE_META: Record<MemoryType, CatalogEntry> = {
  SHORT_MEMORY: { label: "Qısa xatirə", icon: "sparkles" },
  UNIVERSITY_STORY: { label: "Universitet hekayəsi", icon: "scroll" },
  THANKS_TEACHER: { label: "Müəllimə təşəkkür", icon: "graduation" },
  THANKS_CLASSMATE: { label: "Sinif yoldaşına təşəkkür", icon: "handshake" },
  UNFORGETTABLE_LESSON: { label: "Unudulmaz dərs", icon: "book" },
  MEMORABLE_EVENT: { label: "Yaddaqalan tədbir", icon: "party" },
  WHAT_UNI_GAVE_ME: { label: "Universitet mənə nə verdi", icon: "star" },
  MESSAGE_TO_QU: { label: "QU-ya mesaj", icon: "megaphone" },
};

export const MEMORY_TYPE_OPTIONS = MEMORY_TYPE_VALUES;

// ---------------------------------------------------------------------------
// 5. Reaksiyalar — 4 dəyər
// ---------------------------------------------------------------------------

export const REACTION_META: Record<ReactionType, CatalogEntry> = {
  LIKE: { label: "Bəyənirəm", icon: "thumbsUp" },
  CELEBRATE: { label: "Təbrik edirəm", icon: "party" },
  SUPPORT: { label: "Dəstəkləyirəm", icon: "heartHandshake" },
  LOVE: { label: "Çox xoşuma gəldi", icon: "heart" },
};

export const REACTION_OPTIONS = REACTION_TYPE_VALUES;

// ---------------------------------------------------------------------------
// Köməkçilər — DB-dən gələn `String` sütunu üçün (naməlum dəyər sızmasın)
// ---------------------------------------------------------------------------

const UNKNOWN_ENTRY: CatalogEntry = { label: "Naməlum", icon: "message" };

/** Kateqoriya sütunu DB-də `String`-dir; tanınmayan dəyər UI-nı sındırmamalıdır. */
export function postCategoryMeta(value: string): CatalogEntry {
  return POST_CATEGORY_META[value as PostCategory] ?? UNKNOWN_ENTRY;
}

export function postKindMeta(value: string): CatalogEntry {
  return POST_KIND_META[value as PostKind] ?? UNKNOWN_ENTRY;
}

export function achievementCategoryMeta(value: string): CatalogEntry {
  return ACHIEVEMENT_CATEGORY_META[value as AchievementCategory] ?? UNKNOWN_ENTRY;
}

export function memoryTypeMeta(value: string): CatalogEntry {
  return MEMORY_TYPE_META[value as MemoryType] ?? UNKNOWN_ENTRY;
}
