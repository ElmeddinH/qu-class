import { describe, expect, it } from "vitest";

import { UserStage } from "@/lib/enums";

import {
  groupWidgetRows,
  widgetLayout,
  widgetOrder,
  type ClassHomeWidgetId,
} from "./order";

const STAGES = [UserStage.INCOMING, UserStage.STUDENT, UserStage.ALUMNI] as const;

/** spec §16 blok 4-14 — mərhələdən asılı olmayaraq hər səhifədə olmalıdır. */
const SPEC_WIDGETS: ClassHomeWidgetId[] = [
  "welcome-message",
  "upcoming-events",
  "feed-preview",
  "recent-achievements",
  "recent-timeline",
  "new-members",
  "recent-memories",
  "directory-link",
  "where-are-we-now",
  "create-event",
  "create-post",
];

describe("widgetOrder", () => {
  it("hər mərhələdə spesifikasiya §16-nın 11 widget blokunu saxlayır", () => {
    for (const stage of STAGES) {
      const order = widgetOrder(stage);
      for (const id of SPEC_WIDGETS) {
        expect(order, `${stage} → ${id}`).toContain(id);
      }
    }
  });

  it("heç bir widget-i təkrarlamır", () => {
    for (const stage of STAGES) {
      const order = widgetOrder(stage);
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it("üç mərhələ üçün ÜÇ FƏRQLİ sıra verir (PLAN.md §4.6)", () => {
    const orders = STAGES.map((stage) => widgetOrder(stage).join(","));
    expect(new Set(orders).size).toBe(3);
  });

  it("INCOMING: tanışlıq və kampusa hazırlıq yuxarıdadır", () => {
    const order = widgetOrder(UserStage.INCOMING);

    expect(order.slice(0, 6)).toEqual([
      "intro-wizard",
      "welcome-message",
      "similar-members",
      "campus-prep",
      "khankendi-guide",
      "new-members",
    ]);
    // Lent və nailiyyətlər var, amma tanışlıqdan SONRA gəlir.
    expect(order.indexOf("feed-preview")).toBeGreaterThan(order.indexOf("similar-members"));
  });

  it("STUDENT: lent · tədbirlər · nailiyyətlər · timeline yuxarıdadır", () => {
    expect(widgetOrder(UserStage.STUDENT).slice(0, 4)).toEqual([
      "feed-preview",
      "upcoming-events",
      "recent-achievements",
      "recent-timeline",
    ]);
  });

  it("ALUMNI: İndi haradayıq · reunion · kataloq · dəstək yuxarıdadır", () => {
    expect(widgetOrder(UserStage.ALUMNI).slice(0, 4)).toEqual([
      "where-are-we-now",
      "reunions",
      "directory-link",
      "support-offers",
    ]);
  });

  it("mərhələyə xas widget başqa mərhələdə göstərilmir", () => {
    const student = widgetOrder(UserStage.STUDENT);

    for (const id of [
      "intro-wizard",
      "similar-members",
      "campus-prep",
      "khankendi-guide",
      "reunions",
      "support-offers",
    ] as ClassHomeWidgetId[]) {
      expect(student, id).not.toContain(id);
    }
  });

  it("prioritetdə sadalanan widget həmin mərhələdə göstərilə bilən olmalıdır", () => {
    // Prioritet siyahısına `stages` süzgəcindən keçməyən id yazılsa, widget
    // səssizcə itərdi. Bu test həmin sükutu səs-küyə çevirir.
    for (const stage of STAGES) {
      for (const id of widgetOrder(stage)) {
        const stages = widgetLayout(id).stages;
        expect(stages === undefined || stages.includes(stage), `${stage} → ${id}`).toBe(
          true,
        );
      }
    }
  });
});

describe("groupWidgetRows", () => {
  it("ardıcıl yarım-en widget-ləri bir sətrə yığır", () => {
    expect(groupWidgetRows(["welcome-message", "upcoming-events"])).toEqual([
      ["welcome-message", "upcoming-events"],
    ]);
  });

  it("tam-en widget həmişə tək sətirdə qalır", () => {
    expect(groupWidgetRows(["welcome-message", "feed-preview", "upcoming-events"])).toEqual([
      ["welcome-message"],
      ["feed-preview"],
      ["upcoming-events"],
    ]);
  });

  it("sıranı dəyişmir — düzləşdirilmiş nəticə girişlə eynidir", () => {
    for (const stage of STAGES) {
      const order = widgetOrder(stage);
      expect(groupWidgetRows(order).flat()).toEqual(order);
    }
  });

  it("bir sətirdə tam-en və yarım-en qarışmır", () => {
    for (const stage of STAGES) {
      for (const row of groupWidgetRows(widgetOrder(stage))) {
        const spans = new Set(row.map((id) => widgetLayout(id).span));
        expect(spans.size).toBe(1);
        if (spans.has("full")) expect(row.length).toBe(1);
      }
    }
  });
});
