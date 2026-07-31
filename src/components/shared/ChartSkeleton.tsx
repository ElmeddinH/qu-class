// ============================================================================
// src/components/shared/ChartSkeleton.tsx
// Recharts `dynamic(..., { ssr: false })` ilə yüklənir — ilk kadrda komponent
// hələ yoxdur. Boş ekran buraxmaq CLAUDE.md-də qadağandır (§«Boş ekran
// buraxma»), ona görə ölçüsü QRAFİKLƏ EYNİ olan skeleton göstərilir.
//
// 🔴 HÜNDÜRLÜK ARQUMENTDİR, SABİT DEYİL. Qrafiklərin hündürlüyü fərqlidir
// (dashboard sütunları 240px, donut 260px, üfüqi sütunlar sətir sayından
// asılıdır). Eyni ölçü verilməsə skeleton itən anda səhifə sıçrayır — Lighthouse
// bunu CLS kimi ölçür və Blok 12C-nin hədəflərindən biri məhz CLS = 0-dır.
//
// ⚠️ `MapSkeleton` ilə eyni ailədəndir, amma ayrıdır: xəritənin nisbəti sabitdir
// (`aspect-[2/1]`), qrafikin isə piksel hündürlüyü var.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  /** Qrafikin REAL hündürlüyü (px) — `ResponsiveContainer`-ə verilən dəyər. */
  height: number;
  /** Ekran oxuyucu və gözlə oxunan izah — «… yüklənir». */
  label: string;
}

export function ChartSkeleton({ height, label }: ChartSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-full rounded-card" style={{ height }} />
      <span className="text-caption text-text-secondary">{label} yüklənir…</span>
    </div>
  );
}
