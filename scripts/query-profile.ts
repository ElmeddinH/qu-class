// ============================================================================
// scripts/query-profile.ts
// Blok 12C · B bəndi — N+1 SORĞU ÖLÇÜSÜ (`prisma:query` logu).
//
// İstifadə:  npm run audit:queries
//
// 🔴 SUAL: lent (feed), kataloq (directory) və xronologiya (timeline) bir
// səhifə üçün NEÇƏ SQL sorğusu göndərir və bu say SƏTİR SAYINDAN ASILIDIRMI?
// N+1-in tərifi məhz budur: 20 sətir → 21 sorğu, 40 sətir → 41 sorğu.
//
// 🔴 ÖLÇMƏ ÜSULU — SİNQLTONU QABAQLAMAQ.
// `src/lib/db.ts` klienti `globalThis.prisma`-dan oxuyur (dev hot-reload
// üçün). Ona görə skript ÖZ klientini — hadisə əsaslı `query` logu ilə —
// həmin qlobal açara YERLƏŞDİRİR və servisləri YALNIZ BUNDAN SONRA
// (dinamik `import()` ilə) yükləyir. Servis qatı heç nə bilmir, dəyişiklik
// tələb etmir və ölçmə REAL kodu ölçür.
//
// 🔴 ÖLÇÜ SAYI DEYİL, MEYLİ GÖSTƏRİR. Tək bir rəqəm («37 sorğu») mənasızdır;
// N+1 yalnız İKİ FƏRQLİ SƏHİFƏ ÖLÇÜSÜ müqayisə ediləndə görünür. Skript hər
// ssenarini `take=6` və `take=24` ilə işlədir və fərqi göstərir:
//   · fərq ≈ 0        → sabit sayda sorğu ✓
//   · fərq ≈ sətir sayı → N+1 🔴
//
// ⚠️ Skript YALNIZ OXUYUR (`listFeed`, `listDirectory`, `listTimeline`) —
// bazada heç nə dəyişmir.
// ============================================================================

import { PrismaClient } from "@prisma/client";

interface Recorder {
  count: number;
  reset: () => void;
}

/** Hadisə logu ilə klient qurur və onu `globalThis`-ə yerləşdirir. */
function installRecordingClient(): Recorder {
  const client = new PrismaClient({ log: [{ emit: "event", level: "query" }] });

  const recorder: Recorder = {
    count: 0,
    reset() {
      recorder.count = 0;
    },
  };

  // ⚠️ `$on("query", …)` yalnız `emit: "event"` ilə qurulmuş klientdə var;
  // tip səviyyəsində şərtlidir, ona görə burada bir dəfə daraldılır.
  (client as unknown as { $on: (event: "query", handler: () => void) => void }).$on(
    "query",
    () => {
      recorder.count += 1;
    },
  );

  (globalThis as unknown as { prisma: PrismaClient }).prisma = client;
  return recorder;
}

const recorder = installRecordingClient();

/**
 * Servis modullarını YÜKLƏYİR.
 *
 * ⚠️ Yükləmə funksiya İÇİNDƏDİR, modulun başında deyil: `tsx` bu skripti CJS
 * kimi çevirir və orada top-level `await` dəstəklənmir. Ardıcıllıq isə yenə
 * qorunur — `installRecordingClient()` modul qiymətləndirilərkən, import isə
 * `main()` çağırılanda işləyir.
 */
async function loadServices() {
  const [db, post, user, timeline, directoryFilters] = await Promise.all([
    import("@/lib/db"),
    import("@/services/post.service"),
    import("@/services/user.service"),
    import("@/services/timeline.service"),
    import("@/lib/directory-filters"),
  ]);

  return {
    prisma: db.prisma,
    listFeed: post.listFeed,
    listDirectory: user.listDirectory,
    listTimeline: timeline.listTimeline,
    emptyDirectoryFilters: directoryFilters.emptyDirectoryFilters,
  };
}

type Services = Awaited<ReturnType<typeof loadServices>>;

const MEMBER_EMAIL = "rep@qu.edu.az";

/** Kiçik və böyük səhifə — N+1 yalnız müqayisədə görünür. */
const SMALL = 6;
const LARGE = 24;

async function buildViewer(prisma: Services["prisma"]) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: MEMBER_EMAIL },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true } },
    },
  });

  return {
    viewer: {
      kind: "USER" as const,
      userId: user.id,
      cohortIds: user.memberships.map((entry) => entry.cohortId),
      systemRole: user.systemRole as "USER" | "UNIVERSITY_ADMIN",
      moderatedCohortIds: [],
    },
    cohortId: user.memberships[0].cohortId,
  };
}

interface Scenario {
  label: string;
  run: (take: number) => Promise<number>;
}

async function main() {
  const { prisma, listFeed, listDirectory, listTimeline, emptyDirectoryFilters } =
    await loadServices();

  const { viewer, cohortId } = await buildViewer(prisma);

  const scenarios: Scenario[] = [
    {
      label: "feed (listFeed)",
      run: async (take) => {
        const page = await listFeed(viewer, { cohortId, take });
        return page.items.length;
      },
    },
    {
      label: "directory (listDirectory)",
      run: async (take) => {
        const page = await listDirectory(viewer, {
          cohortId,
          filters: emptyDirectoryFilters(),
          take,
          skip: 0,
        });
        return page.items.length;
      },
    },
    {
      label: "timeline (listTimeline)",
      run: async (take) => {
        const page = await listTimeline(viewer, { cohortId, take, skip: 0 });
        return page.items.length;
      },
    },
  ];

  console.log("| Ssenari | sətir (kiçik → böyük) | sorğu (kiçik → böyük) | fərq | verdikt |");
  console.log("| --- | --- | --- | ---: | --- |");

  for (const scenario of scenarios) {
    // ⚠️ İlk çağırış «isti» olsun deyə əvvəlcədən bir dəfə işlədilir:
    // Prisma ilk sorğuda əlavə metadata sorğusu göndərə bilər və o, ölçüyə
    // yalançı +1 kimi düşərdi.
    await scenario.run(SMALL);

    recorder.reset();
    const smallRows = await scenario.run(SMALL);
    const smallQueries = recorder.count;

    recorder.reset();
    const largeRows = await scenario.run(LARGE);
    const largeQueries = recorder.count;

    const delta = largeQueries - smallQueries;
    const rowDelta = largeRows - smallRows;

    // N+1 = sorğu sayı sətir sayı ilə birlikdə artır.
    const verdict =
      delta === 0
        ? "✅ sabit"
        : delta >= rowDelta && rowDelta > 0
          ? "🔴 N+1"
          : `⚠️ ${delta} əlavə sorğu`;

    console.log(
      `| ${scenario.label} | ${smallRows} → ${largeRows} | ${smallQueries} → ${largeQueries} | ${delta} | ${verdict} |`,
    );
  }

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
