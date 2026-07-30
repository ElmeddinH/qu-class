import type { Metadata } from "next";

import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { SisImportScreen } from "@/features/admin/SisImportScreen";

export const metadata: Metadata = {
  title: "SIS CSV importu",
};

export const dynamic = "force-dynamic";

/**
 * `/admin/import` — toplu istifadəçi importu (TƏLƏ E).
 *
 * ⚠️ Bu yol `ADMIN_NAV`-da YOXDUR və bu, qəsdəndir: naviqasiya 8 bölmədən
 * ibarətdir və import cohort idarəsinin bir addımıdır — keçid
 * `/admin/cohorts` və idarə panelindən verilir. Naviqasiyaya doqquzuncu link
 * əlavə etmək əvəzinə axın kontekstində saxlanılır.
 */
export default function AdminImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="SIS CSV importu"
        description="İki mərhələ: önizləmə (baza dəyişmir) → təsdiq (tək transaksiya). Faylda bir rədd edilmiş sətir varsa heç nə yazılmır. Şifrə sütunu qəbul edilmir."
      />
      <SisImportScreen />
    </div>
  );
}
