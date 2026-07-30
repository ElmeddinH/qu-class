import type { Metadata } from "next";

import { AdminStatsPanel } from "@/features/admin/AdminStatsPanel";
import { parseMapParams } from "@/lib/map-filters";

export const metadata: Metadata = {
  title: "Analitika",
};

export const dynamic = "force-dynamic";

/**
 * `/admin/stats` — universitet miqyaslı «İndi haradayıq?» paneli.
 *
 * Blok 10B-nin qalan borcu: servis cohort verilmədən onsuz da universitet
 * miqyasında işləyirdi, UI-ı isə yox idi.
 */
export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseMapParams(await searchParams);
  return <AdminStatsPanel initialTab={filters.tab} />;
}
