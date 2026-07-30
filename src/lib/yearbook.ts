// ============================================================================
// src/lib/yearbook.ts
// Digital Yearbook-un QRUPLAŞDIRMA qaydası — SAF modul (spec §11).
//
// 🔴 Prisma / React / servis importu YOXDUR. Səbəb `lib/milestones.ts` ilə
// eynidir: "hansı xatirə hansı bölməyə düşür" qaydası albomun mənasıdır və
// bazasız unit testlə bərkidilir (`yearbook.test.ts`).
//
// 🔴 BİR XATİRƏ YALNIZ BİR BÖLMƏDƏ. `yearbookSectionOf` TƏK dəyər qaytarır və
// `groupYearbook` hər qeydi məhz o bölməyə yazır — massiv qaytarsaydı eyni
// xatirə iki başlıq altında təkrarlanardı və albom "niyə iki dəfə yazılıb?"
// sualı ilə açılardı.
//
// ⚠️ SIRA QAYDASI: `guidePlaceId` doludursa qeyd NÖVÜNDƏN ASILI OLMAYARAQ
// «Sevimli yer» bölməsinə düşür (spec §11 tələbi — üçüncü sual məkanla
// bağlıdır). Yalnız bundan sonra növ cədvəlinə baxılır.
//
// ⚠️ Cədvəl `Record<MemoryType, YearbookSection>` tipindədir: `lib/enums.ts`-ə
// yeni xatirə növü əlavə olunsa `tsc` MƏHZ BURADA dayanır və növ səssizcə
// albomdan düşmür.
// ============================================================================

import { MemoryTypeSchema, type MemoryType } from "@/lib/enums";

/**
 * Albomun bölmələri.
 *
 * · MOMENT / LESSON / PLACE — spec §11-in ÜÇ SUALI (səhifədəki başlıqlar)
 * · STORY  — qalan iki növün evi. Sual bölməsi DEYİL, amma istifadəçi
 *   `showInYearbook` seçibsə xatirəsi SƏSSİZCƏ İTMƏMƏLİDİR.
 * · CLOSING — bağlanış sitat divarı (kart yox, sitat)
 */
export const YEARBOOK_SECTIONS = [
  "MOMENT",
  "LESSON",
  "PLACE",
  "STORY",
  "CLOSING",
] as const;

export type YearbookSection = (typeof YEARBOOK_SECTIONS)[number];

export interface YearbookSectionMeta {
  /** Səhifədəki başlıq. */
  title: string;
  /** Başlığın altındaki sual — albomun "sual-cavab" ruhu. */
  question: string;
  /** `wall` — sitat divarı (kart şəbəkəsi deyil). */
  layout: "cards" | "wall";
}

export const YEARBOOK_SECTION_META: Record<YearbookSection, YearbookSectionMeta> = {
  MOMENT: {
    title: "Yaddaqalan an",
    question: "Tələbəlikdən yadında ən çox nə qaldı?",
    layout: "cards",
  },
  LESSON: {
    title: "Unudulmaz dərs",
    question: "Hansı dərs və hansı müəllim səni dəyişdi?",
    layout: "cards",
  },
  PLACE: {
    title: "Sevimli yer",
    question: "Xankəndidə sənin üçün ən əziz yer hansıdır?",
    layout: "cards",
  },
  STORY: {
    title: "Sinif hekayələri",
    question: "Bu illərdən qalan digər hekayələr və təşəkkürlər.",
    layout: "cards",
  },
  CLOSING: {
    title: "Son söz",
    question: "Universitet mənə nə verdi və QU-ya mesajım.",
    layout: "wall",
  },
};

/**
 * Növ → bölmə.
 *
 * ⚠️ `PLACE` burada YOXDUR və olmamalıdır: məkan bölməsi növdən deyil,
 * `guidePlaceId`-dən asılıdır (aşağıdakı `yearbookSectionOf`).
 */
const TYPE_SECTION: Record<MemoryType, Exclude<YearbookSection, "PLACE">> = {
  SHORT_MEMORY: "MOMENT",
  MEMORABLE_EVENT: "MOMENT",
  UNFORGETTABLE_LESSON: "LESSON",
  THANKS_TEACHER: "LESSON",
  WHAT_UNI_GAVE_ME: "CLOSING",
  MESSAGE_TO_QU: "CLOSING",
  UNIVERSITY_STORY: "STORY",
  THANKS_CLASSMATE: "STORY",
};

