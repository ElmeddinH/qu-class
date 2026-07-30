// ============================================================================
// src/features/admin/AdminUserTable.tsx
// `/admin/users` — istifadəçi və rol idarəsi (spec §17, KUDS §14).
//
// KUDS §14 cədvəl tələbləri: sorting · filtering · pagination · search ·
// export · responsive. Altısı da var; hamısı URL vəziyyətindədir, yəni
// «3-cü səhifə + admin filtri + e-poçt sırası» paylaşıla bilən ünvandır.
//
// ⚠️ RESPONSIVE: mobil ekranda cədvəl KART siyahısına çevrilir (`md:` sərhədi).
// `<table>`-ı üfüqi sürüşdürmə ilə saxlamaq telefonda oxunmur.
//
// 🔴 CSV EXPORT `redactProfile`-DAN KEÇİR — «Şəhər» sütunu istifadəçinin
// görünürlük seçimindən asılıdır və `phone` / `personalEmail` ÜMUMİYYƏTLƏ
// sorğulanmır (bax `services/admin-users.service.ts`).
// ============================================================================

import Link from "next/link";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { Badge } from "@/components/ui/badge";
import {
  ADMIN_USER_PAGE_SIZE,
  adminPageCount,
  adminSkipOf,
  adminUsersHref,
  type AdminUserFilterState,
} from "@/lib/admin-filters";
import { getViewer } from "@/lib/auth";
import { cohortRoleLabel, stageLabel, systemRoleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  listAdminCohortOptions,
  listAdminUsers,
  type AdminUserRow,
} from "@/services/admin-users.service";
import { shortDate } from "@/utils/date";

import { AdminPageHeader } from "./AdminPageHeader";
import { AdminUserFilters } from "./AdminUserFilters";
import { UserExportButton } from "./UserExportButton";
import { UserRowActions } from "./UserRowActions";

interface AdminUserTableProps {
  filters: AdminUserFilterState;
}

