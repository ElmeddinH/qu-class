"use client";

// ============================================================================
// src/features/profile/career/CareerManager.tsx
// `/me/career` — karyera, təhsil və dəstək təkliflərinin idarə paneli.
//
// Hər qeyd sətrində ÜÇ məlumat birlikdə görünür ki, istifadəçi razılıqların
// müstəqil olduğunu ekranda görsün:
//   · görünürlük rozeti  (`visibility`)
//   · statistika rozeti  (`includeInStats`) — "Statistikada" / "Statistikada deyil"
//   · dövr / vəziyyət
//
// ⚠️ Silmə TƏSDİQ TƏLƏB EDİR (dialoq) — karyera qeydi hard delete olunur
// (`career.service`), geri qaytarılmır.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChartColumn,
  ChartColumnDecreasing,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeading } from "@/components/kuds/SectionCard";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { degreeLabel, industryLabel } from "@/lib/labels";
import { shortDate } from "@/utils/date";
import type {
  CareerWorkspace,
  OwnCareerEntry,
  OwnEducationEntry,
} from "@/services/career.service";

import { deleteCareerEntryAction, deleteEducationEntryAction } from "./actions";
import { CareerEntryDialog } from "./CareerEntryDialog";
import { EducationEntryDialog } from "./EducationEntryDialog";
import { SupportOfferForm } from "./SupportOfferForm";

interface CareerManagerProps {
  workspace: CareerWorkspace;
}

