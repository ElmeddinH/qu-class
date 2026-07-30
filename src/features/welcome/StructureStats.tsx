// ============================================================================
// src/features/welcome/StructureStats.tsx
// «Rəqəmlərlə» zolağı — mövcud `StatCard` komponenti işlədilir (dublikat yoxdur).
//
// 🔴 BURADA ÜZV SAYI YOXDUR və olmayacaq. Aqreqasiya qaydası (CLAUDE.md
// "Məxfilik modeli"): şəxsi və ya sinif səviyyəli sayğac ictimai səhifədə
// göstərilmir. 3 nəfərlik sinifdə "üzv sayı: 3" faktı özü fərdi məlumata
// yaxınlaşır — `suppressSmallBuckets()` (MIN_BUCKET_SIZE = 3) məhz buna qarşı
// yazılıb və eyni intizam burada da tətbiq olunur.
//
// Göstərilən üç rəqəm universitetin AÇIQ strukturudur: fakültə, ixtisas və
// açılmış sinif səhifəsi sayı. Qeydiyyat forması onları onsuz da göstərir.
// ============================================================================

import { BookOpen, GraduationCap, Users } from "lucide-react";

import { StatCard } from "@/components/shared/StatCard";
import type { StructureCounts } from "@/services/academic.service";

interface StructureStatsProps {
  counts: StructureCounts;
}

export function StructureStats({ counts }: StructureStatsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={BookOpen}
        value={counts.faculties}
        label="Fakültə"
        hint="Akademik struktur"
      />
      <StatCard
        icon={GraduationCap}
        value={counts.programs}
        label="İxtisas"
        hint="Bakalavr, magistr və doktorantura"
      />
      <StatCard
        icon={Users}
        value={counts.cohorts}
        label="Sinif səhifəsi"
        hint="Qəbul ilinə görə açılmış siniflər"
      />
    </div>
  );
}
