// ============================================================================
// src/features/faculties/FacultyDirectory.tsx
// `/faculties` — fakültə kartları [M2] (spec §2, 3-cü bənd).
//
// 🔴 AQREQASİYA QAYDASI: kartlarda ÜZV SAYI YOXDUR. Göstərilən iki rəqəm
// STRUKTURDUR — ixtisas sayı və açılmış sinif səhifəsi sayı. «Bu fakültədə N
// tələbə var» ictimai səhifədə fərdiləşməyə açılan qapıdır: kiçik siniflərdə
// say + qəbul ili + ixtisas üçlüyü konkret adamı işarələyir (10A-nın başlıq
// zolağı qaydası ilə eyni). Servis onsuz da üzv sayını QAYTARMIR.
//
// ⚠️ `academic.service` `Viewer` ALMIR — bu, redaksiya/struktur məlumatıdır və
// heç bir istifadəçi sətri oxunmur (fayl başlığındaki səbəb).
//
// ⚠️ Kart BÜTÜNLÜKLƏ linkdir (`<Link>` içində başlıq və rəqəmlər) — kliklənən
// sahə böyükdür və klaviatura ilə tək `Tab` dayanacağı yaranır.
// ============================================================================

import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/features/content/PageHeader";
import type { FacultyCard } from "@/services/academic.service";

interface FacultyDirectoryProps {
  faculties: FacultyCard[];
}

export function FacultyDirectory({ faculties }: FacultyDirectoryProps) {
  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Akademik struktur"
        title="Fakültələr və ixtisaslar"
        description="Qarabağ Universitetinin fakültələri, onların ixtisasları və açılmış sinif səhifələri. Hər ixtisasın qəbul ilinə görə ayrıca sinif səhifəsi var."
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/faculties", label: "Fakültələr" },
        ]}
      />

      {faculties.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Kataloq hazırlanır"
          description="Fakültə məlumatları hələ əlavə olunmayıb."
          action={{ href: "/", label: "Açılış səhifəsi" }}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {faculties.map((faculty) => (
            <li key={faculty.id}>
              <Link
                href={`/faculties/${faculty.slug}`}
                className="flex h-full flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds transition-colors hover:border-ku-green"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-h3 font-semibold text-text-primary">
                    {faculty.name}
                  </span>
                  <ArrowRight
                    className="mt-1 h-5 w-5 shrink-0 text-ku-green"
                    aria-hidden
                  />
                </span>

                {faculty.description ? (
                  <span className="text-small text-text-secondary">
                    {faculty.description}
                  </span>
                ) : null}

                {/* 🔴 STRUKTUR rəqəmləri — üzv sayı DEYİL (başlıqdaki qeyd). */}
                <span className="mt-auto flex flex-wrap gap-4 text-small text-text-secondary">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                    {faculty.programCount} ixtisas
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" aria-hidden />
                    {faculty.cohortCount} sinif səhifəsi
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-small text-text-secondary">
        Qeydiyyatda yalnız sinif səhifəsi AÇILMIŞ ixtisas/il cütləri seçilə bilir —
        seçilə bilən, amma sinfi olmayan variant istifadəçini çıxılmaz vəziyyətə
        salardı.
      </p>
    </div>
  );
}
