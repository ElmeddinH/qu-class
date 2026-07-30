// ============================================================================
// src/lib/public-event-filters.test.ts
// `/events` (ictimai siyahı) vaxt filtri — SAF modul testi.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_EVENT_WHEN,
  PUBLIC_EVENTS_PATH,
  PUBLIC_EVENT_PARAMS,
  PUBLIC_EVENT_WHEN_VALUES,
  parsePublicEventParams,
  publicEventsHref,
  serializePublicEventParams,
  upcomingFlagOf,
} from "./public-event-filters";

describe("parsePublicEventParams", () => {
  it("defolt `upcoming`-dir", () => {
    expect(parsePublicEventParams({}).when).toBe(DEFAULT_PUBLIC_EVENT_WHEN);
    expect(DEFAULT_PUBLIC_EVENT_WHEN).toBe("upcoming");
  });

  it("`past` seçilə bilir", () => {
    expect(parsePublicEventParams({ [PUBLIC_EVENT_PARAMS.when]: "past" }).when).toBe("past");
  });

  it("🔴 naməlum dəyər 404 VERMİR — defolta düşür", () => {
    expect(parsePublicEventParams({ [PUBLIC_EVENT_PARAMS.when]: "gələcək" }).when).toBe(
      DEFAULT_PUBLIC_EVENT_WHEN,
    );
  });

  it("`URLSearchParams` və obyekt eyni nəticəni verir", () => {
    expect(parsePublicEventParams(new URLSearchParams("when=past"))).toEqual(
      parsePublicEventParams({ when: "past" }),
    );
  });
});

describe("serialize", () => {
  it("🔴 DEFOLT dəyər URL-ə YAZILMIR (kanonik ünvan `/events`)", () => {
    // `/events` və `/events?when=upcoming` EYNİ səhifədir; ikisini də
    // yaratmaq dublikat kanonik ünvan deməkdir.
    expect(serializePublicEventParams({ when: "upcoming" }).toString()).toBe("");
    expect(publicEventsHref({ when: "upcoming" })).toBe(PUBLIC_EVENTS_PATH);
    expect(publicEventsHref()).toBe(PUBLIC_EVENTS_PATH);
  });

  it("defolt olmayan dəyər URL-də qalır", () => {
    expect(publicEventsHref({ when: "past" })).toBe("/events?when=past");
  });

  it("dövrə qapanır", () => {
    for (const when of PUBLIC_EVENT_WHEN_VALUES) {
      expect(parsePublicEventParams(serializePublicEventParams({ when })).when).toBe(when);
    }
  });
});

describe("upcomingFlagOf", () => {
  it("`listEvents` filtrinin gözlədiyi bool dəyərə çevrilir", () => {
    expect(upcomingFlagOf({ when: "upcoming" })).toBe(true);
    expect(upcomingFlagOf({ when: "past" })).toBe(false);
  });
});
