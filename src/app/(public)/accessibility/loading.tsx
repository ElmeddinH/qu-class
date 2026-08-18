// A SİYAHISI — LEAF seqment, bəyanat mətni hamı üçün eynidir və `notFound()`
// yoxdur. İzah: `(admin)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AccessibilityLoading() {
  return <PageSkeleton variant="article" label="Əlçatanlıq bəyanatı yüklənir" />;
}
