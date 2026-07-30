import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { CardHeading } from "@/components/kuds/SectionCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPrimaryCohort, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ana səhifə",
};

/**
 * `/home` — istifadəçinin ƏSAS sinif səhifəsinə yönləndirir.
 *
 * ⚠️ Cohort üzvlüyü YOXDURSA yönləndirmə edilmir. Bu, real haldır: yeni
 * qeydiyyatdan keçmiş, hələ sinfə bağlanmamış istifadəçi və ya universitet
 * admini. Yönləndirmək əvəzinə izahlı ekran göstərilir (PLAN.md §7).
 */
export default async function AppHomePage() {
  await requireUser();
  const cohort = await getPrimaryCohort();

  if (cohort) redirect(`/class/${cohort.slug}`);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-12">
      <Card>
        <CardHeader className="items-start gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-avatar bg-ku-soft"
            aria-hidden
          >
            <Users className="h-6 w-6 text-ku-dark" />
          </span>
          {/* T22: səhifənin YEGANƏ başlığıdır → `level={1}`. */}
          <CardHeading level={1} className="text-h2">
            Sinif səhifəniz hələ təyin olunmayıb
          </CardHeading>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <p className="text-body text-text-secondary">
            Hesabınız hələ heç bir sinfə (cohort) bağlanmayıb. Fakültə, ixtisas
            və qəbul ili məlumatlarınız təsdiqləndikdən sonra sinif səhifəniz
            avtomatik açılacaq.
          </p>
          <p className="text-small text-text-secondary">
            Məlumatlarınızın düzgün olduğuna əminsinizsə universitet
            administrasiyasına müraciət edin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
