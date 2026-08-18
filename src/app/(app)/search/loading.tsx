// A SİYAHISI — LEAF seqment, `notFound()` yoxdur (qısa sorğuda servis boş
// nəticə qaytarır, 404 vermir). İzah: `(admin)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function SearchLoading() {
  return <PageSkeleton variant="list" count={5} label="Axtarış nəticələri yüklənir" />;
}
