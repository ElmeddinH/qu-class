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

/** PublicShell — giriş etməmiş ziyarətçi naviqasiyası */
export const PUBLIC_NAV: { href: string; label: string }[] = [
  { href: "/about", label: "Universitet" },
  { href: "/faculties", label: "Fakültələr" },
  { href: "/campus-life", label: "Kampus həyatı" },
  { href: "/khankendi", label: "Xankəndi bələdçisi" },
  { href: "/events", label: "Tədbirlər" },
  { href: "/faq", label: "FAQ" },
];

/** PublicShell footer sütunları */
export const FOOTER_NAV: NavSection[] = [
  {
    title: "Universitet",
    items: [
      { href: "/about", label: "Haqqımızda", icon: "book" },
      { href: "/history", label: "Tarixçə", icon: "scroll" },
      { href: "/mission", label: "Missiya", icon: "sparkles" },
      { href: "/faculties", label: "Fakültələr", icon: "graduation" },
    ],
  },
  {
    title: "Tələbələr üçün",
    items: [
      { href: "/newcomers", label: "Yeni qəbul", icon: "users" },
      { href: "/campus-life", label: "Kampus həyatı", icon: "heart" },
      { href: "/clubs", label: "Klublar", icon: "trophy" },
      { href: "/services", label: "Xidmətlər", icon: "settings" },
    ],
  },
  {
    title: "Xankəndi",
    items: [
      { href: "/khankendi", label: "Şəhər bələdçisi", icon: "map" },
      { href: "/khankendi/transport", label: "Nəqliyyat", icon: "map" },
      { href: "/khankendi/health", label: "Səhiyyə", icon: "map" },
      { href: "/faq", label: "Tez-tez verilən suallar", icon: "file" },
    ],
  },
];
