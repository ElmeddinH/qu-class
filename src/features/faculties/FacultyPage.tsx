// ============================================================================
// src/features/faculties/FacultyPage.tsx
// `/faculties/[slug]` — fakültə detalı [M2].
//
// 🔴 «AÇIQ SİNİFLƏRİN SAYI» GÖSTƏRİLİR, ÜZV SAYI YOX (spec §2 tələbi ilə
// məxfilik qaydası arasındaki sərhəd). Sinif səhifəsinin MÖVCUDLUĞU açıq
// faktdır — qeydiyyat forması onsuz da göstərir; içindəki adam sayı isə
// ictimai səhifədə fərdiləşməyə açılan qapıdır.
//
// ⚠️ Sinif səhifəsinin ÖZÜNƏ link YOXDUR: `/class/[slug]` auth arxasındadır və
// anonim ziyarətçini `/login`-ə atardı. Bu, "linkin 404 verməməsi" qaydasının
// (Blok 9S) davamıdır — mövcud, amma girişsiz açılmayan ünvana ictimai
// səhifədən keçid vermirik.
//
// ⚠️ Dərəcə etiketi mövcud `DEGREE_LABELS`-dandır (dublikat cədvəl yoxdur).
// ============================================================================

import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/features/content/PageHeader";
import { degreeLabel } from "@/lib/labels";
import type { FacultyDetail } from "@/services/academic.service";

interface FacultyPageProps {
  faculty: FacultyDetail;
}

export function FacultyPage({ faculty }: FacultyPageProps) {
  const totalOpenClasses = faculty.programs.reduce(
    (sum, program) => sum + program.openClassCount,
    0,
  );

  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Fakültə"
        title={faculty.name}
        description={faculty.description ?? undefined}
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/faculties", label: "Fakültələr" },
          { href: `/faculties/${faculty.slug}`, label: faculty.name },
        ]}
      >
        <dl className="flex flex-wrap gap-6">
          <div className="flex flex-col">
            <dt className="order-2 text-small text-text-secondary">ixtisas</dt>
            <dd className="order-1 text-h2 font-bold text-ku-green">
              {faculty.programs.length}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="order-2 text-small text-text-secondary">açıq sinif səhifəsi</dt>
            <dd className="order-1 text-h2 font-bold text-ku-green">{totalOpenClasses}</dd>
          </div>
        </dl>
      </PageHeader>

      <section aria-labelledby="programs-heading" className="flex flex-col gap-4">
        <h2 id="programs-heading" className="text-h3 font-semibold text-text-primary">
          İxtisaslar
        </h2>

        {faculty.programs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="İxtisas siyahısı hazırlanır"
            description="Bu fakültə üçün ixtisaslar hələ əlavə olunmayıb."
            action={{ href: "/faculties", label: "Bütün fakültələr" }}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {faculty.programs.map((program) => (
              <li
                key={program.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-sm-kuds sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-h4 font-medium text-text-primary">{program.name}</h3>
                  <p className="flex items-center gap-2 text-small text-text-secondary">
                    <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                    {degreeLabel(program.degree)}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {/* 🔴 SAY — üzv sayı deyil, AÇIQ SİNİF sayı (başlıqdaki qeyd). */}
                  <span className="rounded-badge bg-ku-soft px-3 py-1 text-small text-ku-dark">
                    {program.openClassCount} açıq sinif
                  </span>

                  {program.admissionYears.length > 0 ? (
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
                  ) : (
                    <span className="text-caption text-text-secondary">
                      Hələ sinif səhifəsi açılmayıb
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-card bg-ku-dark p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-white/90">
          Bu fakültəyə qəbul olunmusan? Sinif səhifən qeydiyyatdan sonra avtomatik
          açılır.
        </p>
        <Link
          href="/register"
          className="w-fit rounded-btn bg-white px-6 py-2 text-small font-medium text-ku-dark transition-colors hover:bg-ku-soft"
        >
          Qeydiyyatdan keç
        </Link>
      </div>
    </div>
  );
}