export function CareerManager({ workspace }: CareerManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [careerDialog, setCareerDialog] = useState<{ open: boolean; entry: OwnCareerEntry | null }>({
    open: false,
    entry: null,
  });
  const [educationDialog, setEducationDialog] = useState<{
    open: boolean;
    entry: OwnEducationEntry | null;
  }>({ open: false, entry: null });

  /**
   * Server action `revalidatePath` çağırır, amma müştəri ağacı avtomatik
   * yenilənmir — `router.refresh()` server komponentini yeniden çəkir.
   */
  function refresh(): void {
    router.refresh();
  }

  function removeCareer(entryId: string): void {
    if (!window.confirm("Bu karyera qeydini silmək istəyirsiniz? Əməliyyat geri qaytarılmır.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCareerEntryAction({ entryId });
      if (!result.ok) {
        toast.error(result.message ?? "Qeyd silinmədi.");
        return;
      }
      toast.success(result.message ?? "Qeyd silindi.");
      refresh();
    });
  }

  function removeEducation(entryId: string): void {
    if (!window.confirm("Bu təhsil qeydini silmək istəyirsiniz? Əməliyyat geri qaytarılmır.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEducationEntryAction({ entryId });
      if (!result.ok) {
        toast.error(result.message ?? "Qeyd silinmədi.");
        return;
      }
      toast.success(result.message ?? "Qeyd silindi.");
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ================= Karyera ================= */}
      <Card id="career" className="scroll-mt-24">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardHeading>Karyera qeydləri</CardHeading>
            <CardDescription>
              İş yerləri və təcrübələr. Yalnız BİR qeyd «cari» ola bilər.
            </CardDescription>
          </div>

          <Button
            type="button"
            className="shrink-0"
            onClick={() => setCareerDialog({ open: true, entry: null })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Karyera qeydi əlavə et
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {workspace.career.length === 0 ? (
            <EmptyState
              icon={ChartColumn}
              title="Hələ karyera qeydi yoxdur"
              description="İş yerinizi əlavə edin — profilinizdə vaxt oxu şəklində görünəcək."
            />
          ) : (
            workspace.career.map((entry, index) => (
              <div key={entry.id} className="flex flex-col gap-3">
                {index > 0 ? <Separator /> : null}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-body font-medium text-text-primary">
                      {entry.position} · {entry.company}
                    </p>

                    <p className="text-small text-text-secondary">
                      {shortDate(entry.startDate)} —{" "}
                      {entry.endDate ? shortDate(entry.endDate) : "indiyədək"}
                      {[entry.city, entry.country].filter(Boolean).length > 0
                        ? ` · ${[entry.city, entry.country].filter(Boolean).join(", ")}`
                        : ""}
                      {entry.industry ? ` · ${industryLabel(entry.industry)}` : ""}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {entry.isCurrent ? (
                        <Badge className="bg-ku-soft text-ku-dark hover:bg-ku-soft">Cari iş</Badge>
                      ) : null}
                      <VisibilityBadge level={entry.visibility} />
                      <StatsBadge includeInStats={entry.includeInStats} />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setCareerDialog({ open: true, entry })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Redaktə et
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={`${entry.company} qeydini sil`}
                      onClick={() => removeCareer(entry.id)}
                    >
                      {pending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ================= Təhsil ================= */}
      <Card id="education" className="scroll-mt-24">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardHeading>Təhsil qeydləri</CardHeading>
            <CardDescription>
              Universitetdən sonrakı və ya paralel təhsil. Bir neçə qeyd «davam edir»
              ola bilər.
            </CardDescription>
          </div>

          <Button
            type="button"
            className="shrink-0"
            onClick={() => setEducationDialog({ open: true, entry: null })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Təhsil qeydi əlavə et
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {workspace.education.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Hələ təhsil qeydi yoxdur"
              description="Magistratura, doktorantura və ya sertifikat proqramlarınızı əlavə edin."
            />
          ) : (
            workspace.education.map((entry, index) => (
              <div key={entry.id} className="flex flex-col gap-3">
                {index > 0 ? <Separator /> : null}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-body font-medium text-text-primary">
                      {entry.institution} · {degreeLabel(entry.degree)}
                    </p>

                    <p className="text-small text-text-secondary">
                      {entry.startYear} — {entry.endYear ?? "indiyədək"}
                      {entry.field ? ` · ${entry.field}` : ""}
                      {entry.country ? ` · ${entry.country}` : ""}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {entry.isCurrent ? (
                        <Badge className="bg-ku-soft text-ku-dark hover:bg-ku-soft">
                          Davam edir
                        </Badge>
                      ) : null}
                      <VisibilityBadge level={entry.visibility} />
                      <StatsBadge includeInStats={entry.includeInStats} />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setEducationDialog({ open: true, entry })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Redaktə et
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={`${entry.institution} qeydini sil`}
                      onClick={() => removeEducation(entry.id)}
                    >
                      {pending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ================= Dəstək təklifləri (3-cü razılıq) ================= */}
      <SupportOfferForm
        openToSupport={workspace.openToSupport}
        offers={workspace.offers}
        onSaved={refresh}
      />

      <CareerEntryDialog
        open={careerDialog.open}
        entry={careerDialog.entry}
        onOpenChange={(open) => setCareerDialog((prev) => ({ ...prev, open }))}
        onSaved={refresh}
      />

      <EducationEntryDialog
        open={educationDialog.open}
        entry={educationDialog.entry}
        onOpenChange={(open) => setEducationDialog((prev) => ({ ...prev, open }))}
        onSaved={refresh}
      />
    </div>
  );
}

/**
 * Aqreqasiya razılığının rozeti.
 *
 * Görünürlük rozetindən AYRI göstərilir ki, iki razılığın müstəqil olduğu
 * bir baxışda aydın olsun: "Sinif · Statistikada deyil" tamamilə normal
 * kombinasiyadır.
 */
function StatsBadge({ includeInStats }: { includeInStats: boolean }) {
  return includeInStats ? (
    <Badge
      variant="outline"
      className="gap-1 rounded-badge border-transparent bg-ku-blue text-caption font-medium text-ku-dark"
      title="Bu qeyd «İndi haradayıq?» statistikasına daxil edilir (ad göstərilmir)."
    >
      <ChartColumn className="h-3 w-3 shrink-0" aria-hidden />
      Statistikada
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 rounded-badge text-caption font-medium text-text-secondary"
      title="Bu qeyd statistikaya daxil edilmir — görünürlük səviyyəsindən asılı olmayaraq."
    >
      <ChartColumnDecreasing className="h-3 w-3 shrink-0" aria-hidden />
      Statistikada deyil
    </Badge>
  );
}
