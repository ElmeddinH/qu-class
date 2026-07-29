// ============================================================================
// src/features/class-home/order.ts
// Class Page ana səhifəsinin WIDGET SIRASI — spec §16 + PLAN.md §4.6.
//
// 🔴 ÜÇ AYRI SƏHİFƏ YOXDUR. Tək `<ClassHome />` komponenti var; mərhələni
// (`INCOMING | STUDENT | ALUMNI`) yalnız BU FAYL şərh edir və nəticə bir sıra
// massividir.
//
// ⚠️ Bu fayl KOMPONENT İMPORT ETMİR — yalnız id, en və mərhələ məlumatı
// saxlayır. Səbəb: sıra məntiqi vahid testlə örtülüdür, komponentlər isə
// servis → Prisma → next-auth zəncirini gətirir və jsdom-da yüklənmir.
// Id → komponent uyğunluğu `registry.ts`-dədir və `Record<ClassHomeWidgetId, …>`
// tipindədir: bura yeni id əlavə etsən `tsc` orada dayanır.
//
// Sıra iki mənbədən qurulur:
//
//   1. `SPEC_ORDER` — spesifikasiya §16-nın 14 blokundan 4-14-ü, ORADAKI SIRA
//      ilə. Blok 1-3 (cover · sinif adı və məzuniyyət ili · üzv sayı) widget
//      deyil: onlar səhifənin kimliyidir və `ClassCover`-də sabit başlıq kimi
//      render olunur, mərhələdən asılı olaraq yerini dəyişmir.
//
//   2. `STAGE_PRIORITY` — PLAN.md §4.6 cədvəli: hansı widget-lər həmin
//      mərhələdə YUXARI qalxır. Spesifikasiya §16 da bunu tələb edir:
//      "Incoming Class mərhələsində kampusa hazırlıq və tanışlıq funksiyaları
//      daha yuxarıda təqdim edilməlidir."
//
// Yekun sıra = prioritet widget-lər + qalan spec sırası (dublikatsız),
// sonra `stages` süzgəci (mərhələyə xas widget başqa mərhələdə görünmür).
// ============================================================================

import { UserStage, type UserStage as UserStageType } from "@/lib/enums";

/**
 * Widget-in tutduğu en.
 *   `full` — bütün sətir · `half` — iki sütunlu sətirin yarısı.
 * `groupWidgetRows` ardıcıl `half` widget-ləri bir grid sətrinə yığır, `full`
 * olanları isə tək buraxır — belə ki, sırada boş xana yaranmasın.
 */
export type WidgetSpan = "full" | "half";

export interface WidgetLayout {
  span: WidgetSpan;
  /**
   * Widget yalnız bu mərhələlərdə göstərilir. Verilməzsə — HƏR mərhələdə
   * (spec §16 blokları belədir: onlar sinif səhifəsinin daimi hissəsidir).
   */
  stages?: readonly UserStageType[];
  /** Skeleton neçə sətir göstərsin (kartın təxmini hündürlüyü). */
  skeletonRows?: number;
}

export const CLASS_HOME_WIDGET_LAYOUT = {
  // --- spec §16 blok 4-14 ---
  "welcome-message": { span: "half", skeletonRows: 2 },
  "upcoming-events": { span: "half", skeletonRows: 3 },
  "feed-preview": { span: "full", skeletonRows: 4 },
  "recent-achievements": { span: "half", skeletonRows: 3 },
  "recent-timeline": { span: "half", skeletonRows: 3 },
  "new-members": { span: "half", skeletonRows: 2 },
  "recent-memories": { span: "half", skeletonRows: 3 },
  "directory-link": { span: "half", skeletonRows: 2 },
  "where-are-we-now": { span: "full", skeletonRows: 3 },
  "create-event": { span: "half", skeletonRows: 1 },
  "create-post": { span: "half", skeletonRows: 1 },

  // --- INCOMING: tanışlıq və kampusa hazırlıq ---
  "intro-wizard": { span: "full", stages: [UserStage.INCOMING], skeletonRows: 4 },
  "similar-members": { span: "full", stages: [UserStage.INCOMING], skeletonRows: 2 },
  "campus-prep": { span: "half", stages: [UserStage.INCOMING], skeletonRows: 2 },
  "khankendi-guide": { span: "half", stages: [UserStage.INCOMING], skeletonRows: 2 },

  // --- ALUMNI: görüşlər və dəstək ---
  "reunions": { span: "half", stages: [UserStage.ALUMNI], skeletonRows: 3 },
  "support-offers": { span: "half", stages: [UserStage.ALUMNI], skeletonRows: 3 },
} as const satisfies Record<string, WidgetLayout>;

