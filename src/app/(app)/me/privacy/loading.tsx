// A SİYAHISI — LEAF seqment. ⚠️ `me/` KÖKÜNƏ QOYULMUR: qonşu `me/edit` və
// `me/career` `notFound()` çağırır və valideyn `loading.tsx` onlara da düşərdi
// (TƏLƏ B — `loading.tsx` bütün alt ağaca şamil olunur). İzah:
// `(admin)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function PrivacyLoading() {
  return <PageSkeleton variant="form" count={8} label="Məxfilik parametrləri yüklənir" />;
}
