// ============================================================================
// src/app/(admin)/loading.tsx
// `(admin)` route qrupunun yüklənmə ekranı.
//
// 🔴 BURADA `loading.tsx` NİYƏ TƏHLÜKƏSİZDİR — ÖLÇÜLMÜŞ SƏBƏB (Blok 12C/12D).
//
// `loading.tsx` route seqmentini AXINLA (streaming) render edir: cavabın
// başlığı — o cümlədən HTTP STATUSU — məzmun hazır olmamışdan ƏVVƏL göndərilir.
// Nəticədə seqment sonradan `notFound()` çağırsa belə status artıq 200-dür və
// istifadəçi «yumşaq 404» alır (səhifədə «tapılmadı» yazır, protokol isə
// «tapıldı» deyir).
//
// ÖLÇÜ: `(app)/loading.tsx` ilə `/class/<mövcud-olmayan>` **200** qaytarırdı;
// fayl silinəndən sonra **404**. Üç mövcud e2e testi məhz statusu ölçür
// (`public.spec.ts`, `events.spec.ts`, `public-nav.spec.ts`).
//
// `(admin)` qrupunda isə HEÇ BİR səhifə `notFound()` çağırmır:
//   · doqquz admin səhifəsinin heç birində mövcudluq qapısı yoxdur — hamısı
//     siyahı/panel səhifəsidir;
//   · yeganə status qapısı `(admin)/layout.tsx` → `requireAdmin()` → 403-dür,
//     o isə bu sərhəddən KƏNARDA, LAYOUT-da işləyir. Next `loading.tsx`-i
//     layout-un ÖVLADLARININ ətrafına qoyur, yəni `forbidden()` axın
//     başlamamışdan əvvəl atılır və status 403 qalır.
//
// Blokun tam A/B bölgüsü: `docs/responsive/report.md` §1.
//
// ⚠️ Bu, QRUP KÖKÜDÜR və bütün alt ağaca şamil olunur — burada saxlanılmasının
// şərti yuxarıdakı ikinci bənddir (alt ağacda `notFound()` YOXDUR). Cədvəl
// formalı iki səhifə (`/admin/users`, `/admin/audit`) öz DAR seqmentində bunu
// üstələyir, çünki kart qridi skeletonu cədvəl üçün səhv hündürlük verir.
// ============================================================================

import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AdminLoading() {
  return <PageSkeleton variant="cards" count={4} label="İdarəetmə ekranı yüklənir" />;
}
