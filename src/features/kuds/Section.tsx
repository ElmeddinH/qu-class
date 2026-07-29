import { cn } from "@/lib/utils";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** /kuds bələdçisində bir bölmə. `scroll-mt-header` sabit header-in altına düşməmək üçün. */
export function Section({ id, title, description, children, className }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-header", className)}>
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-h2 text-text-primary">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-small text-text-secondary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Bölmə daxilində alt başlıq. */
export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-h4 text-text-primary">{children}</h3>;
}

/** Diqqət qeydi — KUDS qaydası və ya tələ. */
export function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-btn border border-warning/40 bg-warning/10 px-3 py-2 text-small text-text-primary">
      {children}
    </p>
  );
}
