// A SİYAHISI — Xankəndi bələdçisi (`/khankendi`).
//
// 🔴 Route qrupu (`(index)`) TƏLƏ B üçündür: qonşu `khankendi/[id]`
// `notFound()` çağırır. Tam izah: `(public)/(landing)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function GuideLoading() {
  return <PageSkeleton variant="cards" count={9} label="Bələdçi məkanları yüklənir" />;
}
