// ============================================================================
// src/features/welcome/FacultiesSection.tsx
// «Fakültələr və ixtisaslar» — akkordeon.
//
// ⚠️ Kataloq QEYDİYYAT formasının işlətdiyi EYNİ servisdəndir
// (`listRegistrationCatalog`), yəni açılışda görünən ixtisas mütləq seçilə
// bilir. Ayrı sorğu yazsaydıq açılışda "var", formada "yox" vəziyyəti yaranardı.
//
// ⚠️ `Accordion` shadcn primitividir (`"use client"` öz içindədir) — server
// komponentindən render OLUNA BİLİR, çünki ona yalnız seriallaşan proplar
// (sətir, JSX) ötürülür (CLAUDE.md §12).
//
// ⚠️ Qəbul ili rozetləri `Cohort` sətirlərindən gəlir: yalnız SİNİF SƏHİFƏSİ
// AÇILMIŞ illər göstərilir.
// ============================================================================

import { EmptyState } from "@/components/shared/EmptyState";
import { GraduationCap } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FacultyOption } from "@/services/academic.service";

interface FacultiesSectionProps {
  faculties: FacultyOption[];
}

export function FacultyAccordion({ faculties }: FacultiesSectionProps) {
  if (faculties.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Kataloq hazırlanır"
        description="Sinif səhifəsi açılmış ixtisas hələ yoxdur. Administrator cohort yaratdıqdan sonra siyahı burada görünəcək."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 🔴 BU QEYD MƏCBURİDİR — yoxsa səhifə ÖZÜ ilə ziddiyyətə düşür.
          «Rəqəmlərlə» zolağı BÜTÜN fakültələri sayır (`getStructureCounts` →
          `faculty.count()`), akkordeon isə yalnız SİNİF SƏHİFƏSİ AÇILMIŞ
          ixtisasları göstərir (`listRegistrationCatalog`). Seed-də bu fərq
          realdır: 4 fakültə var, cohort-u olan 3-dür. Ziyarətçi "4" oxuyub 3
          sətir görəndə səhv bizdə axtarılır — səbəbi açıq yazmaq düzgün həlldir.
          İki sorğunu "uyğunlaşdırmaq" YANLIŞ olardı: qeydiyyat forması eyni
          kataloqu işlədir və seçilə bilməyən fakültəni göstərməməlidir. */}
      <p className="text-small text-text-secondary">
        Siyahıda yalnız sinif səhifəsi açılmış ixtisaslar göstərilir — qeydiyyatda
        seçilə bilən variantlar məhz bunlardır.
      </p>

      <Accordion
        type="single"
        collapsible
        className="rounded-card border border-border bg-surface px-6"
      >
        {faculties.map((faculty) => (
          <AccordionItem key={faculty.id} value={faculty.id}>
            <AccordionTrigger className="text-left text-h4 font-medium text-text-primary">
              {faculty.name}
            </AccordionTrigger>

            <AccordionContent>
              <ul className="flex flex-col gap-3 pb-2">
                {faculty.programs.map((program) => (
                  <li
                    key={program.id}
                    className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-body text-text-primary">{program.name}</span>

                    <span className="flex flex-wrap items-center gap-2">
                      <span className="sr-only">Qəbul illəri:</span>
                      {program.admissionYears.map((year) => (
                        <span
                          key={year}
                          className="rounded-badge bg-ku-blue px-3 py-1 text-caption text-text-primary"
                        >
                          {year}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
