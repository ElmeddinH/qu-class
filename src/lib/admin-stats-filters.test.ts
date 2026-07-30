// ============================================================================
// src/lib/admin-stats-filters.test.ts
// `/admin/stats` sinif filtrinin parse ↔ serialize dövrəsi (Blok 12B).
//
// ⚠️ `map-filters.test.ts` ilə eyni nümunə: modul SAFDIR, ona görə bazasız
// yoxlanılır. Filtrin ÖZÜ (Prisma `where`-ə düşməsi və k-anonimlik) inteqrasiya
// testindədir — `tests/integration/stats.db.test.ts`.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  ADMIN_STATS_PARAMS,
  adminStatsHref,
  adminStatsQueryString,
  emptyAdminStatsFilters,
  parseAdminStatsParams,
  serializeAdminStatsParams,
} from "./admin-stats-filters";

describe("parseAdminStatsParams", () => {
  it("boş giriş → bütün universitet", () => {
    expect(parseAdminStatsParams({})).toEqual({ cohortId: null });
    expect(parseAdminStatsParams(new URLSearchParams())).toEqual({ cohortId: null });
  });

  it("`?cohort=` oxunur", () => {
    expect(parseAdminStatsParams({ cohort: "chr-01" })).toEqual({ cohortId: "chr-01" });
    expect(
      parseAdminStatsParams(new URLSearchParams("cohort=chr-01")),
    ).toEqual({ cohortId: "chr-01" });
  });

  it("boş və yalnız boşluqdan ibarət dəyər `null` sayılır", () => {
    expect(parseAdminStatsParams({ cohort: "" }).cohortId).toBeNull();
    expect(parseAdminStatsParams({ cohort: "   " }).cohortId).toBeNull();
  });

  it("massiv formasında gələn parametrdən BİRİNCİSİ götürülür", () => {
    expect(parseAdminStatsParams({ cohort: ["chr-01", "chr-02"] }).cohortId).toBe("chr-01");
  });

  it("🔴 naməlum id 404 vermir — mövcudluq SERVERDƏ yoxlanılır", () => {
    // Modul saf parse edir; sinfin varlığı `AdminStatsPanel`-də kataloqla
    // tutuşdurulur (yoxdursa universitet miqyasına düşür).
    expect(parseAdminStatsParams({ cohort: "yoxdur" }).cohortId).toBe("yoxdur");
  });
});

describe("serializeAdminStatsParams", () => {
  it("default (bütün universitet) URL-ə YAZILMIR", () => {
    expect(adminStatsQueryString(emptyAdminStatsFilters())).toBe("");
    expect(adminStatsHref(emptyAdminStatsFilters())).toBe("/admin/stats");
  });

  it("seçim URL-ə yazılır", () => {
    const href = adminStatsHref({ cohortId: "chr-01" });
    expect(href).toBe(`/admin/stats?${ADMIN_STATS_PARAMS.cohort}=chr-01`);
  });

  it("dövrə: parse(serialize(f)) === f", () => {
    for (const filters of [{ cohortId: null }, { cohortId: "chr-07" }]) {
      expect(parseAdminStatsParams(serializeAdminStatsParams(filters))).toEqual(filters);
    }
  });
});
