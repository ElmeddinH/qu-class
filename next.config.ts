import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔴 Docker deploy üçün (bax `Dockerfile` və `docs/DECISIONS.md` → QD-018).
  // `next build` əlavə olaraq `.next/standalone/` yaradır: minimal `server.js`
  // + YALNIZ həqiqətən import olunan `node_modules` faylları. Bu olmadan
  // runtime image-ə bütün `node_modules` (~1.5 GB) kopyalanmalı olardı.
  //
  // ⚠️ TƏLƏ: standalone çıxışı `public/` və `.next/static/` qovluqlarını
  // İÇİNƏ ALMIR — onlar Dockerfile-da ƏL İLƏ kopyalanır. Unudulsa səhifə
  // açılır, amma CSS/JS 404 verir (bax `Dockerfile` → runner mərhələsi).
  output: "standalone",
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
