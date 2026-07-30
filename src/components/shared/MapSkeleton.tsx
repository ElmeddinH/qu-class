// ============================================================================
// src/components/shared/MapSkeleton.tsx
// Xəritə `dynamic(..., { ssr: false })` ilə yüklənir — ilk kadrda komponent
// hələ yoxdur. Boş ekran buraxmaq CLAUDE.md-də qadağandır, ona görə ölçüsü
// XƏRİTƏ İLƏ EYNİ olan skeleton göstərilir (layout sıçraması olmasın).
//
// ⚠️ Blok 11A-da `features/where-are-we-now/`-dan bura köçdü: Xankəndi
// bələdçisi ikinci istifadəçi oldu və `features/*` bir-birindən import etmir
// (istiqamət həmişə features → shared, `PrintButton` ilə eyni yol).
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[2/1] w-full rounded-card" />
      <span className="text-caption text-text-secondary">{label} yüklənir…</span>
    </div>
  );
}
