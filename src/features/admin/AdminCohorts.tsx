// ============================================================================
// src/features/admin/AdminCohorts.tsx
// `/admin/cohorts` — sinif siyahısı, yaratma və redaktə (spec §18).
//
// 🔴 SİLMƏ DÜYMƏSİ YOXDUR VƏ TƏKLİF EDİLMİR: `Cohort` silinsə
// `onDelete: Cascade` sinfin bütün paylaşımlarını, şərhlərini, xatirələrini,
// nailiyyətlərini, xronologiyasını və tədbirlərini aparardı. Sxemdə «arxivlə»
// sahəsi də yoxdur, ona görə mövcud olmayan əməliyyat ekranda göstərilmir —
// səbəb `services/admin-cohorts.service.ts` başlığındadır.
//
// ⚠️ «Mərhələ» sütunu `User.stage` KEŞİNDƏN DEYİL, cohort tarixlərindən
// hesablanır (`resolveStage`).
// ============================================================================

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth";
import { stageLabel } from "@/lib/labels";
import {
  listAdminCohorts,
  listAdminProgramOptions,
} from "@/services/admin-cohorts.service";
import { shortDate } from "@/utils/date";

import { AdminPageHeader } from "./AdminPageHeader";
import { CohortCreateForm } from "./CohortCreateForm";
import { CohortEditForm } from "./CohortEditForm";

export async function AdminCohorts() {
  const viewer = await getViewer();

  const [cohorts, programs] = await Promise.all([
    listAdminCohorts(viewer),
    listAdminProgramOptions(viewer),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Siniflər"
        description="Sinif = cohort. Slug ixtisas və məzuniyyət ilindən DETERMİNİSTİK generasiya olunur, ona görə eyni sinif ikinci dəfə yaradıla bilməz."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/import">CSV SIS importu</Link>
        </Button>
      </AdminPageHeader>

      <CohortCreateForm programs={programs} />

      <Card>
        <CardHeader>
          <CardTitle>Mövcud siniflər ({cohorts.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {cohorts.length === 0 ? (
            <p className="text-small text-text-secondary">Hələ sinif yoxdur.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {cohorts.map((cohort) => (
                <li
                  key={cohort.id}
                  className="flex flex-col gap-3 rounded-card border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={`/class/${cohort.slug}`}
                        className="text-h4 font-medium text-text-primary hover:underline"
                      >
                        {cohort.displayName}
                      </Link>
                      <span className="text-caption text-text-secondary">
                        {cohort.facultyName ?? "—"} · {cohort.programName ?? "—"} ·{" "}
                        {cohort.admissionYear}–{cohort.graduationYear}
                      </span>
                      <span className="text-caption text-text-secondary">
                        slug: <code>{cohort.slug}</code> · {cohort.memberCount} üzv ·{" "}
                        {shortDate(cohort.academicStartsAt)} —{" "}
                        {shortDate(cohort.graduatesAt)}
                      </span>
                    </div>

                    <Badge variant="outline" className="font-normal">
                      {stageLabel(cohort.stage)}
                    </Badge>
                  </div>

                  <CohortEditForm
                    cohort={{
                      id: cohort.id,
                      displayName: cohort.displayName,
                      coverUrl: cohort.coverUrl,
                      welcomeMessage: cohort.welcomeMessage,
                      academicStartsAt: cohort.academicStartsAt.toISOString(),
                      graduatesAt: cohort.graduatesAt.toISOString(),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
