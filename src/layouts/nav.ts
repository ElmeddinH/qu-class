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

import { LEGAL_PAGES, legalHref } from "@/lib/content-routes";
import { GuideCategory } from "@/lib/enums";
import { guideHref } from "@/lib/guide-filters";

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
 * 🔴 ANCHOR VƏZİYYƏTİ BİTDİ — LİNKLƏR REAL SƏHİFƏLƏRƏ QAYTARILDI (Blok 11A).
 *
 * Blok 9-da `/about`, `/faculties`, `/campus-life`, `/khankendi`, `/faq` və
 * `/events` səhifələri hələ yox idi, ona görə naviqasiya MÜVƏQQƏTİ olaraq
 * açılış səhifəsinin anchor-larına baxırdı (hər klik 404 versəydi ziyarətçi
 * üçün "sayt sınıb" demək olardı).
 *
 * İndi hamısı real səhifədir və `PUBLIC_NAV` / `FOOTER_NAV` onlara baxır.
 *
 * ⚠️ `LANDING_SECTIONS` SİLİNMƏDİ və silinməməlidir: açılış səhifəsinin
 * bölmələri MƏHZ bu siyahıdan render olunur (`features/welcome/sections.ts` →
 * `landingSection`) və `/#events` kimi PAYLAŞILMIŞ linklər hələ də işləməlidir.
 * Yəni siyahının rolu dəyişdi: naviqasiya hədəfi deyil, açılış bölmələrinin
 * VAHİD MƏNBƏYİ.
 *
 * ⚠️ `landingAnchor()` də saxlanılır — açılış səhifəsi öz daxili keçidlərində
 * (məs. hero → bölmə) onu işlədir.
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

/** PublicShell — giriş etməmiş ziyarətçi naviqasiyası. */
export const PUBLIC_NAV: { href: string; label: string }[] = [
  { href: "/about", label: "Universitet" },
  { href: "/faculties", label: "Fakültələr" },
  { href: "/campus-life", label: "Kampus həyatı" },
  { href: "/khankendi", label: "Xankəndi bələdçisi" },
  { href: "/events", label: "Tədbirlər" },
  { href: "/faq", label: "FAQ" },
];

/**
 * PublicShell footer sütunları — DÖRD sütun (Blok 11A).
 *
 * ⚠️ Bələdçi linkləri `guideHref()` ilə qurulur, əl ilə YAZILMIR: kateqoriya
 * dəyəri enum-dandır və filtrin parametr adı `lib/guide-filters.ts`-dədir.
 * Sətir literalı yazsaydıq enum dəyişəndə link səssizcə boş siyahıya aparardı.
 *
 * 🔴 DÖRDÜNCÜ SÜTUN — HÜQUQİ SƏNƏDLƏR (GW analizi #13). Məxfilik mühərriki
 * layihənin texniki nüvəsidir; öz məxfilik bildirişi olmayan məxfilik
 * platforması ziddiyyətdir. Siyahı `lib/content-routes.ts` → `LEGAL_PAGES`-dən
 * TÖRƏYİR, yəni sənəd əlavə etmək bir yerdə yazılır.
 *
 * ⚠️ Etiketlər sütun daxilində UNİKAL olmalıdır — `PublicShell` React açarı
 * kimi `label` işlədir (Blok 9-da bir neçə link eyni anchor-a baxırdı və `href`
 * açar kimi təkrarlanırdı).
 */
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
      { href: "/services", label: "Tələbə xidmətləri", icon: "file" },
    ],
  },
  {
    title: "Xankəndi",
    items: [
      { href: guideHref(), label: "Şəhər bələdçisi", icon: "map" },
      { href: guideHref({ category: GuideCategory.TRANSPORT }), label: "Nəqliyyat", icon: "map" },
      { href: guideHref({ category: GuideCategory.HEALTH }), label: "Səhiyyə", icon: "map" },
      { href: "/faq", label: "Tez-tez verilən suallar", icon: "file" },
    ],
  },
  {
    title: "Hüquqi məlumat",
    items: [
      ...LEGAL_PAGES.map((page) => ({
        href: legalHref(page.slug),
        label: page.label,
        icon: "shield" as NavIconName,
      })),
      { href: "/accessibility", label: "Əlçatanlıq", icon: "heart" },
    ],
  },
];
