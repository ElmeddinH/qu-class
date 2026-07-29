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
      {
        // Avatarlar — DiceBear API (xarici şəkil yükləmə yoxdur, bax prisma/seed.ts)
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
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
