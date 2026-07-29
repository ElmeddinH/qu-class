// ============================================================================
// src/lib/relation-diff.ts
// Əlaqə sahələrinin YAZILMA məntiqi — saf, Prisma-sız, testlə örtülü.
//
// 🔴 BU FAYLIN SƏBƏBİ: OXU ilə YAZI SİMMETRİK DEYİL.
// `buildProfileView()` 7 əlaqə sahəsini DÜZLƏNDİRİR — `interests` sadəcə
// sətir massivi kimi görünür. Yazı tərəfində isə həmin "massiv" `UserTag`
// SƏTİRLƏRİDİR: maraq əlavə etmək sətir YARATMAQ, çıxarmaq sətir SİLMƏK
// deməkdir. Formadan gələn "son vəziyyəti" birbaşa yazmaq mümkün deyil.
//
// Ən sadə yol — "hamısını sil, yenidən yarat" — üç səbəbdən rədd edildi:
//   1. `UserTag.level` (dil bacarığı) itərdi və yenidən yazılardı;
//   2. hər saxlamada N silmə + N yaratma — dəyişməyən sətirlər də toxunulur;
//   3. gələcəkdə `UserTag`-a `createdAt` / `endorsedBy` əlavə olunsa məlumat
//      səssizcə sıfırlanardı.
// Ona görə DİFF hesablanır: yalnız həqiqətən dəyişən sətirlər yazılır.
//
// ⚠️ Bu modul `services/`-dən import olunur, yəni `features/*`-da YAŞAYA
// BİLMƏZ (istiqamət həmişə features → services → lib).
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Taqlar (interests / hobbies / skills / languages)
// ---------------------------------------------------------------------------

export interface UserTagState {
  tagId: string;
  /** Yalnız `type = LANGUAGE` taqlarında doldurulur (A1…C2 | NATIVE). */
  level: string | null;
}

export interface UserTagDiff {
  /** Yeni `UserTag` sətirləri. */
  created: UserTagState[];
  /** `tagId` qalır, YALNIZ `level` dəyişib — sətir yenilənir, silinmir. */
  updated: UserTagState[];
  /** Silinəcək `UserTag` sətirlərinin `tagId`-ləri. */
  removedTagIds: string[];
}

/**
 * Cari və hədəf taq dəstini müqayisə edir.
 *
 * @param current DB-dəki mövcud `UserTag` sətirləri
 * @param next    formanın göndərdiyi SON vəziyyət
 *
 * Təkrarlanan `tagId` (formada eyni taq iki dəfə) SƏSSİZCƏ atılır — `UserTag`
 * ilkin açarı `[userId, tagId]`-dir, dublikat `create` P2002 verərdi.
 */
export function diffUserTags(
  current: readonly UserTagState[],
  next: readonly UserTagState[],
): UserTagDiff {
  const currentMap = new Map(current.map((tag) => [tag.tagId, tag.level]));
  const nextMap = new Map<string, string | null>();
  for (const tag of next) {
    if (!nextMap.has(tag.tagId)) nextMap.set(tag.tagId, tag.level);
  }

  const created: UserTagState[] = [];
  const updated: UserTagState[] = [];

  for (const [tagId, level] of nextMap) {
    if (!currentMap.has(tagId)) {
      created.push({ tagId, level });
      continue;
    }
    // `null` və `""` fərqi DB-yə düşməməlidir — ikisi də "səviyyə yoxdur".
    if ((currentMap.get(tagId) ?? null) !== (level ?? null)) {
      updated.push({ tagId, level });
    }
  }

  const removedTagIds = [...currentMap.keys()].filter((tagId) => !nextMap.has(tagId));

  return { created, updated, removedTagIds };
}

// ---------------------------------------------------------------------------
// 2. Sadə üzvlük dəstləri (klublar)
// ---------------------------------------------------------------------------

export interface IdSetDiff {
  added: string[];
  removed: string[];
}

/**
 * İki id dəsti arasındakı fərq — klub üzvlüyü üçün.
 *
 * ⚠️ `keep` MÜHAFİZƏ SİYAHISIDIR: burada olan id `removed`-a DÜŞMÜR.
 * Səbəb: klubda `BOARD` / `PRESIDENT` rolu klub tərəfindən verilir, istifadəçi
 * onu öz profil formasından "işarəni götürərək" ata bilməməlidir — əks halda
 * rol məlumatı bir kliklə itərdi. Formada belə sətirlər kilidli göstərilir,
 * server tərəfdə isə qoruma BURADA tətbiq olunur (UI-ya güvənilmir).
 */
export function diffIdSet(
  current: readonly string[],
  next: readonly string[],
  keep: readonly string[] = [],
): IdSetDiff {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  const keepSet = new Set(keep);

  return {
    added: [...nextSet].filter((id) => !currentSet.has(id)),
    removed: [...currentSet].filter((id) => !nextSet.has(id) && !keepSet.has(id)),
  };
}

// ---------------------------------------------------------------------------
// 3. Sahə görünürlüyü
// ---------------------------------------------------------------------------

export interface VisibilityEntry {
  field: string;
  level: string;
}

/**
 * YALNIZ HƏQİQƏTƏN DƏYİŞƏN görünürlük sətirlərini qaytarır.
 *
 * 🔴 NİYƏ VACİBDİR: `/me/edit` formasında hər sahənin yanında seçici var və
 * forma HAMISINI göndərir. Fərq hesablanmasa, toxunulmamış sahə üçün də
 * `FieldVisibility` sətri yazılardı. `phone` / `personalEmail` üçün bu,
 * görünən nəticəni dəyişməzdi (default onsuz da `PRIVATE`), amma sətrin
 * yaranması "istifadəçi bu səviyyəni QƏSDƏN seçdi" mənasını verir — halbuki
 * o, sadəcə bio-nu redaktə edib. Səviyyə dəyişmirsə DB-yə toxunulmur.
 *
 * @param current effektiv cari səviyyələr (DB sətri yoxdursa `defaultLevelFor`)
 */
export function changedVisibility(
  current: Readonly<Record<string, string>>,
  next: readonly VisibilityEntry[],
): VisibilityEntry[] {
  return next.filter((entry) => current[entry.field] !== entry.level);
}
