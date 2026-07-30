// ============================================================================
// src/app/api/v1/cohorts/[slug]/members/route.ts
// GET /api/v1/cohorts/{slug}/members — sinif kataloqu, spec §8-in 13 filtri.
//
// 🔴 QUERY PARSE-I TƏKRAR YAZILMIR: `parseDirectoryParams` MƏHZ UI səhifəsinin
// (`(app)/class/[slug]/directory/page.tsx`) işlətdiyi funksiyadır. İki parse
// məntiqi olsaydı eyni URL UI-da və API-də FƏRQLİ nəticə verərdi — və fərq
// səssiz olardı (heç bir xəta yoxdur, sadəcə başqa sətirlər).
//
// 🔴 MƏXFİLİK İKİ QATDIR və ikisi də SERVİSDƏDİR:
//   1. `redactProfile` — görünməyən sahə obyektdə ÜMUMİYYƏTLƏ olmur.
//   2. `fieldVisibleWhere` — gizlədilmiş sahəyə görə FİLTRLƏMƏ də bloklanır
//      (T17). `?city=Bakı` filtri `currentCity`-ni gizlədən istifadəçini
//      nəticəyə salmır; əks halda dəyər kartda görünməsə də ÖYRƏNİLƏRDİ.
// Endpoint bu şərtləri TƏKRAR QURMUR — `listDirectory(viewer, …)` çağırır.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { DIRECTORY_PAGE_SIZE, parseDirectoryParams, skipOf } from "@/lib/directory-filters";
import { listDirectory } from "@/services/user.service";

export const dynamic = "force-dynamic";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    // Naməlum açar / dəyər 422 VERMİR — filtr sadəcə nəzərə alınmır (səhifə ilə
    // eyni davranış: URL əl ilə dəyişdirilə bilər, bu, səhv deyil).
    const filters = parseDirectoryParams(searchParams);

    const page = await listDirectory(viewer, {
      cohortId: scope.cohort.id,
      filters,
      take: DIRECTORY_PAGE_SIZE,
      skip: skipOf(filters),
    });

    return ok(page.items, {
      meta: {
        total: page.total,
        page: filters.page,
        pageSize: DIRECTORY_PAGE_SIZE,
      },
    });
  },
);
