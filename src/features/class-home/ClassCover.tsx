// ============================================================================
// src/features/class-home/ClassCover.tsx
// Spec §16 blok 1-3: Class cover + əsas məlumatlar · sinif adı və məzuniyyət
// ili · üzvlərin sayı.
//
// ⚠️ Bu üç blok BİRLİKDƏ, sabit başlıq kimi render olunur və mərhələyə görə
// YERİ DƏYİŞMİR. Səbəb: onlar səhifənin kimliyidir (hansı sinifdəyəm?), widget
// deyil. Mərhələyə görə sıralanan hissə blok 4-14-dür — bax `registry.tsx`.
// ============================================================================

import Image from "next/image";
import { CalendarRange, GraduationCap, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CohortHeader } from "@/services/cohort.service";

import { STAGE_META } from "./catalog";

export function ClassCover({ cohort }: { cohort: CohortHeader }) {
  const stage = STAGE_META[cohort.stage];

  return (
    <section aria-labelledby="class-cover-heading" className="flex flex-col gap-4">
      {cohort.coverUrl ? (
        <div className="relative h-40 w-full overflow-hidden rounded-card border border-border md:h-56">
          <Image
            src={cohort.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 1120px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-ku-soft text-ku-dark hover:bg-ku-soft">{stage.label}</Badge>
          {cohort.isMember ? <Badge variant="outline">Sizin sinfiniz</Badge> : null}
        </div>

        {/* Blok 2 — sinfin adı və məzuniyyət ili (`displayName` = "… — Class of 2030") */}
        <h1 id="class-cover-heading" className="text-h1 font-bold text-text-primary">
          {cohort.displayName}
        </h1>

        <p className="text-body text-text-secondary">{stage.description}</p>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small text-text-secondary">
          {cohort.facultyName ? (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
              <dt className="sr-only">Fakültə</dt>
              <dd>
                {cohort.facultyName}
                {cohort.programName ? ` · ${cohort.programName}` : ""}
              </dd>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Qəbul və məzuniyyət ili</dt>
            <dd>
              {cohort.admissionYear} qəbulu · {cohort.graduationYear} buraxılışı
            </dd>
          </div>

          {/* Blok 3 — üzvlərin sayı */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <dt className="sr-only">Üzv sayı</dt>
            <dd>{cohort.memberCount} üzv</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
