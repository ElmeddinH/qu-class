// ============================================================================
// src/features/admin/AdminUserFilters.tsx
// İstifadəçi cədvəlinin axtarış + filtr paneli — SERVER komponenti.
//
// ⚠️ ADİ `<form method="get">` İŞLƏDİLİR, client vəziyyəti YOXDUR:
//   · `(admin)` qrupunda `NuqsAdapter` yoxdur (T18 — `Providers` yalnız
//     `(app)`-dədir), yəni `useQueryState` burada işləməzdi;
//   · GET forması JS olmadan da işləyir və nəticə paylaşıla bilən URL verir.
//
// ⚠️ `sort` GİZLİ SAHƏ kimi saxlanılır: filtr göndəriləndə cari sıralama
// itməməlidir (istifadəçi «e-poçt sırası + admin filtri» gözləyir).
// ⚠️ `page` SAXLANILMIR — yeni filtr həmişə 1-ci səhifədən başlayır.
// ============================================================================

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADMIN_USER_PARAMS,
  DEFAULT_ADMIN_USER_SORT,
  type AdminUserFilterState,
} from "@/lib/admin-filters";
import { SYSTEM_ROLE_VALUES, USER_STAGE_VALUES } from "@/lib/enums";
import { stageLabel, systemRoleLabel } from "@/lib/labels";

interface AdminUserFiltersProps {
  filters: AdminUserFilterState;
  cohorts: Array<{ slug: string; displayName: string; count: number }>;
}

/** Native `<select>` — KUDS input radiusu ilə. */
function SelectField({
  id,
  name,
  label,
  value,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-caption text-text-secondary">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ku-green"
      >
        {children}
      </select>
    </div>
  );
}

export function AdminUserFilters({ filters, cohorts }: AdminUserFiltersProps) {
  return (
    <form
      method="get"
      action="/admin/users"
      aria-label="İstifadəçi filtrləri"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <input
        type="hidden"
        name={ADMIN_USER_PARAMS.sort}
        value={filters.sort === DEFAULT_ADMIN_USER_SORT ? "" : filters.sort}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="admin-user-search"
            className="text-caption text-text-secondary"
          >
            Ad və ya e-poçt
          </Label>
          <Input
            id="admin-user-search"
            name={ADMIN_USER_PARAMS.q}
            defaultValue={filters.q ?? ""}
            placeholder="Aysel, aysel@qu.edu.az…"
            className="rounded-input"
          />
        </div>

        <SelectField
          id="admin-user-role"
          name={ADMIN_USER_PARAMS.role}
          label="Sistem rolu"
          value={filters.role ?? ""}
        >
          <option value="">Hamısı</option>
          {SYSTEM_ROLE_VALUES.map((role) => (
            <option key={role} value={role}>
              {systemRoleLabel(role)}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="admin-user-stage"
          name={ADMIN_USER_PARAMS.stage}
          label="Mərhələ"
          value={filters.stage ?? ""}
        >
          <option value="">Hamısı</option>
          {USER_STAGE_VALUES.map((stage) => (
            <option key={stage} value={stage}>
              {stageLabel(stage)}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="admin-user-cohort"
          name={ADMIN_USER_PARAMS.cohort}
          label="Sinif"
          value={filters.cohort ?? ""}
        >
          <option value="">Hamısı</option>
          {cohorts.map((cohort) => (
            <option key={cohort.slug} value={cohort.slug}>
              {cohort.displayName} ({cohort.count})
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          Filtrlə
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">Sıfırla</Link>
        </Button>
      </div>
    </form>
  );
}
