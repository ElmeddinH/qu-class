import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `forbidden()` / `unauthorized()` naviqasiya funksiyalarını açır —
    // `requireAdmin()` və `requireCohortRole()` bunları işlədir və
    // `src/app/forbidden.tsx` sərhədini render edir (əsl 403 statusu ilə).
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      // ⚠️ `api.dicebear.com` SİLİNDİ — seed artıq profil şəkli yaratmır və
      // avatarlar onsuz da `next/image` ilə render olunmurdu (Radix
      // `AvatarImage` adi `<img>`-dir), yəni bu icazə ölü konfiq idi.
      {
        // Kart / cover şəkilləri — seed məzmunu üçün deterministik placeholder
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