export type ClassHomeWidgetId = keyof typeof CLASS_HOME_WIDGET_LAYOUT;

export function widgetLayout(id: ClassHomeWidgetId): WidgetLayout {
  return CLASS_HOME_WIDGET_LAYOUT[id];
}

/**
 * Spesifikasiya §16-nın blok 4-14-ü — ORADAKI SIRA ilə.
 * Blok 1-3 `ClassCover`-dədir (yuxarıdakı fayl başlığına bax).
 */
const SPEC_ORDER: readonly ClassHomeWidgetId[] = [
  "welcome-message", //      blok 4  — Welcome Message
  "upcoming-events", //      blok 5  — Qarşıdan gələn tədbirlər
  "feed-preview", //         blok 6  — Class Feed
  "recent-achievements", //  blok 7  — Son nailiyyətlər
  "recent-timeline", //      blok 8  — Timeline-dan son hadisələr
  "new-members", //          blok 9  — Yeni üzvlər
  "recent-memories", //      blok 10 — Son xatirələr
  "directory-link", //       blok 11 — Class Directory-yə keçid
  "where-are-we-now", //     blok 12 — Where Are We Now xülasəsi
  "create-event", //         blok 13 — Tədbir yarat düyməsi
  "create-post", //          blok 14 — Paylaşım yarat düyməsi
];

/** PLAN.md §4.6 cədvəli — mərhələdə yuxarı qalxan widget-lər. */
const STAGE_PRIORITY: Record<UserStageType, readonly ClassHomeWidgetId[]> = {
  // "Tanışlıq · kampusa hazırlıq · Xankəndi · yeni üzvlər" — üstündə isə
  // profili tamamlamağa çağıran sihirbaz və sinfin salamlama mesajı.
  INCOMING: [
    "intro-wizard",
    "welcome-message",
    "similar-members",
    "campus-prep",
    "khankendi-guide",
    "new-members",
  ],
  // "Feed · tədbirlər · nailiyyətlər · timeline"
  STUDENT: ["feed-preview", "upcoming-events", "recent-achievements", "recent-timeline"],
  // "Where Are We Now · reunion · directory · dəstək təklifləri"
  ALUMNI: ["where-are-we-now", "reunions", "directory-link", "support-offers"],
};

function isVisibleInStage(id: ClassHomeWidgetId, stage: UserStageType): boolean {
  const stages = widgetLayout(id).stages;
  return stages === undefined || stages.includes(stage);
}

/**
 * Mərhələyə görə yekun widget sırası.
 *
 * Prioritet siyahısı əvvəl gəlir, qalan spec blokları öz sırasını saxlayır və
 * dublikat yaranmır (prioritetdə olan bir daha əlavə edilmir).
 */
export function widgetOrder(stage: UserStageType): ClassHomeWidgetId[] {
  const priority = STAGE_PRIORITY[stage];
  const rest = SPEC_ORDER.filter((id) => !priority.includes(id));

  return [...priority, ...rest].filter((id) => isVisibleInStage(id, stage));
}

/**
 * Ardıcıl `half` widget-ləri bir grid sətrinə yığır.
 *
 * Səbəb: 2 sütunlu grid-də `full` element tək qalmış `half`-dan sonra gəlsə
 * yanında BOŞ XANA qalır. Qruplaşdırma sıranı olduğu kimi saxlayır, sadəcə
 * hər qrupu öz grid konteynerində render edir.
 */
export function groupWidgetRows(ids: ClassHomeWidgetId[]): ClassHomeWidgetId[][] {
  const rows: ClassHomeWidgetId[][] = [];

  for (const id of ids) {
    const current = rows[rows.length - 1];

    if (
      widgetLayout(id).span === "half" &&
      current !== undefined &&
      widgetLayout(current[0]).span === "half"
    ) {
      current.push(id);
      continue;
    }

    rows.push([id]);
  }

  return rows;
}
