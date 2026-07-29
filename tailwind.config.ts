// ============================================================================
// KUDS v1.0 — Tailwind konfiqurasiyası
// Qarabağ Universiteti Digital Design System
//
// ⚠️ TAILWIND v3 ÜÇÜNDÜR. Layihəni qurarkən `tailwindcss@^3.4` pinləndiyinə
//    əmin ol (PLAN.md §8). Tailwind v4-də `tailwind.config.ts` yoxdur —
//    konfiqurasiya CSS-də `@theme` bloku ilə edilir və bu fayl işləməz.
//
// Bu fayl layihə kökündəki tailwind.config.ts-i ƏVƏZ EDİR.
// ============================================================================

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // Dark mode KUDS v1.0-ın əhatəsində deyil — qəsdən aktivləşdirilməyib.
  // `dark:` variantları işlətmə; brend kitabçasında dark palitra yoxdur.
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/layouts/**/*.{ts,tsx}",
  ],
  theme: {
    // --- KUDS §9: Responsive Breakpoints ---
    screens: {
      sm: "768px",   // Tablet    768-1023
      md: "1024px",  // Laptop    1024-1279
      lg: "1280px",  // Desktop   1280-1535
      xl: "1536px",  // Large     1536+
    },

    extend: {
      // --- KUDS §5: Spacing System ---
      // ⚠️ VACİB: Tailwind-in default spacing şkalasını ƏVƏZ ETMİRİK, ona
      // ƏLAVƏ edirik. Səbəb: shadcn/ui primitivləri öz mənbəyində `h-9`,
      // `h-10`, `py-1.5`, `px-2.5`, `gap-1.5`, `size-3.5` işlədir. Şkalanı
      // əvəz etsək o siniflər boşa çıxır və düymələr/inputlar hündürlüyünü
      // itirir — halbuki CLAUDE.md `ui/` fayllarını dəyişməyi qadağan edir.
      //
      // KUDS məhdudiyyəti (4, 8, 12, 16, 24, 32, 48, 64, 96 px = Tailwind
      // 1, 2, 3, 4, 6, 8, 12, 16, 24) ÖZ kodumuzda intizamla saxlanılır və
      // Blok 12-dəki grep auditi ilə yoxlanılır. shadcn daxili istisnadır.
      spacing: {
        sidebar: "280px", // KUDS §8
        header: "72px",   // KUDS §8
        content: "1440px",
      },

      // --- KUDS §3: Brand Identity ---
      colors: {
        ku: {
          green: "#44766C",  // Primary — ağ mətnlə kontrast 5.18:1 ✅
          dark: "#16423C",
          soft: "#D3E8BF",   // YALNIZ fon
          blue: "#CAEAF1",   // YALNIZ fon
          cream: "#F0F3BF",  // YALNIZ fon (müvəqqəti "accent/gold")
        },
        surface: "#FFFFFF",
        // Diqqət: emitə olunan siniflər `text-text-primary` /
        // `text-text-secondary`-dir (prefiks + açar). `text-secondary`
        // YAZMA — o, `secondary` rənginə düşür.
        "text-primary": "#1E293B",
        "text-secondary": "#64748B", // #F8FAFC üzərində 4.55:1 — 14px+ işlət

        // Semantik rənglər.
        // KUDS §3-dəki dəyərlər fon/ikon/böyük mətn üçün nəzərdə tutulub.
        // Ağ mətn ALTINDA istifadə üçün `-strong` variantları əlavə edilib,
        // çünki KUDS §2 minimum 4.5:1 tələb edir və orijinal dəyərlər bunu
        // ödəmir (ölçülüb: white/#10B981 = 2.54:1, white/#EF4444 = 3.76:1,
        // white/#F59E0B = 2.15:1).
        success: {
          DEFAULT: "#10B981",        // fon, ikon, 18px+ mətn
          strong: "#047857",         // ağ mətn üçün — 5.48:1 ✅
        },
        warning: {
          DEFAULT: "#F59E0B",        // fon — üzərində TÜND mətn (6.78:1 ✅)
          strong: "#B45309",         // ağ mətn üçün
        },
        danger: {
          DEFAULT: "#EF4444",        // fon, ikon, 18px+ mətn
          strong: "#B91C1C",         // ağ mətn üçün — 6.47:1 ✅
        },

        // shadcn/ui CSS dəyişənləri (globals.css-də təyin olunur)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },

      // --- KUDS §4: Typography (line-height 150%) ---
      fontFamily: {
        sans: ["var(--font-poppins)", "Tahoma", "sans-serif"],
      },
      fontSize: {
        display: ["40px", { lineHeight: "150%", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "150%", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "150%", fontWeight: "600" }],
        h3: ["20px", { lineHeight: "150%", fontWeight: "600" }],
        h4: ["18px", { lineHeight: "150%", fontWeight: "500" }],
        body: ["16px", { lineHeight: "150%", fontWeight: "400" }],
        small: ["14px", { lineHeight: "150%", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "150%", fontWeight: "400" }],
      },

      // --- KUDS §6: Border Radius ---
      borderRadius: {
        btn: "8px",
        input: "8px",
        card: "12px",
        modal: "16px",
        badge: "999px",
        avatar: "50%", // KUDS §6 — dairəvi avatar
        // shadcn uyğunluğu
        lg: "12px",
        md: "8px",
        sm: "6px",
      },

      // --- KUDS §7: Shadows (ağır kölgə qadağandır) ---
      boxShadow: {
        "xs-kuds": "0 1px 2px rgba(0,0,0,.04)",
        "sm-kuds": "0 2px 6px rgba(0,0,0,.06)",
        "md-kuds": "0 8px 20px rgba(0,0,0,.08)",
      },

      maxWidth: {
        content: "1440px",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  // ⚠️ Asılılıq: npm i -D tailwindcss-animate  (PLAN.md §8-də var)
  plugins: [tailwindcssAnimate],
};

export default config;
