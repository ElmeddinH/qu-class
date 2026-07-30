// ============================================================================
// src/layouts/nav.ts
// Naviqasiya xəritəsi — PLAN.md §4.2 route xəritəsinə uyğun.
//
// ⚠️ İkonlar burada KOMPONENT kimi deyil, AD (sətir) kimi saxlanılır.
// Səbəb: `NavSection[]` server komponentindən (DashboardShell) client
// komponentinə (SidebarNav) prop kimi ötürülür və React funksiyaları server →
// client sərhədindən keçə bilmir ("Functions cannot be passed directly to
// Client Components"). Sətir seriallaşır, komponent yox.
//
// Sinif linkləri DİNAMİKDİR: `buildAppNav(cohortSlug)` istifadəçinin əsas
// cohort-una görə qurulur. Cohort yoxdursa (yeni istifadəçi, cohort-a
// bağlanmamış admin) sinif bölməsi ümumiyyətlə göstərilmir.
// ============================================================================

import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  FileText,
  Flag,
  GraduationCap,
  Heart,
  House,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/** İkon reyestri — `NavItem.icon` bu obyektin açarıdır. */
export const NAV_ICONS = {
  bell: Bell,
  book: BookOpen,
  calendar: CalendarDays,
  chart: ChartColumn,
  file: FileText,
  flag: Flag,
  graduation: GraduationCap,
  heart: Heart,
  home: House,
  dashboard: LayoutDashboard,
  map: MapPin,
  scroll: ScrollText,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  trophy: Trophy,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

export interface NavSection {
  /** Bölmə başlığı — `null` olarsa başlıq göstərilmir */
  title: string | null;
  items: NavItem[];
}

/** "Mən" bölməsi — cohort-dan asılı deyil. */
const ME_SECTION: NavSection = {
  title: "Mən",
  items: [
    { href: "/me", label: "Profilim", icon: "graduation" },
    { href: "/me/privacy", label: "Məxfilik", icon: "shield" },
    { href: "/notifications", label: "Bildirişlər", icon: "bell" },
  ],
};

/**
 * AppShell naviqasiyası — istifadəçinin ƏSAS cohort slug-ına görə qurulur.
 *
 * @param cohortSlug əsas cohort slug-ı; `null` olarsa (hələ heç bir sinfə
 *   bağlanmamış istifadəçi) sinif linkləri buraxılır — mövcud olmayan
 *   `/class/null` ünvanına link vermək əvəzinə bölmə gizlədilir.
 */
export function buildAppNav(cohortSlug: string | null): NavSection[] {
  if (!cohortSlug) {
    return [
      { title: null, items: [{ href: "/home", label: "Ana səhifə", icon: "home" }] },
      ME_SECTION,
    ];
  }

  const base = `/class/${cohortSlug}`;

  return [
    {
      title: null,
      items: [
        { href: "/home", label: "Ana səhifə", icon: "home" },
        { href: `${base}/feed`, label: "Sinif lenti", icon: "sparkles" },
        { href: `${base}/directory`, label: "Sinif kataloqu", icon: "users" },
      ],
    },
    {
      title: "Sinif",
      items: [
        { href: `${base}/timeline`, label: "Xronologiya", icon: "scroll" },
        { href: `${base}/achievements`, label: "Nailiyyətlər", icon: "trophy" },
        { href: `${base}/memories`, label: "Xatirələr", icon: "heart" },
        { href: `${base}/events`, label: "Tədbirlər", icon: "calendar" },
        { href: `${base}/map`, label: "İndi haradayıq?", icon: "map" },
      ],
    },
    ME_SECTION,
  ];
}

/** AdminShell — UNIVERSITY_ADMIN naviqasiyası */
export const ADMIN_NAV: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "İdarə paneli", icon: "dashboard" },
      { href: "/admin/cohorts", label: "Cohort-lar", icon: "users" },
      { href: "/admin/users", label: "İstifadəçilər", icon: "graduation" },
    ],
  },
  {
    title: "Moderasiya",
    items: [
      { href: "/admin/moderation", label: "Şikayət növbəsi", icon: "flag" },
      { href: "/admin/achievements", label: "Nailiyyət təsdiqi", icon: "trophy" },
      { href: "/admin/audit", label: "Audit jurnalı", icon: "scroll" },
    ],
  },
  {
    title: "Məzmun",
    items: [
      { href: "/admin/content", label: "Səhifələr və FAQ", icon: "file" },
      { href: "/admin/stats", label: "Analitika", icon: "chart" },
      { href: "/kuds", label: "Stil bələdçisi", icon: "book" },
    ],
  },
];

// ---------------------------------------------------------------------------
// İctimai naviqasiya — açılış səhifəsinin anchor-ları
// ---------------------------------------------------------------------------

