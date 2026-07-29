import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProfileEditForm } from "@/features/profile/ProfileEditForm";
import { getSessionUser, requireUser } from "@/lib/auth";
import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";
import {
  getProfileDraft,
  listClubCatalog,
  listTagCatalog,
} from "@/services/user.service";

export const metadata: Metadata = {
  title: "Profili redaktə et",
};

/**
 * `/me/edit` [M7] — profil redaktəsi.
 *
 * Səhifə nazikdir (CLAUDE.md §8): `Viewer`-i qurur, servisdən başlanğıc
 * vəziyyəti və kataloqları oxuyur, `features/profile`-a ötürür.
 *
 * ⚠️ `userId` FORMADA YOXDUR. Server action həmişə `requireUser()`-dən çıxan
 * viewer-in öz profilinə yazır — başqasının profilini redaktə etmək üçün
 * göndəriləcək sahə ümumiyyətlə mövcud deyil.
 */
export default async function ProfileEditPage() {
  const viewer = await requireUser();

  const [draft, sessionUser, tagCatalog, clubCatalog] = await Promise.all([
    getProfileDraft(viewer),
    getSessionUser(),
    listTagCatalog(viewer),
    listClubCatalog(viewer),
  ]);

  // Sessiya var, istifadəçi sətri yoxdur (silinmiş hesab) — 404 daha doğrudur
  // ki, boş forma göstərilməsin.
  if (!draft || !sessionUser) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Profili redaktə et</h1>
          <p className="max-w-2xl text-body text-text-secondary">
            {CONTROLLED_PROFILE_FIELDS.length} sahənin hər biri üçün DƏYƏRİ və KİMİN
            GÖRƏCƏYİNİ eyni yerdə seçirsiniz. Bölmələr məxfilik səhifəsindəki
            qruplaşma ilə eynidir.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/u/${viewer.userId}?as=class`}>
              <Eye className="h-4 w-4" aria-hidden />
              Sinif gözü ilə bax
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/me/privacy">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Məxfilik paneli
            </Link>
          </Button>
        </div>
      </div>

      <ProfileEditForm
        userId={viewer.userId}
        firstName={sessionUser.firstName}
        lastName={sessionUser.lastName}
        draft={draft}
        tagCatalog={tagCatalog}
        clubCatalog={clubCatalog}
      />
    </div>
  );
}
