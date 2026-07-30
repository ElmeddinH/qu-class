// @vitest-environment node
// ============================================================================
// tests/integration/cover-privacy.db.test.ts
// Blok 12B · borc 2 — `coverUrl` 22-ci İDARƏ OLUNAN SAHƏ oldu.
//
// SUAL: profil banneri artıq ÖZ məxfilik açarına tabedirmi?
//
// Əvvəl `coverUrl` `CONTROLLED_PROFILE_FIELDS`-də DEYİLDİ və `getProfile()`
// onu `avatarUrl`-in görünürlüyünə "yamaqla" bağlayırdı
// (`coverUrl: "avatarUrl" in profile ? built.coverUrl : null`). Nəticə: banneri
// AYRICA gizlətmək mümkün deyildi, profil şəklini ictimai saxlayan adam
// bannerini gizlədə bilmirdi — və əksinə.
//
// 🔴 TƏLƏ T40 ölçüsü: sahə `buildProfileView()`-un qurduğu `view` obyektinə
// YAZILMALIDIR. Yazılmasa `redactProfile` `if (!(field in user)) continue`
// şərti ilə onu sadəcə atlayır və açar SƏSSİZCƏ işləməz.
//
// ⚠️ Fayl YAZIR (`coverUrl` sütunu + `FieldVisibility` sətirləri) — hər
// dəyişiklik `afterAll`-da GERİ QAYTARILIR (avatar-privacy.db.test.ts intizamı).
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Visibility } from "@/lib/enums";
import {
  ANONYMOUS,
  CONTROLLED_PROFILE_FIELDS,
  defaultLevelFor,
  type Viewer,
} from "@/lib/visibility";
import { getFieldVisibility, getProfile } from "@/services/user.service";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

const COVER = "https://example.test/cover-privacy-fixture.svg";
const AVATAR = "https://example.test/avatar-for-cover-test.svg";

let member: UserViewer; // rep@ — banneri olan tərəf
let classmate: UserViewer; // coordinator@ — eyni sinif
let outsider: UserViewer; // alumni@ — BAŞQA sinif
let admin: UserViewer;

let previousCoverUrl: string | null = null;
let previousAvatarUrl: string | null = null;
const previousLevels = new Map<string, string | null>();

async function setLevel(field: string, level: string) {
  await prisma.fieldVisibility.upsert({
    where: { userId_field: { userId: member.userId, field } },
    create: { userId: member.userId, field, level },
    update: { level },
  });
}

beforeAll(async () => {
  [member, classmate, outsider, admin] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("coordinator@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
    viewerOf("admin@qu.edu.az"),
  ]);

  // Sanity: sinif üzvlüyü fərqlidir, yoxsa CLASS/PRIVATE ayrımı ölçülməzdi.
  expect(classmate.cohortIds).toContain(member.cohortIds[0]);
  expect(outsider.cohortIds).not.toContain(member.cohortIds[0]);

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: member.userId },
    select: {
      coverUrl: true,
      avatarUrl: true,
      fieldVisibility: { where: { field: { in: ["coverUrl", "avatarUrl"] } } },
    },
  });

  previousCoverUrl = before.coverUrl;
  previousAvatarUrl = before.avatarUrl;
  for (const row of before.fieldVisibility) previousLevels.set(row.field, row.level);

  await prisma.user.update({
    where: { id: member.userId },
    data: { coverUrl: COVER, avatarUrl: AVATAR },
  });
});

