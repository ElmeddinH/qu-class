import type { Metadata } from "next";

import { AdminUserTable } from "@/features/admin/AdminUserTable";
import { parseAdminUserParams } from "@/lib/admin-filters";

export const metadata: Metadata = {
  title: "İstifadəçilər",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminUserParams(await searchParams);
  return <AdminUserTable filters={filters} />;
}
