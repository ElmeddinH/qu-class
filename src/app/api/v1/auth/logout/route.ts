// ============================================================================
// src/app/api/v1/auth/logout/route.ts
// POST /api/v1/auth/logout — sessiyanı bağlayır (204).
//
// ⚠️ `redirect: false` — TƏLƏ D `signOut` üçün də keçərlidir: default olaraq
// yönləndirməyə çalışır və route handler-də `NEXT_REDIRECT` atır.
//
// ⚠️ `requireJson` burada DA var. Səbəb login ilə eynidir: cross-site form POST
// istifadəçini məcburi çıxarda bilər (təhlükəsizlik pozuntusu deyil, amma
// istənilməz davranışdır). Sənəddə boş JSON gövdəsi (`{}`) elan olunub ki,
// Swagger UI «Try it out» başlığı göndərsin.
//
// ⚠️ Sessiyası olmayan sorğu da 204 alır — çıxış İDEMPOTENTDİR. 401 qaytarmaq
// müştəri kodunu mənasız şaxəyə salardı ("çıxmaq üçün əvvəlcə girin").
// ============================================================================

import { unstable_rethrow } from "next/navigation";

import { signOut } from "@/auth";
import { requireJson } from "@/lib/api/guard";
import { fail, noContent } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const mediaTypeError = requireJson(request);
  if (mediaTypeError) return mediaTypeError;

  try {
    await signOut({ redirect: false });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/v1] logout:", error);
    return fail("INTERNAL");
  }

  return noContent();
}
