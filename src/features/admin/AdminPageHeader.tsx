// ============================================================================
// src/features/admin/AdminPageHeader.tsx
// Admin səhifələrinin ortaq başlığı — `<h1>` + izah + sağ tərəfdə əməliyyatlar.
//
// ⚠️ `<h1>` MƏCBURİDİR: `CardTitle` `<div>` render edir (shadcn primitivi,
// toxunulmazdır — T22), yəni səhifə başlığını kartın içindən götürsək
// sənəddə heç bir birinci səviyyə başlıq qalmaz (WCAG 1.3.1).
// ============================================================================

interface AdminPageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function AdminPageHeader({ title, description, children }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">{title}</h1>
        <p className="text-body text-text-secondary">{description}</p>
      </div>

      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
