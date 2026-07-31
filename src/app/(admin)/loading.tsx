// ============================================================================
// src/app/(admin)/loading.tsx
// `(admin)` route qrupunun yüklənmə ekranı (Blok 12C · D bəndi).
//
// 🔴 NİYƏ `loading.tsx` YALNIZ BU QRUPDADIR — ÖLÇÜLMÜŞ SƏBƏB.
//
// `loading.tsx` route seqmentini AXINLA (streaming) render edir: cavabın
// başlığı — o cümlədən HTTP STATUSU — məzmun hazır olmamışdan ƏVVƏL göndərilir.
// Nəticədə seqment sonradan `notFound()` çağırsa belə status artıq 200-dür və
// istifadəçi «yumşaq 404» alır (səhifədə «tapılmadı» yazır, protokol isə
// «tapıldı» deyir).
//
// Bu, layihə üçün REAL regresdir:
//   · `(app)` və `(public)` qruplarında **25 səhifə** `notFound()` çağırır
//     (sinif slug-ı, tədbir id-si, hüquqi səhifə slug-ı…);
//   · «yoxdur» ilə «icazə yoxdur» QƏSDƏN ayırd edilmir (PLAN.md §4.3) — 200
//     cavabı ünvanın MÖVCUDLUĞUNU təsdiqləyir və qapını bir qədər açır;
//   · üç mövcud e2e testi məhz 404 statusunu ölçür (`public.spec.ts`,
//     `events.spec.ts`, `public-nav.spec.ts`).
//
// ÖLÇÜ: `(app)/loading.tsx` ilə `/class/<mövcud-olmayan>` **200** qaytarırdı;
// fayl silinəndən sonra **404**. Ona görə həmin iki qrupda skeleton
// SƏHİFƏ SƏVİYYƏSİNDƏKİ `Suspense` sərhədləri ilə verilir (onlar statusu
// dəyişmir, çünki `notFound()` onlardan ƏVVƏL, səhifənin öz gövdəsində işləyir).
//
// `(admin)` qrupunda isə HEÇ BİR səhifə `notFound()` çağırmır — yəni burada
// axınla render heç nəyi pozmur və skeleton sərbəst işlədilə bilər.
// ============================================================================

import { PageSkeleton } from "@/components/shared/PageSkeleton";

export default function AdminLoading() {
  return <PageSkeleton cards={4} label="İdarəetmə ekranı yüklənir" />;
}
