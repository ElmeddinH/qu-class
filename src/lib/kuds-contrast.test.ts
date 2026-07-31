// ============================================================================
// src/lib/kuds-contrast.test.ts
// Blok 12C · A bəndi (3-cü yoxlama) — KUDS KONTRAST QAYDALARININ MƏNBƏ SKANI.
//
// 🔴 FAYLIN SUALI: hansısa komponentdə ağ mətn KİFAYƏT QƏDƏR TÜND OLMAYAN
// KUDS fonunun üzərinə yazılıbmı?
//
// NİYƏ axe KİFAYƏT DEYİL: axe yalnız RENDER OLUNAN səthi ölçür. Şərti budaq
// (`isEmergency ? … : …`), yalnız admin görən ekran və ya seed-də təsadüfən boş
// qalan siyahı skan zamanı DOM-a düşmür — pozuntu isə kodda qalır və ilk real
// məlumatla üzə çıxır. Mənbə skanı bütün budaqları görür.
//
// ÖLÇÜLƏN QAYDALAR (CLAUDE.md → «KUDS dizayn tokenləri» cədvəli):
//   1. `ku-soft` (#D3E8BF) · `ku-blue` (#CAEAF1) · `ku-cream` (#F0F3BF)
//      YALNIZ fondur — üzərində ağ mətn HEÇ VAXT (kontrast ≈ 1.2–1.4:1).
//   2. Doldurulmuş `success` (#10B981 · 2.54:1) və `danger` (#EF4444 · 3.76:1)
//      fonunda ağ mətn OLMAZ → `-strong` variantı işlədilməlidir.
//   3. `warning` (#F59E0B) fonunda ağ mətn 2.15:1-dir → tünd mətn məcburidir.
//
// 🔴 SKAN VAHİDİ = BİR SƏTİR-LİTERALI, fayl deyil. Səbəb: layihədə
// `emergency ? "bg-danger-strong text-white" : "bg-ku-cream text-text-primary"`
// kimi TERNARLAR var. Fayl səviyyəsində axtarış onları YALANÇI POZUNTU kimi
// bildirərdi; hər sətir-literalı ayrıca yoxlananda isə hər budağın öz fon+mətn
// cütü düzgün qiymətləndirilir.
//
// ⚠️ İSTİSNALAR (aşağıda `EXCLUDED`):
//   · `src/components/ui/` — shadcn primitivləri, TOXUNULMAZ (CLAUDE.md §1)
//   · `src/features/kuds/` — stil bələdçisi; qaydanı İZAH etmək üçün
//     nümunələri qəsdən göstərir
// ⚠️ Test heç nə render etmir və bazaya toxunmur — yalnız mətn oxuyur.
// ============================================================================

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = resolve(process.cwd(), "src");

const EXCLUDED = ["src/components/ui/", "src/features/kuds/"];

/** Ağ mətnə İCAZƏ VERMƏYƏN fon sinifləri. */
const FORBIDDEN_WITH_WHITE = [
  // 1-ci qayda — yalnız-fon KUDS rəngləri
  "bg-ku-soft",
  "bg-ku-blue",
  "bg-ku-cream",
  // 2-ci və 3-cü qayda — `-strong` OLMAYAN status rəngləri
  "bg-success",
  "bg-danger",
  "bg-warning",
];

/** `text-white`, `text-white/90`, `text-surface` — ağ mətnin bütün formaları. */
const WHITE_TEXT = /\btext-(white|surface)(\/\d+)?\b/;

/**
 * Fon sinfi sətirdə HƏQİQƏTƏN varmı.
 *
 * ⚠️ `bg-danger-strong` `bg-danger` ilə BAŞLAYIR — sadə `includes()` onu
 * yalançı pozuntu kimi tutardı. Ona görə sinif adından sonra yalnız sinif
 * sərhədi (boşluq, dırnaq, sətir sonu) və ya şəffaflıq şəkilçisi (`/20`)
 * gələ bilər; `-strong` gəlirsə uyğunluq sayılmır.
 */