export async function AdminUserTable({ filters }: AdminUserTableProps) {
  const viewer = await getViewer();
  const skip = adminSkipOf(filters.page, ADMIN_USER_PAGE_SIZE);

  const [page, cohorts] = await Promise.all([
    listAdminUsers(viewer, filters, ADMIN_USER_PAGE_SIZE, skip),
    listAdminCohortOptions(viewer),
  ]);

  const pageCount = adminPageCount(page.total, ADMIN_USER_PAGE_SIZE);
  const actorId = viewer.kind === "USER" ? viewer.userId : "";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="İstifadəçilər"
        description="Rol dəyişikliyi audit jurnalına yazılır və istifadəçiyə bildiriş göndərilir. Hesab SİLİNMİR — deaktiv edilir, çünki silmə onun bütün paylaşımlarını və sinif xatirələrini aparardı."
      >
        <UserExportButton filters={filters} />
      </AdminPageHeader>

      {/* 🔴 TƏLƏ B izahı — istifadəçiyə də, admin-ə də görünən yerdə. */}
      <p className="rounded-card border border-warning bg-warning/10 p-4 text-small text-text-primary">
        <strong>Sessiya qeydi:</strong> sistem rolu sessiya token-inin içindədir
        (JWT — `Session` cədvəli yoxdur). Rolu endirilmiş istifadəçinin brauzerində
        köhnə token qala bilər, ona görə dəyişiklik{" "}
        <strong>növbəti girişdə tam qüvvəyə minir</strong>. Server tərəfdəki qapı
        isə hər sorğuda bazadan oxuyur — köhnə token admin səhifəsini{" "}
        <strong>aça bilmir</strong>.
      </p>

      <AdminUserFilters filters={filters} cohorts={cohorts} />

      {page.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nəticə yoxdur"
          description="Axtarış və filtrlərə uyğun istifadəçi tapılmadı."
          action={{ href: "/admin/users", label: "Filtrləri sıfırla" }}
        />
      ) : (
        <>
          <p className="text-small text-text-secondary">
            {page.total} istifadəçi · səhifə {Math.min(filters.page, pageCount)} /{" "}
            {pageCount}
          </p>

          {/* --- Masaüstü: cədvəl --- */}
          <div className="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
            <table className="w-full text-small">
              <caption className="sr-only">İstifadəçi siyahısı</caption>
              <thead className="border-b border-border bg-background">
                <tr className="text-left">
                  <SortableHeader
                    label="Ad"
                    sort="name"
                    filters={filters}
                    className="pl-6"
                  />
                  <SortableHeader label="E-poçt" sort="email" filters={filters} />
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sinif
                  </th>
                  <SortableHeader label="Mərhələ" sort="stage" filters={filters} />
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sistem rolu
                  </th>
                  <SortableHeader label="Qeydiyyat" sort="recent" filters={filters} />
                  <th scope="col" className="px-4 py-3 pr-6 font-medium">
                    Əməliyyat
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 align-top">
                    <th scope="row" className="px-4 py-3 pl-6 text-left font-normal">
                      <Link
                        href={`/u/${user.id}`}
                        className="text-text-primary hover:underline"
                      >
                        {user.firstName} {user.lastName}
                      </Link>
                      {user.deactivatedAt === null ? null : (
                        <Badge variant="outline" className="ml-2 font-normal">
                          Deaktiv
                        </Badge>
                      )}
                    </th>
                    <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.cohorts[0]?.displayName ?? "—"}
                      {user.cohorts[0] === undefined ? null : (
                        <span className="block text-caption">
                          {cohortRoleLabel(user.cohorts[0].role)}
                        </span>
                      )}
                      {/* İkinci dərəcəli üzvlüklər gizlədilmir — «İdarə et»
                          panelində hər biri üçün ayrıca rol seçicisi var. */}
                      {user.cohorts.length > 1 ? (
                        <span className="block text-caption text-text-secondary">
                          +{user.cohorts.length - 1} digər sinif
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.cohorts[0] === undefined
                        ? "—"
                        : stageLabel(user.cohorts[0].stage)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {systemRoleLabel(user.systemRole)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {shortDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 pr-6">
                      <UserRowActions user={toActionProps(user)} actorId={actorId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Mobil: kartlar --- */}
          <ul className="flex flex-col gap-4 md:hidden">
            {page.items.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/u/${user.id}`}
                    className="text-h4 font-medium text-text-primary"
                  >
                    {user.firstName} {user.lastName}
                  </Link>
                  <span className="text-caption text-text-secondary">{user.email}</span>
                  <span className="text-caption text-text-secondary">
                    {user.cohorts[0]?.displayName ?? "Sinifsiz"} ·{" "}
                    {systemRoleLabel(user.systemRole)}
                  </span>
                </div>
                <UserRowActions user={toActionProps(user)} actorId={actorId} />
              </li>
            ))}
          </ul>

          <PagerNav
            page={filters.page}
            pageCount={pageCount}
            hrefFor={(page) => adminUsersHref({ ...filters, page })}
            label="İstifadəçi səhifələri"
          />
        </>
      )}
    </div>
  );
}

/** Client komponentinə YALNIZ lazım olan sahələr ötürülür (serialləşən data). */
function toActionProps(user: AdminUserRow) {
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    systemRole: user.systemRole,
    deactivated: user.deactivatedAt !== null,
    // ⚠️ BÜTÜN üzvlüklər ötürülür, yalnız birincisi yox — `UserRowActions`
    // hər sinif üçün ayrıca rol seçicisi göstərir (Blok 12B).
    cohorts: user.cohorts.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      role: c.role,
      isPrimary: c.isPrimary,
    })),
  };
}

/**
 * Çeşidləmə başlığı — `<Link>`, düymə deyil.
 * ⚠️ Səhifə 1-ə qayıdır: 4-cü səhifədə sıra dəyişsə istifadəçi tamam başqa
 * sətirlərə düşərdi.
 */
function SortableHeader({
  label,
  sort,
  filters,
  className,
}: {
  label: string;
  sort: AdminUserFilterState["sort"];
  filters: AdminUserFilterState;
  className?: string;
}) {
  const active = filters.sort === sort;

  return (
    <th scope="col" className={cn("px-4 py-3 font-medium", className)}>
      <Link
        href={adminUsersHref({ ...filters, sort, page: 1 })}
        aria-current={active ? "true" : undefined}
        className={cn(
          "hover:underline",
          active ? "text-ku-green" : "text-text-primary",
        )}
      >
        {label}
        {active ? " ↓" : ""}
      </Link>
    </th>
  );
}
