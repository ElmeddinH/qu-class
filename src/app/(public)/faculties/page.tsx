// ============================================================================
// src/app/(public)/faculties/page.tsx
// /faculties — fakültə kataloqu [M2].
//
// Səhifə NAZİKDİR (CLAUDE.md §8): sorğu `academic.service`-dən, render
// `features/faculties`-dən.
//
// ⚠️ İCTİMAİ SƏHİFƏ — `getViewer()` YOXDUR. `academic.service` `Viewer` almır:
// fakültə/ixtisas universitetin AÇIQ strukturudur (qeydiyyat forması onsuz da
// göstərir) və heç bir istifadəçi sətri oxunmur.
//
// ⚠️ `force-dynamic` — kataloq DB-dən gəlir, admin cohort yaradanda dəyişir.
// ============================================================================

import type { Metadata } from "next";

import { FacultyDirectory } from "@/features/faculties/FacultyDirectory";
import { listFacultyCards } from "@/services/academic.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fakültələr və ixtisaslar — QU CLASS",
  description:
    "Qarabağ Universitetinin fakültələri, ixtisasları və açılmış sinif səhifələri.",
};

export default async function FacultiesPage() {
  const faculties = await listFacultyCards();

  return <FacultyDirectory faculties={faculties} />;
}
