import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ConsentGate } from "@/features/consent/ConsentGate";
import { Brand } from "./Brand";
import { PublicMobileMenu, PublicNavLinks } from "./PublicNav";
import { SkipLink } from "./SkipLink";
import { FOOTER_NAV } from "./nav";

interface PublicShellProps {
  children: React.ReactNode;
}

/**
 * Giriş etməmiş ziyarətçilər üçün karkas: üst header + footer, sidebar yoxdur.
 * Welcome Page, fakültələr, Xankəndi bələdçisi, açıq tədbirlər və auth
 * səhifələri bunu işlədir (`src/app/(public)/layout.tsx` — Blok 2).
 *
 * ⚠️ `Toaster` BURADA DA var (`(app)` karkasında artıq vardı): `/accessibility`
 * səhifəsindəki maneə forması server action nəticəsini toast ilə göstərir və
 * ictimai qrupda qab olmasaydı mesaj səssizcə itərdi.
 *
 * ⚠️ `ConsentGate` SERVER komponentidir və kukini serverdə oxuyur — razılıq
 * verilmişsə banner HTML-ə ÜMUMİYYƏTLƏ düşmür (TƏLƏ E).
 */
export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipLink />

      {/* --- Header — KUDS §8: 72px --- */}
      <header className="sticky top-0 z-30 h-header border-b border-border bg-surface">
        <div className="mx-auto flex h-full max-w-content items-center gap-3 px-4 sm:px-6 md:px-8">
          <PublicMobileMenu />

          <Brand className="md:mr-6" />

          <PublicNavLinks />

          <div className="ml-auto flex items-center gap-2">
            {/* KUDS §11: Secondary = outline (filled `variant="secondary"` DEYİL) */}
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link href="/login">Daxil ol</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Qeydiyyat</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-content p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* --- Footer --- */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6 md:px-8">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex flex-col gap-3">
              <Brand />
              <p className="text-small text-text-secondary">
                Tələbəlikdən məzuniyyətə — sinfin bir arada qaldığı yer.
              </p>
            </div>

            {FOOTER_NAV.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <h2 className="text-small font-semibold text-text-primary">
                  {section.title}
                </h2>
                <ul className="flex flex-col gap-2">
                  {/* ⚠️ Açar `href` DEYİL, `label`-dır: Blok 11-ə qədər bir
                      neçə link EYNİ açılış bölməsinə (`/#about`) baxır və
                      `href` açar kimi təkrarlanardı (React dublikat açar
                      xəbərdarlığı). Etiketlər sütun daxilində unikaldır. */}
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-small text-text-secondary transition-colors hover:text-ku-green"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-text-secondary">
              © {new Date().getFullYear()} Qarabağ Universiteti. Bütün hüquqlar qorunur.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              {/* ⚠️ `FOOTER_NAV`-a YAZILMIR — o siyahı ZİYARƏTÇİ naviqasiyasıdır
                  (universitet, tələbələr, Xankəndi). `/docs` isə inteqrasiya
                  sənədidir: auditoriyası fərqlidir və sütun başlığı altında
                  yeri yoxdur. Alt zolaq belə "meta" linklərin adi yeridir. */}
              {/* ⚠️ `py-1`: `text-caption` sətri 18px-dir və toxunma hədəfi
                  24px minimumundan aşağı qalırdı (Blok 12C ölçüsü). */}
              <Link
                href="/docs"
                className="inline-block py-1 text-caption text-text-secondary transition-colors hover:text-ku-green"
              >
                API sənədləri
              </Link>
              <p className="text-caption text-text-secondary">Xankəndi, Azərbaycan</p>
            </div>
          </div>
        </div>
      </footer>

      <ConsentGate />
      <Toaster position="bottom-right" />
    </div>
  );
}
