import { cn } from "@/lib/utils";
import { Caveat, Section, SubHeading } from "./Section";
import {
  BRAND_COLORS,
  RADIUS_SCALE,
  SEMANTIC_COLORS,
  SHADOW_SCALE,
  SPACING_SCALE,
  SURFACE_COLORS,
  TYPE_SCALE,
  type ColorToken,
} from "./tokens";

/** WCAG AA: normal mətn 4.5:1 · böyük mətn (18px+) 3:1. */
function contrastVerdict(ratio: number) {
  if (ratio >= 4.5) return { mark: "✅", label: "AA" };
  if (ratio >= 3) return { mark: "◐", label: "yalnız 18px+" };
  return { mark: "❌", label: "keçmir" };
}

function Swatch({ token }: { token: ColorToken }) {
  const white = contrastVerdict(token.onWhite);
  const dark = contrastVerdict(token.onDark);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-xs-kuds">
      {/* Fon = token-in özü. İçindəki iki sətir ağ və tünd mətnin kontrastını göstərir. */}
      <div className={cn("flex h-24 flex-col justify-between p-3", token.className)}>
        <span className="text-caption text-white">
          Ağ mətn · {token.onWhite.toFixed(2)}:1 {white.mark}
        </span>
        <span className="text-caption text-text-primary">
          Tünd mətn · {token.onDark.toFixed(2)}:1 {dark.mark}
        </span>
      </div>

      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <code className="text-small font-medium text-text-primary">{token.name}</code>
          <span className="text-caption uppercase text-text-secondary">{token.hex}</span>
        </div>
        <p className="text-caption text-text-secondary">{token.usage}</p>
        {token.note ? (
          <p className="text-caption text-warning-strong">⚠ {token.note}</p>
        ) : null}
      </div>
    </div>
  );
}

function ColorGrid({ tokens }: { tokens: ColorToken[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {tokens.map((token) => (
        <Swatch key={token.name} token={token} />
      ))}
    </div>
  );
}

export function ColorsSection() {
  return (
    <Section
      id="colors"
      title="Rənglər"
      description="KUDS §3. Hər nümunənin üstündə həmin rəng fon olduqda ağ və tünd mətnin ölçülmüş kontrast nisbəti göstərilir (WCAG 2.1)."
    >
      <div className="flex flex-col gap-8">
        <div>
          <SubHeading>Brend</SubHeading>
          <ColorGrid tokens={BRAND_COLORS} />
        </div>

        <div>
          <SubHeading>Səth və mətn</SubHeading>
          <ColorGrid tokens={SURFACE_COLORS} />
        </div>

        <div>
          <SubHeading>Semantik</SubHeading>
          <ColorGrid tokens={SEMANTIC_COLORS} />
        </div>

        <Caveat>
          <strong>text-secondary yazma.</strong> Emitə olunan sinif{" "}
          <code>text-text-secondary</code>-dir. <code>text-secondary</code> Tailwind-də{" "}
          <code>secondary</code> <em>rənginə</em> düşür — tamam başqa şey. Eyni məntiq{" "}
          <code>text-text-primary</code> üçün də keçərlidir.
        </Caveat>
      </div>
    </Section>
  );
}

export function TypographySection() {
  return (
    <Section
      id="typography"
      title="Tipoqrafiya"
      description="KUDS §4. Poppins, fallback Tahoma, bütün səviyyələrdə line-height 150%."
    >
      <div className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface shadow-xs-kuds">
        {TYPE_SCALE.map((level) => (
          <div
            key={level.name}
            className="flex flex-col gap-2 p-6 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <div className="flex shrink-0 flex-col sm:w-1/4">
              <code className="text-small font-medium text-text-primary">
                {level.className}
              </code>
              <span className="text-caption text-text-secondary">
                {level.name} · {level.size} · {level.weight}
              </span>
            </div>
            <p className={cn("min-w-0 text-text-primary", level.className)}>
              {level.sample}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function SpacingSection() {
  return (
    <Section
      id="spacing"
      title="Boşluq şkalası"
      description="KUDS §5. İcazə verilən dəyərlər: 4, 8, 12, 16, 24, 32, 48, 64, 96 px. Aralıq addımlar (p-5, gap-7, mt-9) işlədilmir."
    >
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-xs-kuds">
        {SPACING_SCALE.map((space) => (
          <div key={space.step} className="flex items-center gap-4">
            <code className="w-12 shrink-0 text-small text-text-primary">
              {space.step}
            </code>
            <span className="w-16 shrink-0 text-caption text-text-secondary">
              {space.px}px
            </span>
            <div
              className={cn("h-4 shrink-0 rounded-btn bg-ku-green", space.barClassName)}
            />
            <span className="min-w-0 truncate text-caption text-text-secondary">
              {space.usage}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Caveat>
          Tailwind-in default şkalası <strong>əvəz edilməyib</strong> — shadcn primitivləri{" "}
          <code>h-9</code>, <code>py-1.5</code>, <code>size-3.5</code> işlədir və şkalanı
          kəssək dağılırlar. Yəni Tailwind səni dayandırmayacaq; intizam bizim
          üzərimizdədir (Blok 12-də grep auditi).
        </Caveat>
      </div>
    </Section>
  );
}

export function RadiusSection() {
  return (
    <Section id="radius" title="Radius" description="KUDS §6.">
      <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {RADIUS_SCALE.map((radius) => (
          <div key={radius.name} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center border border-border bg-ku-soft",
                radius.className,
              )}
            >
              <span className="text-caption text-ku-dark">{radius.value}</span>
            </div>
            <code className="text-caption text-text-primary">{radius.name}</code>
            <span className="text-center text-caption text-text-secondary">
              {radius.usage}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ShadowSection() {
  return (
    <Section
      id="shadows"
      title="Kölgələr"
      description="KUDS §7. Ağır kölgə qadağandır — yalnız bu üç səviyyə."
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {SHADOW_SCALE.map((shadow) => (
          <div
            key={shadow.name}
            className={cn(
              "flex flex-col gap-1 rounded-card border border-border bg-surface p-6",
              shadow.className,
            )}
          >
            <code className="text-small font-medium text-text-primary">{shadow.name}</code>
            <span className="text-caption text-text-secondary">{shadow.value}</span>
            <span className="text-caption text-text-secondary">{shadow.usage}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
