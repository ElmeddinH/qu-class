import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CareerManager } from "@/features/profile/career/CareerManager";
import { requireUser } from "@/lib/auth";
import { getCareerWorkspace } from "@/services/career.service";

export const metadata: Metadata = {
  title: "Karyera və təhsil",
};

/**
 * `/me/career` [M7] — karyera, təhsil və dəstək təkliflərinin idarəsi.
 *
 * Səhifə nazikdir (CLAUDE.md §8). Bütün DB girişi `services/career.service.ts`
 * -dədir və hər yazı `userId: viewer.userId` şərti ilə gedir — başqasının
 * qeydini redaktə etmək mümkün deyil.
 */
export default async function CareerPage() {
  const viewer = await requireUser();
  const workspace = await getCareerWorkspace(viewer);

  if (!workspace) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Karyera və təhsil</h1>
          <p className="max-w-2xl text-body text-text-secondary">
            Hər qeyd üçün İKİ ayrı razılıq verirsiniz: kimin görəcəyi
            (görünürlük) və statistikaya daxil olub-olmayacağı. Bunlar
            bir-birindən asılı deyil — qeydi sinfinizə göstərmək statistikaya
            qoşulmaq demək deyil.
          </p>
        </div>

        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/u/${viewer.userId}`}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Profilimə bax
          </Link>
        </Button>
      </div>

      <CareerManager workspace={workspace} />
    </div>
  );
}
