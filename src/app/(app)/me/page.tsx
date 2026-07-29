import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";

/**
 * `/me` — öz profilinə qısayol.
 *
 * Naviqasiyadakı «Profilim» linki bura göstərir; profil səhifəsi isə
 * `/u/[userId]`-dədir (Blok 7-də tam "My Class Story" olacaq). Ayrıca səhifə
 * saxlamırıq ki, iki yerdə eyni görünüş dublikat olmasın.
 */
export default async function MePage() {
  const viewer = await requireUser();
  redirect(`/u/${viewer.userId}`);
}
