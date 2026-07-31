// ============================================================================
// src/features/profile/StoryHeader.tsx
// "My Class Story" başlığı: banner + avatar + ad + mərhələ və sinif rozetləri.
//
// ⚠️ Burada HEÇ BİR gizlətmə məntiqi yoxdur. `redactProfile()` görünməməli
// sahəni obyektdən TAMAMİLƏ SİLİR (null qoymur), ona görə `"field" in profile`
// yoxlaması kifayətdir. Banner isə servisdə `avatarUrl`-in görünürlüyünə
// bağlanır (bax `getProfile`) — komponent sadəcə gələni göstərir.
//
// ⚠️ Mərhələ `resolveStage(cohort)`-dan gəlir (servis hesablayır), `User.stage`
// keşindən YOX — CLAUDE.md və PLAN.md §4.6.
// ============================================================================

import Image from "next/image";
import { MapPin } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cohortRoleLabel, stageLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ProfileResult } from "@/services/user.service";

interface StoryHeaderProps {
  result: ProfileResult;
}

/**
 * Ünvan `/api/upload`-un qaytardığı YERLİ yoldurmu?
 *
 * ⚠️ `//host/…` (protokolsuz xarici ünvan) da `/` ilə başlayır — ona görə
 * yoxlama tam prefiksdir, sadəcə birinci simvol deyil.
 */
function isLocalUpload(url: string): boolean {
  return url.startsWith("/uploads/");
}

export function StoryHeader({ result }: StoryHeaderProps) {
  const { profile, stage, cohorts, coverUrl } = result;

  const location = [profile.currentCity, profile.currentCountry]
    .filter(Boolean)
    .join(", ");

  return (
    <header className="overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds">
      {/* Banner — şəkil yoxdursa KUDS qradiyenti (boş ekran buraxılmır). */}
      <div
        className={cn(
          "relative h-32 w-full bg-ku-soft sm:h-40",
          !coverUrl && "bg-gradient-to-r from-ku-dark via-ku-green to-ku-soft",
        )}
      >
        {/* 🔴 İKİ YOL, ÇÜNKİ MƏNBƏ İKİ CÜRDÜR (Blok 12C).
            `coverUrl` sxemdə sərbəst mətndir (`schemas.ts` → `imageField`):
            ya `/api/upload`-un qaytardığı YERLİ yol (`/uploads/…`), ya da
            istifadəçinin yapışdırdığı XARİCİ ünvan.

            · Yerli yol → `next/image`: `sizes` ilə responsiv, AVIF/WebP-yə
              çevrilir və `priority` LCP-ni sürətləndirir (banner ekranın ən
              üstündədir). Tapşırığın «public/uploads da daxil» tələbi budur.
            · Xarici ünvan → adi `<img>`: `next/image` hostu
              `next.config.ts` → `images.remotePatterns`-də tələb edir və
              naməlum host ÇALIŞMA ZAMANI 400 verərdi. Hər hostu ağ siyahıya
              yazmaq isə optimizatoru açıq proksiyə çevirər. */}
        {coverUrl ? (
          isLocalUpload(coverUrl) ? (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          )
        ) : null}
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar className="-mt-8 h-20 w-20 rounded-avatar border-4 border-surface bg-surface sm:-mt-12 sm:h-24 sm:w-24">
            {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-ku-soft text-h2 font-semibold text-ku-dark">
              {profile.firstName.charAt(0)}
              {profile.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-1 flex-col gap-2">
            <h1 className="text-h1 font-bold text-text-primary">
              {profile.firstName} {profile.lastName}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {stage ? (
                <Badge className="bg-ku-soft text-ku-dark hover:bg-ku-soft">
                  {stageLabel(stage)}
                </Badge>
              ) : null}

              {cohorts.map((cohort) => (
                <Badge key={cohort.id} variant="outline">
                  {cohort.displayName}
                  {cohort.role !== "MEMBER" ? ` · ${cohortRoleLabel(cohort.role)}` : ""}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {location || profile.hometown ? (
          <p className="flex flex-wrap items-center gap-x-6 gap-y-1 text-small text-text-secondary">
            {location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {location}
              </span>
            ) : null}
            {profile.hometown ? <span>Doğma şəhər: {profile.hometown}</span> : null}
          </p>
        ) : null}
      </div>
    </header>
  );
}
