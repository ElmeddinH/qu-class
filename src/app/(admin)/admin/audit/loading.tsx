// Bax `(admin)/admin/users/loading.tsx` — eyni səbəb: `features/admin/AuditTable`
// cədvəldir, kart qridi deyil.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AdminAuditLoading() {
  return <PageSkeleton variant="table" label="Audit jurnalı yüklənir" />;
}
