// ============================================================================
// src/features/kuds/tokens.ts
// /kuds stil bələdçisinin məlumat cədvəlləri.
//
// ⚠️ Buradakı hex sətirləri STİL DEYİL, MƏTNDİR — bələdçidə göstərilən etiket.
// Faktiki rəng həmişə `className` sahəsindəki Tailwind token-i ilə tətbiq olunur
// (CLAUDE.md §2: hardcode rəng yoxdur).
//
// Kontrast dəyərləri WCAG 2.1 düsturu ilə hesablanıb (relative luminance).
// AA hədləri: normal mətn 4.5:1 · böyük mətn (18px+ / 14px bold) 3:1.
// ============================================================================

export interface ColorToken {
  /** Tailwind sinfinin adı, məs. `bg-ku-green` */
  className: string;
  /** Sənəd üçün token adı */
  name: string;
  /** Etiket kimi göstərilən hex — stil məqsədilə İŞLƏDİLMİR */
  hex: string;
  usage: string;
  /** Bu rəng fon olduqda AĞ mətnlə kontrast */
  onWhite: number;
  /** Bu rəng fon olduqda TÜND mətnlə (#1E293B) kontrast */
  onDark: number;
  note?: string;
}

export const BRAND_COLORS: ColorToken[] = [
  {
    className: "bg-ku-green",
    name: "ku-green",
    hex: "#44766C",
    usage: "Primary — düymələr, aktiv link, brend",
    onWhite: 5.18,
    onDark: 2.82,
  },
  {
    className: "bg-ku-dark",
    name: "ku-dark",
    hex: "#16423C",
    usage: "Sidebar fonu, başlıq, hover",
    onWhite: 11.18,
    onDark: 1.31,
  },
  {
    className: "bg-ku-soft",
    name: "ku-soft",
    hex: "#D3E8BF",
    usage: "Yalnız fon / badge",
    onWhite: 1.31,
    onDark: 11.19,
    note: "Mətn rəngi kimi işlətmə",
  },
  {
    className: "bg-ku-blue",
    name: "ku-blue",
    hex: "#CAEAF1",
    usage: "Yalnız fon / badge",
    onWhite: 1.27,
    onDark: 11.53,
    note: "Mətn rəngi kimi işlətmə",
  },
  {
    className: "bg-ku-cream",
    name: "ku-cream",
    hex: "#F0F3BF",
    usage: "Yalnız fon / badge — müvəqqəti accent",
    onWhite: 1.15,
    onDark: 12.73,
    note: "KUDS §11 «Accent: Gold» deyir, §3-də gold hex yoxdur",
  },
];

export const SURFACE_COLORS: ColorToken[] = [
  {
    className: "bg-background",
    name: "background",
    hex: "#F8FAFC",
    usage: "Səhifə fonu",
    onWhite: 1.05,
    onDark: 13.98,
  },
  {
    className: "bg-surface",
    name: "surface",
    hex: "#FFFFFF",
    usage: "Kart, modal, input fonu",
    onWhite: 1.0,
    onDark: 14.63,
  },
  {
    className: "bg-border",
    name: "border",
    hex: "#E2E8F0",
    usage: "Bütün sərhədlər",
    onWhite: 1.23,
    onDark: 11.87,
  },
  {
    className: "bg-text-primary",
    name: "text-primary",
    hex: "#1E293B",
    usage: "Əsas mətn → sinif: text-text-primary",
    onWhite: 14.63,
    onDark: 1.0,
  },
  {
    className: "bg-text-secondary",
    name: "text-secondary",
    hex: "#64748B",
    usage: "İkinci dərəcəli mətn → sinif: text-text-secondary",
    onWhite: 4.76,
    onDark: 3.07,
    note: "background üzərində 4.55:1 — 14px-dən kiçik işlətmə",
  },
];

export const SEMANTIC_COLORS: ColorToken[] = [
  {
    className: "bg-success",
    name: "success",
    hex: "#10B981",
    usage: "Fon, ikon, 18px+ mətn",
    onWhite: 2.54,
    onDark: 5.77,
    note: "Ağ mətn qoyma — success-strong işlət",
  },
  {
    className: "bg-success-strong",
    name: "success-strong",
    hex: "#047857",
    usage: "Ağ mətn altında filled fon",
    onWhite: 5.48,
    onDark: 2.67,
  },
  {
    className: "bg-warning",
    name: "warning",
    hex: "#F59E0B",
    usage: "Fon — üzərində TÜND mətn",
    onWhite: 2.15,
    onDark: 6.81,
    note: "Ağ mətnlə 2.15:1 — pozuntudur",
  },
  {
    className: "bg-warning-strong",
    name: "warning-strong",
    hex: "#B45309",
    usage: "Ağ mətn altında filled fon",
    onWhite: 5.02,
    onDark: 2.91,
  },
  {
    className: "bg-danger",
    name: "danger",
    hex: "#EF4444",
    usage: "Fon, ikon, 18px+ mətn",
    onWhite: 3.76,
    onDark: 3.89,
    note: "Hər iki mətn rəngi AA-nı ödəmir — yalnız ikon/sərhəd",
  },
  {
    className: "bg-danger-strong",
    name: "danger-strong",
    hex: "#B91C1C",
    usage: "Ağ mətn altında filled fon (destructive düymə)",
    onWhite: 6.47,
    onDark: 2.26,
  },
];

