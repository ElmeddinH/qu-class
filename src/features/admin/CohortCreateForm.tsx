"use client";

// ============================================================================
// src/features/admin/CohortCreateForm.tsx
// Yeni sinif yaratma formu (TƏLƏ F).
//
// ⚠️ SLUG SAHƏSİ YOXDUR — slug ixtisas + məzuniyyət ilindən SERVERDƏ
// generasiya olunur (`lib/admin-rules.ts` → `cohortSlugOf`). Əl ilə yazılan
// slug dublikat qorumasını sındırardı: iki fərqli slug eyni sinfi göstərə
// bilər və `@@unique([scope, facultyId, programId, admissionYear])` SQL-də
// NULL-lara görə həmişə işləmir.
//
// Forma yalnız ÖNİZLƏMƏ göstərir ki, admin nəticəni əvvəlcədən görsün.
//
// ⚠️ `<select>` üçün e2e seçicisi `getByRole("combobox")`-dur (T29).
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cohortSlugOf } from "@/lib/admin-rules";

import { createCohortAction } from "./actions";

interface ProgramOption {
  id: string;
  name: string;
  slug: string;
  facultyName: string;
}

/** Bakalavr proqramı — dörd il. Tarixlər buna görə təklif olunur. */
const DEFAULT_SPAN_YEARS = 4;

export function CohortCreateForm({ programs }: { programs: ProgramOption[] }) {
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [admissionYear, setAdmissionYear] = useState(String(new Date().getFullYear()));
  const [graduationYear, setGraduationYear] = useState(
    String(new Date().getFullYear() + DEFAULT_SPAN_YEARS),
  );
  const [academicStartsAt, setAcademicStartsAt] = useState("");
  const [graduatesAt, setGraduatesAt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const program = programs.find((p) => p.id === programId) ?? null;

  const slugPreview = useMemo(() => {
    const year = Number.parseInt(graduationYear, 10);
    if (program === null || !Number.isInteger(year)) return null;
    return cohortSlugOf(program.slug, year);
  }, [program, graduationYear]);

  const submit = () => {
    startTransition(async () => {
      const result = await createCohortAction({
        programId,
        admissionYear,
        graduationYear,
        academicStartsAt,
        graduatesAt,
        welcomeMessage,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Sinif yaradılmadı.");
        return;
      }

      toast.success(result.message ?? "Sinif yaradıldı.");
      setWelcomeMessage("");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni sinif</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Yeni sinif formu"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cohort-program">İxtisas</Label>
              <select
                id="cohort-program"
                value={programId}
                onChange={(event) => setProgramId(event.target.value)}
                className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
              >
                {programs.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.facultyName} — {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cohort-admission">Qəbul ili</Label>
              <Input
                id="cohort-admission"
                type="number"
                value={admissionYear}
                onChange={(event) => setAdmissionYear(event.target.value)}
                className="rounded-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cohort-graduation">Məzuniyyət ili</Label>
              <Input
                id="cohort-graduation"
                type="number"
                value={graduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                className="rounded-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cohort-starts">Dərslərin başlaması</Label>
              <Input
                id="cohort-starts"
                type="date"
                value={academicStartsAt}
                onChange={(event) => setAcademicStartsAt(event.target.value)}
                className="rounded-input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cohort-graduates">Məzuniyyət tarixi</Label>
              <Input
                id="cohort-graduates"
                type="date"
                value={graduatesAt}
                onChange={(event) => setGraduatesAt(event.target.value)}
                className="rounded-input"
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="cohort-welcome">Xoş gəldin mesajı</Label>
              <Textarea
                id="cohort-welcome"
                value={welcomeMessage}
                onChange={(event) => setWelcomeMessage(event.target.value)}
                rows={2}
                className="rounded-input"
              />
            </div>
          </div>

          <p className="text-caption text-text-secondary">
            Ünvan (slug) avtomatik qurulur:{" "}
            <code>{slugPreview ?? "ixtisas və il seçin"}</code>. Bu slug artıq
            mövcuddursa sinif yaradılmır — dublikat qoruması budur.
          </p>

          <Button type="submit" disabled={pending || program === null} className="w-fit">
            Sinif yarat
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
