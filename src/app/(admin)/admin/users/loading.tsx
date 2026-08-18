// `(admin)/loading.tsx`-i DAR seqmentdə üstələyir: səhifə kart qridi deyil,
// CƏDVƏLDİR (`features/admin/AdminUserTable`). Kart skeletonu ~2 sıra × 220px
// yer tutur, cədvəl isə 8 × 65px — fərq məzmun gələndə gözlə görünən
// sıçrayışdır (CLS). Status qapısı yoxdur, `(admin)` izahı burada da keçərlidir.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AdminUsersLoading() {
  return <PageSkeleton variant="table" label="İstifadəçi cədvəli yüklənir" />;
}
