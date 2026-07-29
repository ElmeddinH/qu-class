// ============================================================================
// src/app/api/feed/route.ts
// Lentin kursor əsaslı səhifələmə endpoint-i (infinite scroll).
//
// ⚠️ Route handler `prisma.*` ÇAĞIRMIR — `services/post.service.ts` →
// `listFeed(viewer, …)` (CLAUDE.md §4). Məxfilik süzgəci servisin içindədir.
//
// ⚠️ Endpoint ANONİM sorğuya da cavab verir və bu, QƏSDƏNDİR: `getViewer()`
// anonim viewer qaytarır, `listFeed` isə onun üçün yalnız `PUBLIC` postları
// seçir. Endpoint-i bağlamaq əvəzinə məxfiliyi mühərrikə tapşırmaq nümunəsi —
// `visibilityWhere` bir yerdə saxlanılır (CLAUDE.md §5).
// ============================================================================

import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { PostCategorySchema } from "@/lib/enums";
import { listFeed } from "@/services/post.service";

/** DB-dən oxuyur → statik render OLMAZ. */
export const dynamic = "force-dynamic";

const DEFAULT_TAKE = 20;
const MAX_TAKE = 50;

export async function GET(request: Request) {
  const viewer = await getViewer();
  const params = new URL(request.url).searchParams;

  const rawCategory = params.get("category");
  const category = rawCategory ? PostCategorySchema.safeParse(rawCategory) : null;
  if (category && !category.success) {
    return NextResponse.json({ error: "Kateqoriya tanınmadı." }, { status: 400 });
  }

  const rawTake = params.get("take");
  const parsedTake = rawTake === null ? DEFAULT_TAKE : Number.parseInt(rawTake, 10);
  if (Number.isNaN(parsedTake) || parsedTake < 1 || parsedTake > MAX_TAKE) {
    return NextResponse.json(
      { error: `«take» 1 ilə ${MAX_TAKE} arasında olmalıdır.` },
      { status: 400 },
    );
  }

  const page = await listFeed(viewer, {
    cohortId: params.get("cohortId") ?? undefined,
    category: category?.success ? category.data : undefined,
    cursor: params.get("cursor"),
    take: parsedTake,
  });

  return NextResponse.json(page);
}
