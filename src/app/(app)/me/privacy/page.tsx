import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivacySettings } from "@/features/privacy/PrivacySettings";
import { requireUser } from "@/lib/auth";
import { getFieldVisibility } from "@/services/user.service";

export const metadata: Metadata = {
  title: "Məxfilik",
};

/**
 * `/me/privacy` [M14] — sahə-səviyyə məxfilik paneli (spesifikasiya §5).
 *
 * Səhifə nazikdir: `Viewer`-i qurur, servisdən cari səviyyələri oxuyur və
 * `features/privacy`-yə ötürür (CLAUDE.md §8).
 */
export default async function PrivacyPage() {
  const viewer = await requireUser();
  const levels = await getFieldVisibility(viewer);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Məxfilik</h1>
          <p className="max-w-2xl text-body text-text-secondary">
            Hər profil sahəsini kimin görəcəyini ayrıca seçirsiniz. Dəyişiklik
            dərhal qüvvəyə minir — «Yadda saxla» düyməsi yoxdur.
          </p>
        </div>

        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/u/${viewer.userId}?as=anonymous`}>
            <Eye className="h-4 w-4" aria-hidden />
            Profilimə kənardan bax
          </Link>
        </Button>
      </div>

      <PrivacySettings initialLevels={levels} />
    </div>
  );
}
