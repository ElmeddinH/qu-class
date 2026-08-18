// A SİYAHISI — LEAF seqment. ⚠️ `/events/<id>` BU AĞACDA DEYİL: tədbir detalı
// `(app)/events/[id]`-dədir (auth arxasında) və `notFound()` çağırır. Yəni bu
// fayl ona TOXUNMUR. İzah: `(admin)/loading.tsx`.
import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function PublicEventsLoading() {
  return <PageSkeleton variant="cards" label="Açıq tədbirlər yüklənir" />;
}
