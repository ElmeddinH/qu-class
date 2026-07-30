import type { Metadata } from "next";

import { AdminStatsPanel } from "@/features/admin/AdminStatsPanel";
import { parseAdminStatsParams } from "@/lib/admin-stats-filters";
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
 *
 * ⚠️ İKİ AYRI URL VƏZİYYƏTİ, İKİ AYRI SAF MODUL:
 *   · `?tab=`    — görünüş (`lib/map-filters.ts`), server sorğusu tələb etmir;
 *   · `?cohort=` — sinif filtri (`lib/admin-stats-filters.ts`), Prisma `where`
 *     şərtinə girir və serveri YENİDƏN işlədir.
 * Səhifə nazikdir (CLAUDE.md §8): yalnız oxuyub `features/admin`-ə ötürür.
 */
export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <AdminStatsPanel
      initialTab={parseMapParams(params).tab}
      cohortId={parseAdminStatsParams(params).cohortId}
    />
  );
}
