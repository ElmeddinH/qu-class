// A SİYAHISI — LEAF seqment. Səhifə `listRegistrationCatalog()` gözləyir
// (fakültə/ixtisas seçicisi), `notFound()` yoxdur. İzah: `(admin)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function RegisterLoading() {
  return <PageSkeleton variant="form" count={7} label="Qeydiyyat forması yüklənir" />;
}