function hasBackground(literal: string, background: string): boolean {
  const pattern = new RegExp(`(^|[\\s"'\`])${background}(\\/\\d+)?($|[\\s"'\`])`);
  return pattern.test(literal);
}

/** Fayldakı bütün sətir-literallarını (", ', `) qaytarır. */
function stringLiterals(source: string): string[] {
  return [
    ...(source.match(/"[^"\n]*"/g) ?? []),
    ...(source.match(/'[^'\n]*'/g) ?? []),
    ...(source.match(/`[^`]*`/g) ?? []),
  ];
}

function tsxFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...tsxFiles(full));
      continue;
    }

    if (entry.name.endsWith(".tsx")) found.push(full);
  }

  return found;
}

interface Violation {
  file: string;
  background: string;
  literal: string;
}

function scan(): Violation[] {
  const violations: Violation[] = [];

  for (const file of tsxFiles(SRC_ROOT)) {
    const relativePath = relative(process.cwd(), file).replaceAll("\\", "/");
    if (EXCLUDED.some((prefix) => relativePath.startsWith(prefix))) continue;

    const source = readFileSync(file, "utf8");

    for (const literal of stringLiterals(source)) {
      if (!WHITE_TEXT.test(literal)) continue;

      for (const background of FORBIDDEN_WITH_WHITE) {
        if (hasBackground(literal, background)) {
          violations.push({ file: relativePath, background, literal });
        }
      }
    }
  }

  return violations;
}

describe("KUDS kontrast qaydaları (mənbə skanı)", () => {
  it("ku-soft / ku-blue / ku-cream fonunda ağ mətn YOXDUR", () => {
    const violations = scan().filter((entry) => entry.background.startsWith("bg-ku-"));

    expect(
      violations,
      violations
        .map((v) => `${v.file}: ${v.background} + ağ mətn → ${v.literal}`)
        .join("\n"),
    ).toEqual([]);
  });

  it("doldurulmuş success / danger / warning fonunda ağ mətn YOXDUR (-strong tələb olunur)", () => {
    const violations = scan().filter((entry) => !entry.background.startsWith("bg-ku-"));

    expect(
      violations,
      violations
        .map((v) => `${v.file}: ${v.background} + ağ mətn → ${v.literal}`)
        .join("\n"),
    ).toEqual([]);
  });

  it("skanerin özü işləyir — süni pozuntu tutulur (0 nəticə «skaner sınıqdır» demək olmasın)", () => {
    // 🔴 ÖZ-YOXLAMA. «Sıfır tapıntı» iki mənalıdır: ya kod təmizdir, ya da
    // skaner heç nə tapmır. İkincisi daha təhlükəlidir, çünki YAŞIL görünür
    // (Blok 11C-nin `git:audit --self-test` dərsi ilə eyni məntiq).
    const fixtures = [
      '"rounded-badge bg-ku-cream px-2 text-white"',
      '"bg-danger px-3 py-1 text-white"',
      '"bg-warning text-white/90"',
    ];

    for (const fixture of fixtures) {
      expect(WHITE_TEXT.test(fixture), fixture).toBe(true);
      expect(
        FORBIDDEN_WITH_WHITE.some((background) => hasBackground(fixture, background)),
        fixture,
      ).toBe(true);
    }

    // Ağ siyahı süni pozuntuları UDMAMALIDIR, amma DÜZGÜN cütləri tutmamalıdır.
    const legitimate = [
      '"bg-danger-strong text-white"',
      '"bg-success-strong text-white"',
      '"bg-ku-cream text-text-primary"',
      '"bg-warning/20 text-text-primary"',
    ];

    for (const sample of legitimate) {
      const flagged =
        WHITE_TEXT.test(sample) &&
        FORBIDDEN_WITH_WHITE.some((background) => hasBackground(sample, background));
      expect(flagged, sample).toBe(false);
    }
  });
});
