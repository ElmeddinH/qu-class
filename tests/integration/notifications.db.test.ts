// @vitest-environment node
// ============================================================================
// tests/integration/notifications.db.test.ts
// Blok 11A [M15] — bildiriş mərkəzinin REAL BAZAYA qarşı yoxlanışı.
//
// 🔴 FAYLIN ƏSAS SUALI: SAHİBLİK QAPISI İŞLƏYİRMİ?
// Bildiriş dörd səviyyəli görünürlük modelinə DÜŞMÜR — onun `visibility`
// sütunu yoxdur. Yeganə qayda `recipientId = viewer.userId`-dir və o,
// `visibilityWhere` ilə HƏLL OLUNMUR. Ona görə üç şey ayrıca ölçülür:
//   1. siyahı YALNIZ sahibin sətirlərini qaytarır
//   2. BAŞQASININ bildirişini oxunmuş işarələmək MÜMKÜN DEYİL
//   3. «hamısını oxunmuş et» başqasının sətrinə TOXUNMUR
//
// ⚠️ Fayl YAZIR (`readAt` sütununu dəyişir), ona görə `memories.db.test.ts` ilə
// eyni intizam: dəyişdirilən HƏR sətir `finally` / `afterAll`-da GERİ QAYTARILIR
// — seed determinizmi pozulmamalıdır (növbəti icra eyni bazanı görməlidir).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotificationType } from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";
import {
  countNotifications,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

const ALL = 1000;

function viewerFor(userId: string): UserViewer {
  // Bildiriş qapısı YALNIZ `userId`-dən asılıdır — cohort üzvlüyü və rol
  // burada rol OYNAMIR (bu, məhz sınanan xassədir).
  return {
    kind: "USER",
    userId,
    cohortIds: [],
    systemRole: "USER",
    moderatedCohortIds: [],
  };
}

/** Bildirişi çox olan iki müxtəlif istifadəçi — seed-dən seçilir. */
let ownerId: string;
let strangerId: string;

/** Testin dəyişdirdiyi sətirlər: `id` → əvvəlki `readAt`. */
const touched = new Map<string, Date | null>();

async function remember(ids: string[]): Promise<void> {
  const rows = await prisma.notification.findMany({
    where: { id: { in: ids } },
    select: { id: true, readAt: true },
  });
  for (const row of rows) {
    if (!touched.has(row.id)) touched.set(row.id, row.readAt);
  }
}

beforeAll(async () => {
  const grouped = await prisma.notification.groupBy({
    by: ["recipientId"],
    _count: { _all: true },
    orderBy: { _count: { recipientId: "desc" } },
    take: 2,
  });

  expect(grouped.length, "seed-də ən azı iki alıcı olmalıdır").toBe(2);
  ownerId = grouped[0].recipientId;
  strangerId = grouped[1].recipientId;
});

afterAll(async () => {
  // Bütün dəyişikliklər geri qaytarılır — seed sayları və dəyərləri eyni qalır.
  for (const [id, readAt] of touched) {
    await prisma.notification.update({ where: { id }, data: { readAt } });
  }
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Siyahı — sahiblik
// ---------------------------------------------------------------------------

describe("listNotifications", () => {
  it("🔴 YALNIZ `recipientId = viewer.userId` sətirləri qaytarılır", async () => {
    const rows = await listNotifications(viewerFor(ownerId), { take: ALL });

    expect(rows.length).toBeGreaterThan(0);

    // Servis `recipientId` sahəsini cavaba QOYMUR (sxem qərarı), ona görə
    // yoxlama DB-dən aparılır: qayıdan hər `id` sahibin sətri olmalıdır.
    const ids = rows.map((row) => row.id);
    const foreign = await prisma.notification.count({
      where: { id: { in: ids }, recipientId: { not: ownerId } },
    });

    expect(foreign, "başqasının bildirişi siyahıya düşüb").toBe(0);
  });

  it("🔴 başqa istifadəçinin sətri BAŞQA nəticə verir (siyahılar kəsişmir)", async () => {
    const [mine, theirs] = await Promise.all([
      listNotifications(viewerFor(ownerId), { take: ALL }),
      listNotifications(viewerFor(strangerId), { take: ALL }),
    ]);

    const mineIds = new Set(mine.map((row) => row.id));
    const overlap = theirs.filter((row) => mineIds.has(row.id));

    expect(overlap).toHaveLength(0);
  });

  it("mövcud olmayan istifadəçi üçün siyahı BOŞDUR (xəta yox)", async () => {
    const rows = await listNotifications(viewerFor("usr-yoxdur"), { take: ALL });
    expect(rows).toHaveLength(0);
  });

  it("`countNotifications` siyahı ilə EYNİ şərtdən keçir", async () => {
    const [rows, total] = await Promise.all([
      listNotifications(viewerFor(ownerId), { take: ALL }),
      countNotifications(viewerFor(ownerId)),
    ]);

    expect(total).toBe(rows.length);
  });

  it("oxunma filtri işləyir və cəmləri uzlaşır", async () => {
    const viewer = viewerFor(ownerId);

    const [unread, read, total] = await Promise.all([
      countNotifications(viewer, { unread: true }),
      countNotifications(viewer, { unread: false }),
      countNotifications(viewer),
    ]);

    expect(unread + read).toBe(total);
  });

  it("`countUnreadNotifications` filtrli sayla eynidir", async () => {
    const viewer = viewerFor(ownerId);

    const [badge, filtered] = await Promise.all([
      countUnreadNotifications(viewer),
      countNotifications(viewer, { unread: true }),
    ]);

    expect(badge).toBe(filtered);
  });

  it("tip filtri yalnız seçilmiş növü qaytarır", async () => {
    const rows = await listNotifications(viewerFor(ownerId), {
      type: NotificationType.SYSTEM,
      take: ALL,
    });

    for (const row of rows) expect(row.type).toBe(NotificationType.SYSTEM);
  });

  it("səhifələmə (`skip`/`take`) sətirləri təkrarlamır", async () => {
    const viewer = viewerFor(ownerId);
    const [first, second] = await Promise.all([
      listNotifications(viewer, { take: 3, skip: 0 }),
      listNotifications(viewer, { take: 3, skip: 3 }),
    ]);

    const overlap = second.filter((row) => first.some((f) => f.id === row.id));
    expect(overlap).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Oxunmuş işarələmə — sahiblik
// ---------------------------------------------------------------------------

describe("markNotificationRead", () => {
  it("🔴 BAŞQASININ bildirişini oxunmuş etmək MÜMKÜN DEYİL", async () => {
    const foreign = await prisma.notification.findFirstOrThrow({
      where: { recipientId: strangerId, readAt: null },
      select: { id: true, readAt: true },
    });

    await remember([foreign.id]);

    const result = await markNotificationRead(viewerFor(ownerId), foreign.id);

    // Cavab `NOT_FOUND` ilə `FORBIDDEN` arasında fərq QOYMUR — mövcudluq faktı
    // da məlumatdır.
    expect(result.changed).toBe(0);

    const after = await prisma.notification.findUniqueOrThrow({
      where: { id: foreign.id },
      select: { readAt: true },
    });
    expect(after.readAt, "başqasının sətri DƏYİŞİB").toBeNull();
  });

  it("öz bildirişini oxunmuş edir", async () => {
    const own = await prisma.notification.findFirstOrThrow({
      where: { recipientId: ownerId, readAt: null },
      select: { id: true },
    });

    await remember([own.id]);

    const result = await markNotificationRead(viewerFor(ownerId), own.id);
    expect(result.changed).toBe(1);

    const after = await prisma.notification.findUniqueOrThrow({
      where: { id: own.id },
      select: { readAt: true },
    });
    expect(after.readAt).not.toBeNull();
  });

  it("ARTIQ oxunmuş bildirişin vaxt möhürü DƏYİŞMİR", async () => {
    const own = await prisma.notification.findFirstOrThrow({
      where: { recipientId: ownerId, readAt: { not: null } },
      select: { id: true, readAt: true },
    });

    await remember([own.id]);

    const result = await markNotificationRead(viewerFor(ownerId), own.id);
    expect(result.changed).toBe(0);

    const after = await prisma.notification.findUniqueOrThrow({
      where: { id: own.id },
      select: { readAt: true },
    });
    expect(after.readAt?.getTime()).toBe(own.readAt?.getTime());
  });

  it("mövcud olmayan `id` üçün `changed: 0`", async () => {
    const result = await markNotificationRead(viewerFor(ownerId), "ntf-yoxdur");
    expect(result.changed).toBe(0);
  });
});

describe("markAllNotificationsRead", () => {
  it("🔴 yalnız SAHİBİN oxunmamışları işarələnir", async () => {
    const [mineBefore, theirsBefore] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: ownerId, readAt: null },
        select: { id: true },
      }),
      prisma.notification.count({ where: { recipientId: strangerId, readAt: null } }),
    ]);

    await remember(mineBefore.map((row) => row.id));

    const result = await markAllNotificationsRead(viewerFor(ownerId));

    expect(result.changed).toBe(mineBefore.length);
    expect(await countUnreadNotifications(viewerFor(ownerId))).toBe(0);

    // 🔴 Başqasının oxunmamışları TOXUNULMAZ qalır.
    expect(
      await prisma.notification.count({
        where: { recipientId: strangerId, readAt: null },
      }),
    ).toBe(theirsBefore);
  });

  it("ikinci çağırış `changed: 0` verir (xəta deyil)", async () => {
    const result = await markAllNotificationsRead(viewerFor(ownerId));
    expect(result.changed).toBe(0);
  });
});