afterAll(async () => {
  await prisma.user.update({
    where: { id: member.userId },
    data: { coverUrl: previousCoverUrl, avatarUrl: previousAvatarUrl },
  });

  for (const field of ["coverUrl", "avatarUrl"]) {
    const previous = previousLevels.get(field);
    if (previous === undefined) {
      await prisma.fieldVisibility.deleteMany({
        where: { userId: member.userId, field },
      });
    } else if (previous !== null) {
      await setLevel(field, previous);
    }
  }

  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Sahə siyahısına daxildir
// ---------------------------------------------------------------------------

describe("coverUrl idarə olunan sahədir", () => {
  it("`CONTROLLED_PROFILE_FIELDS`-in üzvüdür və defoltu CLASS-dır", () => {
    expect(CONTROLLED_PROFILE_FIELDS).toContain("coverUrl");
    // 🔴 Yeni sahə PUBLIC OLMUR (CLAUDE.md §"Məxfilik").
    expect(defaultLevelFor("coverUrl")).toBe(Visibility.CLASS);
  });

  it("`getFieldVisibility` sətri olmayan istifadəçi üçün də dəyər qaytarır", async () => {
    // Sətri qəsdən silirik — köhnə (backfill-dən əvvəlki) istifadəçi vəziyyəti.
    await prisma.fieldVisibility.deleteMany({
      where: { userId: member.userId, field: "coverUrl" },
    });

    const levels = await getFieldVisibility(member);
    expect(levels.coverUrl).toBe(Visibility.CLASS);

    await setLevel("coverUrl", Visibility.CLASS);
  });
});

// ---------------------------------------------------------------------------
// 2. Redaksiya — `buildProfileView` sahəni `view`-a qoyur, `redactProfile` görür
// ---------------------------------------------------------------------------

describe("coverUrl redaksiyası", () => {
  it("PRIVATE → sahibdən BAŞQA heç kim görmür", async () => {
    await setLevel("coverUrl", Visibility.PRIVATE);

    const [own, byClassmate, byAdmin] = await Promise.all([
      getProfile(member, member.userId),
      getProfile(classmate, member.userId),
      // 🔴 PRIVATE məzmun UNIVERSITY_ADMIN üçün də oxunmur.
      getProfile(admin, member.userId),
    ]);

    expect(own?.coverUrl).toBe(COVER);
    expect(byClassmate?.coverUrl).toBeNull();
    expect(byAdmin?.coverUrl).toBeNull();

    // Ad-soyad qalır — redaksiya "hər şeyi gizlət" demək deyil.
    expect(byClassmate?.profile.firstName).toBeTruthy();
  });

  it("CLASS → yalnız eyni sinif; başqa sinif və anonim görmür", async () => {
    await setLevel("coverUrl", Visibility.CLASS);

    const [byClassmate, byOutsider] = await Promise.all([
      getProfile(classmate, member.userId),
      getProfile(outsider, member.userId),
    ]);

    expect(byClassmate?.coverUrl).toBe(COVER);
    expect(byOutsider?.coverUrl).toBeNull();
  });

  it("PUBLIC → anonim ziyarətçi də görür", async () => {
    await setLevel("coverUrl", Visibility.PUBLIC);

    const byAnonymous = await getProfile(ANONYMOUS, member.userId);
    expect(byAnonymous?.coverUrl).toBe(COVER);
  });

  // 🔴 BORCUN ƏSAS ÖLÇÜSÜ: iki sahə bir-birindən MÜSTƏQİLDİR.
  it("banner `avatarUrl`-dən ASILI DEYİL (hər iki istiqamətdə)", async () => {
    await setLevel("avatarUrl", Visibility.PRIVATE);
    await setLevel("coverUrl", Visibility.CLASS);

    const shownCoverOnly = await getProfile(classmate, member.userId);
    expect(shownCoverOnly?.coverUrl).toBe(COVER);
    expect(shownCoverOnly?.profile.avatarUrl).toBeUndefined();

    await setLevel("avatarUrl", Visibility.CLASS);
    await setLevel("coverUrl", Visibility.PRIVATE);

    const shownAvatarOnly = await getProfile(classmate, member.userId);
    expect(shownAvatarOnly?.coverUrl).toBeNull();
    expect(shownAvatarOnly?.profile.avatarUrl).toBe(AVATAR);
  });
});
