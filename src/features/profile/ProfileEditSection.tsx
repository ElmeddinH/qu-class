// ============================================================================
// src/features/profile/ProfileEditSection.tsx
// Profil redaktə formasının SERVER qabığı — kataloq sorğuları burada.
//
// 🔴 NİYƏ AYRICA FAYL (Blok 12D · S3-F4 · TƏLƏ C). `/me/edit` status qapılıdır:
// sessiya var, istifadəçi sətri yoxdursa səhifə `notFound()` çağırır. Yəni
// seqmentə `loading.tsx` qoyula bilməz (axın statusu 200-ə kilidləyər) və
// skeleton yalnız qapıdan SONRAKI `<Suspense>` ilə mümkündür.
//
// Sərhədin arxasına YALNIZ statusa təsir etməyən sorğular düşür: teq və klub
// kataloqları. `getProfileDraft` / `getSessionUser` — yəni 404 qərarını verən
// iki sorğu — səhifədə, sərhəddən KƏNARDA qalır.
//
// ⚠️ TƏLƏ C-nin özü: kataloqlar MƏHZ BURADA gözlənilir. Səhifədə `await` edilib
// prop kimi ötürülsəydi `<Suspense>` boşa işləyər, skeleton görünməzdi.
//
// ⚠️ `prisma.*` burada YOXDUR (CLAUDE.md §4) — iki servis funksiyası.
// ============================================================================

import { listClubCatalog, listTagCatalog, type ProfileDraft } from "@/services/user.service";
import type { Viewer } from "@/lib/visibility";

import { ProfileEditForm } from "./ProfileEditForm";

interface ProfileEditSectionProps {
  viewer: Viewer;
  userId: string;
  firstName: string;
  lastName: string;
  draft: ProfileDraft;
}

export async function ProfileEditSection({
  viewer,
  userId,
  firstName,
  lastName,
  draft,
}: ProfileEditSectionProps) {
  const [tagCatalog, clubCatalog] = await Promise.all([
    listTagCatalog(viewer),
    listClubCatalog(viewer),
  ]);

  return (
    <ProfileEditForm
      userId={userId}
      firstName={firstName}
      lastName={lastName}
      draft={draft}
      tagCatalog={tagCatalog}
      clubCatalog={clubCatalog}
    />
  );
}
