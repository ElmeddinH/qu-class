import type { Metadata } from "next";

import { ReportQueue } from "@/features/admin/ReportQueue";
import { parseModerationParams } from "@/lib/admin-filters";

export const metadata: Metadata = {
  title: "Şikayət növbəsi",
};

export const dynamic = "force-dynamic";

/**
 * `/admin/moderation` — şikayət növbəsi.
 *
 * 🔴 TƏLƏ A: səhifə məzmun OXUMUR. `ReportQueue` yalnız şikayət sətirlərini
 * gətirir; şikayət olunan mətn «Moderasiya baxışı» server action-ından keçir
 * və o, AuditLog yazmadan məzmunu açmır.
 */
export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseModerationParams(await searchParams);
  return <ReportQueue filters={filters} />;
}