/** Albomda göstərilmə sırası — səhifə bu sıra ilə render olunur. */
export const YEARBOOK_SECTION_ORDER: YearbookSection[] = [
  "MOMENT",
  "LESSON",
  "PLACE",
  "STORY",
  "CLOSING",
];

/** Bölmə üçün minimal qeyd forması — servisin qaytardığından daha dardır. */
export interface YearbookGroupable {
  /** DB sütunu `String`-dir; naməlum dəyər gələ bilər. */
  type: string;
  guidePlaceId: string | null;
}

/**
 * Qeydin bölməsi. Tanınmayan növ + məkansız qeyd → `null` (albomdan düşür).
 *
 * ⚠️ Naməlum növ MƏKANLA gələrsə yenə `PLACE`-ə düşür: məkan qaydası növdən
 * asılı deyil və qeyd oradadır, "naməlum" deyə.
 */
export function yearbookSectionOf(entry: YearbookGroupable): YearbookSection | null {
  if (entry.guidePlaceId !== null) return "PLACE";

  const parsed = MemoryTypeSchema.safeParse(entry.type);
  if (!parsed.success) return null;

  return TYPE_SECTION[parsed.data];
}

export interface YearbookGroup<T> {
  section: YearbookSection;
  meta: YearbookSectionMeta;
  items: T[];
}

/**
 * Qeydləri bölmələrə paylayır. Boş bölmə NƏTİCƏDƏ QALIR — səhifə "bu sual hələ
 * cavabsızdır" mesajını göstərə bilsin (boş ekran buraxma qaydası).
 * Sıra DB-dən gəldiyi kimi qorunur (albomda xronologiya vacibdir).
 */
export function groupYearbook<T extends YearbookGroupable>(
  entries: T[],
): Array<YearbookGroup<T>> {
  const buckets = new Map<YearbookSection, T[]>(
    YEARBOOK_SECTION_ORDER.map((section) => [section, []]),
  );

  for (const entry of entries) {
    const section = yearbookSectionOf(entry);
    if (section === null) continue;
    buckets.get(section)?.push(entry);
  }

  return YEARBOOK_SECTION_ORDER.map((section) => ({
    section,
    meta: YEARBOOK_SECTION_META[section],
    items: buckets.get(section) ?? [],
  }));
}

/** Albomda görünən ÜMUMİ qeyd sayı (bölməsizlər sayılmır). */
export function yearbookEntryCount(entries: YearbookGroupable[]): number {
  return entries.filter((entry) => yearbookSectionOf(entry) !== null).length;
}

// ---------------------------------------------------------------------------
// «Sevimli yer» bölməsinin daxili qruplaşması — məkan adına görə
// ---------------------------------------------------------------------------

export interface PlaceGroupable extends YearbookGroupable {
  guidePlaceTitle: string | null;
}

export interface PlaceGroup<T> {
  placeId: string;
  title: string;
  items: T[];
}

/** Adı olmayan məkan üçün yer tutucu — başlıqsız qrup göstərilmir. */
export const UNKNOWN_PLACE_TITLE = "Digər məkanlar";

/**
 * «Sevimli yer» qeydlərini məkana görə qruplaşdırır.
 * Sıra: ilk rast gəlinən məkan öndədir (giriş sırası qorunur).
 */
export function groupByPlace<T extends PlaceGroupable>(entries: T[]): Array<PlaceGroup<T>> {
  const groups: Array<PlaceGroup<T>> = [];
  const index = new Map<string, PlaceGroup<T>>();

  for (const entry of entries) {
    if (entry.guidePlaceId === null) continue;

    const existing = index.get(entry.guidePlaceId);
    if (existing) {
      existing.items.push(entry);
      continue;
    }

    const group: PlaceGroup<T> = {
      placeId: entry.guidePlaceId,
      title: entry.guidePlaceTitle ?? UNKNOWN_PLACE_TITLE,
      items: [entry],
    };
    index.set(entry.guidePlaceId, group);
    groups.push(group);
  }

  return groups;
}