// ---------------------------------------------------------------------------
// KUDS §4 — Tipoqrafiya
// ---------------------------------------------------------------------------

export interface TypeToken {
  className: string;
  name: string;
  size: string;
  weight: string;
  sample: string;
}

export const TYPE_SCALE: TypeToken[] = [
  {
    className: "text-display font-bold",
    name: "Display",
    size: "40px",
    weight: "Bold 700",
    sample: "Sinif heç vaxt bağlanmır",
  },
  {
    className: "text-h1 font-bold",
    name: "H1",
    size: "32px",
    weight: "Bold 700",
    sample: "Qarabağ Universiteti",
  },
  {
    className: "text-h2 font-semibold",
    name: "H2",
    size: "24px",
    weight: "SemiBold 600",
    sample: "İnformatika — Class of 2030",
  },
  {
    className: "text-h3 font-semibold",
    name: "H3",
    size: "20px",
    weight: "SemiBold 600",
    sample: "Sinif xronologiyası",
  },
  {
    className: "text-h4 font-medium",
    name: "H4",
    size: "18px",
    weight: "Medium 500",
    sample: "Yaxınlaşan tədbirlər",
  },
  {
    className: "text-body",
    name: "Body",
    size: "16px",
    weight: "Regular 400",
    sample: "Tələbəlik xatirələri qorunur, əlaqə məzuniyyətdən sonra da davam edir.",
  },
  {
    className: "text-small",
    name: "Small",
    size: "14px",
    weight: "Regular 400",
    sample: "Köməkçi mətn, cədvəl xanaları, ikinci dərəcəli məlumat.",
  },
  {
    className: "text-caption",
    name: "Caption",
    size: "12px",
    weight: "Regular 400",
    sample: "Tarix, etiket, sahə izahı.",
  },
];

// ---------------------------------------------------------------------------
// KUDS §5 — Spacing (4, 8, 12, 16, 24, 32, 48, 64, 96)
// ---------------------------------------------------------------------------

export interface SpacingToken {
  /** Tailwind addımı — `p-4`, `gap-4` və s. */
  step: string;
  px: number;
  /** Nümunə zolağın eni */
  barClassName: string;
  usage: string;
}

export const SPACING_SCALE: SpacingToken[] = [
  { step: "1", px: 4, barClassName: "w-1", usage: "İkon–mətn arası sıx boşluq" },
  { step: "2", px: 8, barClassName: "w-2", usage: "Badge daxili, kiçik gap" },
  { step: "3", px: 12, barClassName: "w-3", usage: "Düymə daxili üfüqi padding" },
  { step: "4", px: 16, barClassName: "w-4", usage: "Standart element aralığı" },
  { step: "6", px: 24, barClassName: "w-6", usage: "Kart padding, kart gap" },
  { step: "8", px: 32, barClassName: "w-8", usage: "Bölmə aralığı, content padding" },
  { step: "12", px: 48, barClassName: "w-12", usage: "Böyük bölmə aralığı" },
  { step: "16", px: 64, barClassName: "w-16", usage: "Səhifə bloku aralığı" },
  { step: "24", px: 96, barClassName: "w-24", usage: "Hero / landing bölməsi" },
];

// ---------------------------------------------------------------------------
// KUDS §6 — Radius
// ---------------------------------------------------------------------------

export interface RadiusToken {
  className: string;
  name: string;
  value: string;
  usage: string;
}

export const RADIUS_SCALE: RadiusToken[] = [
  { className: "rounded-btn", name: "rounded-btn", value: "8px", usage: "Düymələr" },
  { className: "rounded-input", name: "rounded-input", value: "8px", usage: "Input, textarea, select" },
  { className: "rounded-badge", name: "rounded-badge", value: "999px", usage: "Badge, chip, pill" },
  { className: "rounded-card", name: "rounded-card", value: "12px", usage: "Kartlar" },
  { className: "rounded-modal", name: "rounded-modal", value: "16px", usage: "Modal, dialog, sheet" },
  { className: "rounded-avatar", name: "rounded-avatar", value: "50%", usage: "Avatar" },
];

// ---------------------------------------------------------------------------
// KUDS §7 — Kölgələr (ağır kölgə qadağandır)
// ---------------------------------------------------------------------------

export interface ShadowToken {
  className: string;
  name: string;
  value: string;
  usage: string;
}

export const SHADOW_SCALE: ShadowToken[] = [
  {
    className: "shadow-xs-kuds",
    name: "shadow-xs-kuds",
    value: "0 1px 2px rgba(0,0,0,.04)",
    usage: "Input, kiçik səth",
  },
  {
    className: "shadow-sm-kuds",
    name: "shadow-sm-kuds",
    value: "0 2px 6px rgba(0,0,0,.06)",
    usage: "Kart — standart",
  },
  {
    className: "shadow-md-kuds",
    name: "shadow-md-kuds",
    value: "0 8px 20px rgba(0,0,0,.08)",
    usage: "Modal, dropdown, popover",
  },
];
