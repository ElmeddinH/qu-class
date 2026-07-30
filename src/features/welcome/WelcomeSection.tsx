// ============================================================================
// src/features/welcome/WelcomeSection.tsx
// Açılış bölməsinin ortaq qabığı.
//
// ⚠️ İYERARXİYA: səhifədə TƏK `<h1>` var (Hero) və hər bölmə `<h2>` ilə
// başlayır. Kart başlıqları `<h3>`-dür. Səviyyə atlanmır — ekran oxuyucusu
// bölmələri siyahı kimi gəzə bilir.
//
// ⚠️ `aria-labelledby` başlığın `id`-sinə bağlanır, `aria-label` DEYİL:
// başlıq mətni onsuz da ekrandadır və iki yerdə saxlanılsa ayrıla bilər.
//
// ⚠️ `scroll-mt-24` — yapışqan header (72px) anchor-a keçəndə bölmənin
// başlığını örtməsin (`/#faculties` linki).
// ============================================================================

import { cn } from "@/lib/utils";

interface WelcomeSectionProps {
  /** `<section id>` — naviqasiya anchor-u buna bağlanır. */
  id: string;
  title: string;
  description?: string;
  /** Başlıq zolağının sağında kiçik keçid (məs. "Hamısına bax"). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WelcomeSection({
  id,
  title,
  description,
  aside,
  children,
  className,
}: WelcomeSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-24 flex-col gap-6", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id={headingId} className="text-h2 font-semibold text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-body text-text-secondary">{description}</p>
          ) : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      {children}
    </section>
  );
}
