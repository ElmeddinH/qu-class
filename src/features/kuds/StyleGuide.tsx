import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  BadgesSection,
  ButtonsSection,
  CardsSection,
  FormsSection,
  ModalSection,
  StatesSection,
  TableSection,
} from "./ComponentSections";
import {
  ColorsSection,
  RadiusSection,
  ShadowSection,
  SpacingSection,
  TypographySection,
} from "./FoundationSections";

const TOC = [
  { href: "#colors", label: "Rənglər" },
  { href: "#typography", label: "Tipoqrafiya" },
  { href: "#spacing", label: "Boşluq" },
  { href: "#radius", label: "Radius" },
  { href: "#shadows", label: "Kölgələr" },
  { href: "#buttons", label: "Düymələr" },
  { href: "#cards", label: "Kartlar" },
  { href: "#forms", label: "Formalar" },
  { href: "#badges", label: "Badge / Avatar" },
  { href: "#modal", label: "Modal" },
  { href: "#table", label: "Cədvəl" },
  { href: "#states", label: "Boş vəziyyət" },
];

/**
 * KUDS v1.0 daxili stil bələdçisi (`/kuds`).
 *
 * Məqsəd: sonrakı bloklarda komponent BURADAN kopyalanır — belədə dizayn
 * blokdan-bloka dağılmır. Səhifə həm də KUDS-un canlı sənədidir.
 */
export function StyleGuide() {
  return (
    <div className="flex flex-col gap-16">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display font-bold text-text-primary">KUDS v1.0</h1>
          <Badge className="rounded-badge">Daxili stil bələdçisi</Badge>
        </div>
        <p className="max-w-2xl text-body text-text-secondary">
          Qarabağ Universiteti Digital Design System — QU CLASS-da işlədilən bütün
          token və komponentlərin canlı nümunəsi. Yeni ekran qurarkən komponenti
          buradan götür; hardcode rəng, ölçü və ya kölgə yazma.
        </p>
        <p className="max-w-2xl text-small text-text-secondary">
          Bu səhifənin özü <code>AppShell</code> içindədir — soldakı 280px sidebar və
          72px header KUDS §8 karkasının canlı nümunəsidir. Ekranı daraltsan sidebar
          Sheet-ə çevrilir. Tab düyməsi ilə «Əsas məzmuna keç» linkini yoxlaya bilərsən.
        </p>

        <nav aria-label="Bölmələr" className="flex flex-wrap gap-2">
          {TOC.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-badge border border-border bg-surface px-3 py-1 text-caption text-text-secondary transition-colors hover:border-ku-green hover:text-ku-green"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <ColorsSection />
      <TypographySection />
      <SpacingSection />
      <RadiusSection />
      <ShadowSection />
      <ButtonsSection />
      <CardsSection />
      <FormsSection />
      <BadgesSection />
      <ModalSection />
      <TableSection />
      <StatesSection />

      <footer className="border-t border-border pt-6 text-caption text-text-secondary">
        KUDS v1.0 · Tailwind konfiqurasiyası: <code>tailwind.config.ts</code> ·
        Tokenlər: <code>src/app/globals.css</code> · Qaydalar: <code>CLAUDE.md</code>
      </footer>
    </div>
  );
}
