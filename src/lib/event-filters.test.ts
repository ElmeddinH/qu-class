// ============================================================================
// src/lib/event-filters.test.ts
// Tədbir filtrlərinin (spec §15, 6 filtr) parse ↔ serialize dövrəsi.
//
// Bu dövrə Blok 6-nın dərsidir: server (`parseEventParams`), client (nuqs →
// `filter-state.ts`) və səhifələmə linkləri EYNİ parametr adlarını işlətməsə
// filtr "işləyir, amma nəticə dəyişmir" olur — ən çətin tapılan səhv növü.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVENT_WHEN,
  EVENT_FORMAT_VALUES,
  EVENT_PAGE_SIZE,
  EVENT_PARAMS,
  EVENT_WHEN_VALUES,
  FIRST_EVENT_PAGE,
  activeEventFilterCount,
  classEventsHref,
  emptyEventFilters,
  eventPageCount,
  eventQueryString,
  eventSkipOf,
  hasActiveEventFilters,
  isOnlineFlagOf,
  parseAttendeeParams,
  parseEventParams,
  serializeEventParams,
  upcomingFlagOf,
  type EventFilterState,
} from "./event-filters";

describe("parseEventParams", () => {
  it("boş URL defolt vəziyyəti qaytarır", () => {
    expect(parseEventParams({})).toEqual(emptyEventFilters());
  });

  it("defolt `when` UPCOMING-dir (digər filtrlərdən fərqli — bax modul qeydi)", () => {
    expect(parseEventParams({}).when).toBe("UPCOMING");
    expect(DEFAULT_EVENT_WHEN).toBe("UPCOMING");
  });

  it("altı filtri də oxuyur", () => {
    const state = parseEventParams({
      when: "PAST",
      category: "SEMINAR",
      scope: "REUNION",
      faculty: "fac-1",
      club: "club-1",
      format: "ONLINE",
      page: "3",
    });

    expect(state).toEqual({
      when: "PAST",
      category: "SEMINAR",
      scope: "REUNION",
      facultyId: "fac-1",
      clubId: "club-1",
      format: "ONLINE",
      page: 3,
    });
  });

  it("`URLSearchParams` girişini də qəbul edir", () => {
    const params = new URLSearchParams({ scope: "CLUB", page: "2" });
    expect(parseEventParams(params).scope).toBe("CLUB");
    expect(parseEventParams(params).page).toBe(2);
  });

  it("massiv dəyərdən BİRİNCİ elementi götürür", () => {
    expect(parseEventParams({ scope: ["CLASS", "REUNION"] }).scope).toBe("CLASS");
  });

  // --- Naməlum dəyər 404 VERMİR, filtr sadəcə nəzərə alınmır ---

  it("naməlum kateqoriya nəzərə alınmır", () => {
    expect(parseEventParams({ category: "REUNION" }).category).toBeNull();
  });

  it("🔴 `REUNION` KATEQORİYA DEYİL — yalnız `scope`-da tanınır", () => {
    // Bu, bütün blokun ən vacib təsnifat qaydasıdır: iki siyahı kəsişmir.
    expect(parseEventParams({ category: "REUNION" }).category).toBeNull();
    expect(parseEventParams({ scope: "REUNION" }).scope).toBe("REUNION");
  });

  it("🔴 `CEREMONY` SCOPE DEYİL — yalnız `category`-də tanınır", () => {
    expect(parseEventParams({ scope: "CEREMONY" }).scope).toBeNull();
    expect(parseEventParams({ category: "CEREMONY" }).category).toBe("CEREMONY");
  });

  it("naməlum `when` / `format` defolta düşür", () => {
    expect(parseEventParams({ when: "SOMEDAY" }).when).toBe(DEFAULT_EVENT_WHEN);
    expect(parseEventParams({ format: "HYBRID" }).format).toBeNull();
  });

  it("xarab səhifə nömrəsi 1-ə düşür", () => {
    for (const page of ["0", "-3", "abc", "", "1.5"]) {
      expect(parseEventParams({ page }).page).toBe(FIRST_EVENT_PAGE);
    }
  });

  it("boş sətir dəyərləri `null` sayılır", () => {
    expect(parseEventParams({ faculty: "   ", club: "" }).facultyId).toBeNull();
    expect(parseEventParams({ faculty: "   ", club: "" }).clubId).toBeNull();
  });
});

