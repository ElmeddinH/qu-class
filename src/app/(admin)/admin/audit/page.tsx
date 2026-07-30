import type { Metadata } from "next";

import { AuditTable } from "@/features/admin/AuditTable";
import { parseAuditParams } from "@/lib/admin-filters";

export const metadata: Metadata = {
  title: "Audit jurnalı",
};

export const dynamic = "force-dynamic";

/**
 * `/admin/audit` — YALNIZ OXU (TƏLƏ D).
 *
 * Bu qovluqda `route.ts` və ya server action YOXDUR: jurnalı dəyişən heç bir
 * yol mövcud deyil. Qadağa servisdə (`audit.service.ts` silmə/redaktə ixrac
 * etmir) və API-də (`/api/v1/admin/audit` yalnız `GET`) də təkrarlanır.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAuditParams(await searchParams);
  return <AuditTable filters={filters} />;
}
