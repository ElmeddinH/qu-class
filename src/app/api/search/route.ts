// ============================================================================
// src/app/api/search/route.ts
// Qlobal axtarış endpoint-i [M16] — ⌘K palitrası bunu çağırır.
//
// ⚠️ Route handler `prisma.*` ÇAĞIRMIR (CLAUDE.md §4): `services/search.service`
// → dörd ayrı servis, hər biri öz görünürlük köməkçisi ilə. Məxfilik burada
// TƏKRAR QURULMUR.
//
// ⚠️ Endpoint anonim sorğuya da cavab verir və bu, QƏSDƏNDİR (`/api/feed` ilə
// eyni nümunə): `getViewer()` anonim viewer qaytarır, servislər isə onun üçün
// yalnız `PUBLIC` məzmun seçir. İstifadəçi bölməsi anonimə həmişə boş qayıdır —
// üzv siyahısı sinif daxili məlumatdır.
// ============================================================================

import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import {
  EMPTY_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
  PALETTE_LIMIT,
} from "@/lib/search";
import { searchEverything } from "@/services/search.service";

/** DB-dən oxuyur və nəticə viewer-dən asılıdır → statik render OLMAZ. */
export const dynamic = "force-dynamic";

const MAX_TAKE = 20;
/** Uzun sorğu sətri DB-ni yükləməsin — praktikada ad-soyad qısadır. */
const MAX_TERM_LENGTH = 100;

export async function GET(request: Request) {
  const viewer = await getViewer();
  const params = new URL(request.url).searchParams;

  const term = (params.get("q") ?? "").slice(0, MAX_TERM_LENGTH);

  // Qısa sorğu səhv DEYİL — palitra hər hərfdə çağırır, sadəcə boş nəticə.
  if (term.trim().length < MIN_SEARCH_LENGTH) {
    return NextResponse.json(EMPTY_SEARCH_RESULTS);
  }

  const rawTake = params.get("take");
  const take = rawTake === null ? PALETTE_LIMIT : Number.parseInt(rawTake, 10);
  if (Number.isNaN(take) || take < 1 || take > MAX_TAKE) {
    return NextResponse.json(
      { error: `«take» 1 ilə ${MAX_TAKE} arasında olmalıdır.` },
      { status: 400 },
    );
  }

  return NextResponse.json(await searchEverything(viewer, term, take));
}
