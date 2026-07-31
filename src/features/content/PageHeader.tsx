// ============================================================================
// src/features/content/PageHeader.tsx
// İctimai səhifələrin ortaq başlıq zolağı.
//
// ⚠️ SƏHİFƏNİN YEGANƏ `<h1>`-i BURADADIR. Açılış səhifəsində `<h1>` hero-dadır
// (`WelcomeHero`), qalan bütün ictimai səhifələr isə bu komponentdən keçir —
// yəni "bir səhifə, bir h1" qaydası tək yerdə saxlanılır (WCAG 1.3.1,
// `landing.spec.ts` və `public.spec.ts` onu ölçür).
//
// ⚠️ `eyebrow` (bölmə adı) `<p>`-dir, `<h2>` DEYİL: o, başlığın ÜSTÜNDƏ görünən
// kontekst etiketidir və heading iyerarxiyasına daxil olsaydı səviyyə h2 → h1
// ardıcıllığı tərsinə çıxardı.
// ============================================================================

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  href: string;
  label: string;
}

interface PageHeaderProps {
  /** Başlığın üstündəki kiçik kontekst etiketi (bölmə adı). */
  eyebrow?: string;
  title: string;
  description?: string;
  /** «Ana səhifə › Universitet» zənciri — `null` olarsa göstərilmir. */
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Səhifə yolu">
          <ol className="flex flex-wrap items-center gap-1 text-caption text-text-secondary">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                ) : null}
                <Link
                  // ⚠️ `py-1` — mətn hündürlüyü 18px-dir və toxunma hədəfi
                  // WCAG 2.2 AA-nın 24px minimumuna çatmır. Şaquli boşluq
                  // düzülüşü pozmur (sətir `items-center` ilə mərkəzlənib).
                  href={crumb.href}
                  className="inline-block py-1 transition-colors hover:text-ku-green"
                >
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-caption font-medium uppercase tracking-wide text-ku-green">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-h1 font-bold text-text-primary">{title}</h1>

        {description ? (
          <p className="max-w-3xl text-body text-text-secondary">{description}</p>
        ) : null}
      </div>

      {children}
    </header>
  );
}