describe("serializeEventParams", () => {
  it("defolt vəziyyət BOŞ sorğu sətri verir (link təmiz qalır)", () => {
    expect(serializeEventParams(emptyEventFilters()).toString()).toBe("");
    expect(eventQueryString(emptyEventFilters())).toBe("");
  });

  it("`when = UPCOMING` URL-ə YAZILMIR (defoltdur)", () => {
    const params = serializeEventParams({ ...emptyEventFilters(), when: "UPCOMING" });
    expect(params.has(EVENT_PARAMS.when)).toBe(false);
  });

  it("`page = 1` URL-ə yazılmır", () => {
    const params = serializeEventParams({ ...emptyEventFilters(), page: 1 });
    expect(params.has(EVENT_PARAMS.page)).toBe(false);
  });

  it("parse(serialize(f)) === f — tam dövrə", () => {
    const filters: EventFilterState = {
      when: "ALL",
      category: "WORKSHOP",
      scope: "FACULTY",
      facultyId: "fac-9",
      clubId: "club-2",
      format: "IN_PERSON",
      page: 5,
    };

    expect(parseEventParams(serializeEventParams(filters))).toEqual(filters);
  });

  it("hər `when` və `format` dəyəri dövrədən keçir", () => {
    for (const when of EVENT_WHEN_VALUES) {
      for (const format of EVENT_FORMAT_VALUES) {
        const filters = { ...emptyEventFilters(), when, format };
        expect(parseEventParams(serializeEventParams(filters))).toEqual(filters);
      }
    }
  });

  it("`classEventsHref` slug + sorğu sətrini birləşdirir", () => {
    expect(classEventsHref("sec2023", emptyEventFilters())).toBe("/class/sec2023/events");
    expect(classEventsHref("sec2023", { ...emptyEventFilters(), scope: "REUNION" })).toBe(
      "/class/sec2023/events?scope=REUNION",
    );
  });
});

describe("aktiv filtr sayı", () => {
  it("defolt vəziyyətdə sıfırdır", () => {
    expect(activeEventFilterCount(emptyEventFilters())).toBe(0);
    expect(hasActiveEventFilters(emptyEventFilters())).toBe(false);
  });

  it("səhifə nömrəsi filtr SAYILMIR", () => {
    expect(activeEventFilterCount({ ...emptyEventFilters(), page: 7 })).toBe(0);
  });

  it("altı filtrin hamısı sayılır", () => {
    expect(
      activeEventFilterCount({
        when: "PAST",
        category: "TRIP",
        scope: "CLUB",
        facultyId: "f",
        clubId: "c",
        format: "ONLINE",
        page: 1,
      }),
    ).toBe(6);
  });
});

describe("səhifələmə", () => {
  it("boş nəticədə də ən azı bir səhifə var", () => {
    expect(eventPageCount(0)).toBe(1);
  });

  it("səhifə sayı yuxarı yuvarlaqlaşır", () => {
    expect(eventPageCount(EVENT_PAGE_SIZE)).toBe(1);
    expect(eventPageCount(EVENT_PAGE_SIZE + 1)).toBe(2);
  });

  it("`skip` səhifədən hesablanır", () => {
    expect(eventSkipOf(emptyEventFilters())).toBe(0);
    expect(eventSkipOf({ ...emptyEventFilters(), page: 3 })).toBe(EVENT_PAGE_SIZE * 2);
  });

  it("diapazondan kənar səhifə mənfi `skip` vermir", () => {
    expect(eventSkipOf({ ...emptyEventFilters(), page: -5 })).toBe(0);
  });
});

describe("servis girişinə çevirmə", () => {
  it("`when` → `upcoming` bayrağı", () => {
    expect(upcomingFlagOf("UPCOMING")).toBe(true);
    expect(upcomingFlagOf("PAST")).toBe(false);
    // ⚠️ `ALL` üçün `undefined` — servis tarix şərtini ÜMUMİYYƏTLƏ qurmur.
    expect(upcomingFlagOf("ALL")).toBeUndefined();
  });

  it("`format` → `isOnline` bayrağı", () => {
    expect(isOnlineFlagOf("ONLINE")).toBe(true);
    expect(isOnlineFlagOf("IN_PERSON")).toBe(false);
    expect(isOnlineFlagOf(null)).toBeUndefined();
  });
});

describe("parseAttendeeParams (koordinator cədvəli)", () => {
  it("boş URL defolt vəziyyət verir", () => {
    expect(parseAttendeeParams({})).toEqual({ search: "", status: null, page: 1 });
  });

  it("üç parametri oxuyur", () => {
    expect(parseAttendeeParams({ q: "aysel", st: "REGISTERED", ap: "4" })).toEqual({
      search: "aysel",
      status: "REGISTERED",
      page: 4,
    });
  });

  it("tədbir siyahısının parametrləri ilə TOQQUŞMUR", () => {
    // `page` (tədbir siyahısı) və `ap` (iştirakçı cədvəli) ayrı açarlardır.
    const both = { page: "9", ap: "2" };
    expect(parseEventParams(both).page).toBe(9);
    expect(parseAttendeeParams(both).page).toBe(2);
  });
});