/**
 * 🔴 NİYƏ İCTİMAİ LİNKLƏR `#anchor`-DIR, SƏHİFƏ DEYİL.
 *
 * `/about`, `/faculties`, `/campus-life`, `/khankendi`, `/faq` və `/events`
 * səhifələri BLOK 11-in işidir (spec §2 Welcome Page, §3 Xankəndi bələdçisi).
 * O vaxta qədər naviqasiyada real ünvan kimi qalsalar hər klik 404 verir —
 * ziyarətçi üçün bu, "sayt sınıb" deməkdir.
 *
 * Müvəqqəti həll: linklər açılış səhifəsindəki bölmələrə yönəldilir. Bölmələr
 * MƏHZ BU SİYAHIDAN render olunur (`(public)/page.tsx` onun üzərində dövr
 * edir), yəni `id` ilə link həmişə uzlaşır.
 *
 * ⚠️ `/events` DƏ buradadır. Blok 9-da `routes.ts` → `PUBLIC_EXACT_PATHS` ona
 * istisna açdı (yol AÇIQ, auth tələb etmir), amma səhifənin ÖZÜ hələ yoxdur.
 * İstisnanı SİLMƏ — Blok 11-də `(public)/events/page.tsx` gələndə yalnız
 * aşağıdakı `href` real ünvana qaytarılır.
 *
 * ⚠️ Anchor `id`-ləri qısa və sabitdir: paylaşılan link (`/#events`) Blok 11-də
 * də işləməlidir.
 */
export interface LandingSection {
  /** `<section id>` — link `#` ilə buna bağlanır. */
  id: string;
  title: string;
  description: string;
}

export const LANDING_SECTIONS: LandingSection[] = [
  {
    id: "about",
    title: "Universitet haqqında",
    description:
      "Qarabağ Universiteti Xankəndidə yerləşir. Tarixçə, missiya və akademik struktur haqqında məlumat.",
  },
  {
    id: "faculties",
    title: "Fakültələr və ixtisaslar",
    description:
      "Dörd fakültə, on ixtisas. Hər ixtisasın öz sinif səhifəsi var — qəbul ilinə görə ayrılmış.",
  },
  {
    id: "campus-life",
    title: "Kampus həyatı və klublar",
    description:
      "Tələbə klubları, idman, mədəni tədbirlər və gündəlik kampus həyatı.",
  },
  {
    id: "khankendi",
    title: "Xankəndi bələdçisi",
    description:
      "Şəhərə yeni gələnlər üçün: nəqliyyat, universitetə gediş yolları, marketlər, səhiyyə və təcili əlaqə.",
  },
  {
    // 5-ci bölmə — `/events` linkinin hədəfi.
    id: "events",
    title: "Qarşıdan gələn tədbirlər",
    description:
      "Universitet, fakültə və klub tədbirləri. İctimai tədbirlərin tam siyahısı hazırlanır; sinif tədbirlərini görmək üçün daxil olun.",
  },
  {
    id: "faq",
    title: "Tez-tez verilən suallar",
    description:
      "Qeydiyyat, sinif səhifəsi, məxfilik parametrləri və məzun statusu ilə bağlı suallar.",
  },
];

/** `LANDING_SECTIONS`-dən anchor ünvanı qurur — `href` əl ilə yazılmır. */
export function landingAnchor(id: string): string {
  return `/#${id}`;
}

/**
 * PublicShell — giriş etməmiş ziyarətçi naviqasiyası.
 *
 * ⚠️ `href`-lər `landingAnchor()`-dandır (yuxarıdakı qeyd). Blok 11-də real
 * səhifələr yaranınca burada `/about`, `/faculties`… kimi ünvanlara qaytarılır.
 */
export const PUBLIC_NAV: { href: string; label: string }[] = [
  { href: landingAnchor("about"), label: "Universitet" },
  { href: landingAnchor("faculties"), label: "Fakültələr" },
  { href: landingAnchor("campus-life"), label: "Kampus həyatı" },
  { href: landingAnchor("khankendi"), label: "Xankəndi bələdçisi" },
  { href: landingAnchor("events"), label: "Tədbirlər" },
  { href: landingAnchor("faq"), label: "FAQ" },
];

/**
 * PublicShell footer sütunları.
 *
 * ⚠️ `PUBLIC_NAV` ilə eyni səbəbdən anchor-lardır (yuxarıdaki qeyd). Footer
 * daha çox link daşıyır və onların bir hissəsi eyni bölməyə düşür — bu,
 * qəsdəndir: "Tarixçə" və "Missiya" Blok 11-də ayrı səhifələr olacaq, indi isə
 * hər ikisi "Universitet haqqında" bölməsini göstərir. 404-dən yaxşıdır.
 */
export const FOOTER_NAV: NavSection[] = [
  {
    title: "Universitet",
    items: [
      { href: landingAnchor("about"), label: "Haqqımızda", icon: "book" },
      { href: landingAnchor("about"), label: "Tarixçə", icon: "scroll" },
      { href: landingAnchor("about"), label: "Missiya", icon: "sparkles" },
      { href: landingAnchor("faculties"), label: "Fakültələr", icon: "graduation" },
    ],
  },
  {
    title: "Tələbələr üçün",
    items: [
      { href: landingAnchor("about"), label: "Yeni qəbul", icon: "users" },
      { href: landingAnchor("campus-life"), label: "Kampus həyatı", icon: "heart" },
      { href: landingAnchor("campus-life"), label: "Klublar", icon: "trophy" },
      { href: landingAnchor("events"), label: "Tədbirlər", icon: "calendar" },
    ],
  },
  {
    title: "Xankəndi",
    items: [
      { href: landingAnchor("khankendi"), label: "Şəhər bələdçisi", icon: "map" },
      { href: landingAnchor("khankendi"), label: "Nəqliyyat", icon: "map" },
      { href: landingAnchor("khankendi"), label: "Səhiyyə", icon: "map" },
      { href: landingAnchor("faq"), label: "Tez-tez verilən suallar", icon: "file" },
    ],
  },
];
