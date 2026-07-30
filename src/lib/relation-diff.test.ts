// ============================================================================
// src/lib/relation-diff.test.ts
// Əlaqə sahələrinin YAZILMA məntiqi — Blok 7-nin ən vacib saf funksiyaları.
//
// Niyə vahid test kifayətdir: bu funksiyalar Prisma-ya toxunmur, yalnız
// "cari dəst" ilə "hədəf dəst" arasındakı fərqi hesablayır. İnteqrasiya testi
// (`tests/integration/profile.db.test.ts`) isə həmin fərqin DB-də düzgün
// tətbiq olunduğunu yoxlayır — iki qat, iki sual.
// ============================================================================

import { describe, expect, it } from "vitest";

import { changedVisibility, diffIdSet, diffUserTags } from "./relation-diff";

describe("diffUserTags", () => {
  it("yeni taq `created`-ə düşür", () => {
    const diff = diffUserTags([], [{ tagId: "t1", level: null }]);

    expect(diff.created).toEqual([{ tagId: "t1", level: null }]);
    expect(diff.updated).toEqual([]);
    expect(diff.removedTagIds).toEqual([]);
  });

  it("çıxarılan taq `removedTagIds`-ə düşür", () => {
    const diff = diffUserTags([{ tagId: "t1", level: null }], []);

    expect(diff.removedTagIds).toEqual(["t1"]);
    expect(diff.created).toEqual([]);
  });

  it("DƏYİŞMƏYƏN taq heç bir siyahıya düşmür (sətir toxunulmur)", () => {
    const current = [
      { tagId: "t1", level: null },
      { tagId: "t2", level: "B2" },
    ];

    const diff = diffUserTags(current, current);

    expect(diff).toEqual({ created: [], updated: [], removedTagIds: [] });
  });

  it("yalnız `level` dəyişəndə sətir SİLİNMİR, yenilənir", () => {
    // 🔴 Bu, "hamısını sil, yenidən yarat" yanaşmasının rədd səbəbidir:
    // sətir silinsəydi `UserTag`-dakı digər məlumat da (gələcəkdə `createdAt`,
    // `endorsedBy`) itərdi.
    const diff = diffUserTags(
      [{ tagId: "lang-en", level: "B1" }],
      [{ tagId: "lang-en", level: "C1" }],
    );

    expect(diff.updated).toEqual([{ tagId: "lang-en", level: "C1" }]);
    expect(diff.removedTagIds).toEqual([]);
    expect(diff.created).toEqual([]);
  });

  it("`null` ilə boş dəyəri EYNİ sayır — mənasız yeniləmə yaranmır", () => {
    const diff = diffUserTags(
      [{ tagId: "t1", level: null }],
      [{ tagId: "t1", level: null }],
    );

    expect(diff.updated).toEqual([]);
  });

  it("hədəf dəstdəki dublikat taq atılır (P2002 qarşısı)", () => {
    // `UserTag` ilkin açarı `[userId, tagId]`-dir: eyni taq iki dəfə
    // göndərilsə `createMany` unikallıq pozuntusu verərdi.
    const diff = diffUserTags(
      [],
      [
        { tagId: "t1", level: null },
        { tagId: "t1", level: "B2" },
      ],
    );

    expect(diff.created).toEqual([{ tagId: "t1", level: null }]);
  });

  it("qarışıq dəyişikliyi tam hesablayır", () => {
    const diff = diffUserTags(
      [
        { tagId: "keep", level: null },
        { tagId: "level-change", level: "A2" },
        { tagId: "drop", level: null },
      ],
      [
        { tagId: "keep", level: null },
        { tagId: "level-change", level: "C2" },
        { tagId: "add", level: null },
      ],
    );

    expect(diff.created).toEqual([{ tagId: "add", level: null }]);
    expect(diff.updated).toEqual([{ tagId: "level-change", level: "C2" }]);
    expect(diff.removedTagIds).toEqual(["drop"]);
  });
});

describe("diffIdSet", () => {
  it("əlavə və çıxarılanı ayırır", () => {
    const diff = diffIdSet(["a", "b"], ["b", "c"]);

    expect(diff.added).toEqual(["c"]);
    expect(diff.removed).toEqual(["a"]);
  });

  it("`keep` siyahısındaki id SİLİNMİR", () => {
    // 🔴 Klub rəhbərliyi (BOARD / PRESIDENT) profil formasından atıla bilməz:
    // rolu klub verir, istifadəçi işarəni götürməklə onu ata bilməməlidir.
    const diff = diffIdSet(["club-1", "club-2"], [], ["club-1"]);

    expect(diff.removed).toEqual(["club-2"]);
    expect(diff.added).toEqual([]);
  });

  it("dublikatlar nəticəni şişirtmir", () => {
    const diff = diffIdSet(["a"], ["b", "b", "b"]);

    expect(diff.added).toEqual(["b"]);
    expect(diff.removed).toEqual(["a"]);
  });
});

describe("changedVisibility", () => {
  const current = { bio: "CLASS", phone: "PRIVATE", hometown: "PUBLIC" };

  it("dəyişməyən sahə üçün heç nə qaytarmır", () => {
    const changes = changedVisibility(current, [
      { field: "bio", level: "CLASS" },
      { field: "phone", level: "PRIVATE" },
    ]);

    expect(changes).toEqual([]);
  });

  it("yalnız dəyişən sahəni qaytarır", () => {
    const changes = changedVisibility(current, [
      { field: "bio", level: "PUBLIC" },
      { field: "phone", level: "PRIVATE" },
      { field: "hometown", level: "PUBLIC" },
    ]);

    expect(changes).toEqual([{ field: "bio", level: "PUBLIC" }]);
  });

  it("🔴 `phone` toxunulmayanda DB-yə YAZILMIR (səssiz açılma yoxdur)", () => {
    // Forma 22 sahəni birlikdə göndərir. Fərq süzülməsəydi bio redaktə edən
    // istifadəçi üçün `phone` sətri də yazılardı — səviyyə eyni qalsa da bu,
    // "istifadəçi qəsdən seçdi" mənasını verərdi.
    const changes = changedVisibility(current, [
      { field: "bio", level: "UNIVERSITY" },
      { field: "phone", level: "PRIVATE" },
      { field: "hometown", level: "PUBLIC" },
    ]);

    expect(changes.map((entry) => entry.field)).toEqual(["bio"]);
  });

  it("cari xəritədə OLMAYAN sahə dəyişiklik sayılır (yeni sahə → sətir yaranır)", () => {
    const changes = changedVisibility({}, [{ field: "skills", level: "CLASS" }]);

    expect(changes).toEqual([{ field: "skills", level: "CLASS" }]);
  });
});
