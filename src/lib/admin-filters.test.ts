// ============================================================================
// src/lib/admin-filters.test.ts
// Admin cədvəllərinin URL vəziyyəti — parse ↔ serialize DÖVRƏSİ.
//
// Dövrə testi mövcud nümunənin təkrarıdır (`directory-filters`,
// `event-filters`, `memory-filters`): serialize edilmiş vəziyyət yenidən
// parse ediləndə EYNİ obyekti verməlidir. Ayrılsalar «filtri dəyiş → səhifə
// dəyiş → filtr itdi» sinfindən səhvlər yaranır.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  ADMIN_USER_PAGE_SIZE,
  ADMIN_USER_PARAMS,
  AUDIT_PAGE_SIZE,
  AUDIT_PARAMS,
  DEFAULT_ADMIN_USER_SORT,
  FIRST_ADMIN_PAGE,
  MODERATION_PAGE_SIZE,
  MODERATION_PARAMS,
  adminPageCount,
  adminSkipOf,
  adminUsersHref,
  auditDateRange,
  auditHref,
  emptyAdminUserFilters,
  emptyAuditFilters,
  emptyModerationFilters,
  moderationHref,
  parseAdminUserParams,
  parseAuditParams,
  parseModerationParams,
  serializeAdminUserParams,
  serializeAuditParams,
  serializeModerationParams,
} from "./admin-filters";

describe("moderasiya filtrləri", () => {
  it("boş giriş → boş vəziyyət", () => {
    expect(parseModerationParams({})).toEqual(emptyModerationFilters());
  });

  it("parse ↔ serialize dövrəsi", () => {
    const state = {
      status: "IN_REVIEW" as const,
      entityType: "MEMORY" as const,
      reason: "PRIVACY" as const,
      page: 4,
    };
    expect(parseModerationParams(serializeModerationParams(state))).toEqual(state);
  });

  it("naməlum dəyər 404 VERMİR — filtr sadəcə nəzərə alınmır", () => {
    const state = parseModerationParams({
      [MODERATION_PARAMS.status]: "SILINIB",
      [MODERATION_PARAMS.entityType]: "???",
      [MODERATION_PARAMS.reason]: "  ",
    });
    expect(state).toEqual(emptyModerationFilters());
  });

  it("`ACCESSIBILITY` növü QƏBUL EDİLİR (Blok 11A enum əlavəsi)", () => {
    // Əlçatanlıq biletləri növbədə ayrıca süzülə bilməlidir.
    expect(
      parseModerationParams({ [MODERATION_PARAMS.entityType]: "ACCESSIBILITY" })
        .entityType,
    ).toBe("ACCESSIBILITY");
  });

  it("birinci səhifə URL-ə YAZILMIR (təmiz ünvan)", () => {
    const query = serializeModerationParams({
      ...emptyModerationFilters(),
      page: FIRST_ADMIN_PAGE,
    });
    expect(query.has(MODERATION_PARAMS.page)).toBe(false);
  });

  it("etibarsız səhifə birinciyə düşür", () => {
    for (const raw of ["0", "-3", "abc", "1.5", ""]) {
      expect(parseModerationParams({ page: raw }).page).toBe(FIRST_ADMIN_PAGE);
    }
  });

  it("href səhifə yolunu saxlayır", () => {
    expect(moderationHref(emptyModerationFilters())).toBe("/admin/moderation");
    expect(moderationHref({ ...emptyModerationFilters(), page: 2 })).toBe(
      "/admin/moderation?page=2",
    );
  });
});

describe("istifadəçi cədvəli filtrləri", () => {
  it("parse ↔ serialize dövrəsi", () => {
    const state = {
      q: "Aysel",
      role: "UNIVERSITY_ADMIN" as const,
      stage: "ALUMNI" as const,
      cohort: "maliyye-2022",
      sort: "email" as const,
      page: 3,
    };
    expect(parseAdminUserParams(serializeAdminUserParams(state))).toEqual(state);
  });

  it("default sıralama URL-ə YAZILMIR", () => {
    const query = serializeAdminUserParams(emptyAdminUserFilters());
    expect(query.has(ADMIN_USER_PARAMS.sort)).toBe(false);
    expect(parseAdminUserParams({}).sort).toBe(DEFAULT_ADMIN_USER_SORT);
  });

  it("naməlum sıralama açarı defolta düşür", () => {
    expect(parseAdminUserParams({ [ADMIN_USER_PARAMS.sort]: "salary" }).sort).toBe(
      DEFAULT_ADMIN_USER_SORT,
    );
  });

  it("axtarış sətri kənar boşluqlardan təmizlənir, boş sətir `null` olur", () => {
    expect(parseAdminUserParams({ q: "  Aysel  " }).q).toBe("Aysel");
    expect(parseAdminUserParams({ q: "   " }).q).toBeNull();
  });

  it("href filtrləri saxlayır", () => {
    const href = adminUsersHref({
      ...emptyAdminUserFilters(),
      role: "UNIVERSITY_ADMIN",
      page: 2,
    });
    expect(href).toContain("/admin/users?");
    expect(href).toContain("role=UNIVERSITY_ADMIN");
    expect(href).toContain("page=2");
  });
});

describe("audit filtrləri", () => {
  it("parse ↔ serialize dövrəsi", () => {
    const state = {
      actor: "usr-1",
      entityType: "CohortMembership",
      action: "ROLE_CHANGE" as const,
      from: "2026-01-01",
      to: "2026-06-30",
      page: 5,
    };
    expect(parseAuditParams(serializeAuditParams(state))).toEqual(state);
  });

  it("🔴 `entityType` ENUM DEYİL — model adı da qəbul olunur", () => {
    // `AuditLog.entityType` tarixən model adlarını daşıyır. Enum kimi
    // doğrulasaydıq mövcud sətirlərin bir hissəsi filtrdə görünməzdi.
    expect(parseAuditParams({ [AUDIT_PARAMS.entityType]: "CohortMembership" }).entityType).toBe(
      "CohortMembership",
    );
    expect(parseAuditParams({ [AUDIT_PARAMS.entityType]: "SisImport" }).entityType).toBe(
      "SisImport",
    );
  });

  it("`action` isə ENUM-dur — naməlum dəyər süzülür", () => {
    expect(parseAuditParams({ [AUDIT_PARAMS.action]: "PURGE" }).action).toBeNull();
    expect(parseAuditParams({ [AUDIT_PARAMS.action]: "MODERATE" }).action).toBe("MODERATE");
  });

  it("səhv formada tarix nəzərə alınmır", () => {
    for (const raw of ["01.01.2026", "2026-13-40", "dünən", "2026-1-1"]) {
      expect(parseAuditParams({ [AUDIT_PARAMS.from]: raw }).from).toBeNull();
    }
  });

  it("🔴 `to` GÜNÜN SONUNA qədər daxildir", () => {
    // `lte: 2026-01-05T00:00` yazsaydıq həmin günün saat 14:00-dakı sətri
    // düşərdi — sakit və tapılması çətin səhv.
    const range = auditDateRange({
      ...emptyAuditFilters(),
      from: "2026-01-01",
      to: "2026-01-05",
    });

    expect(range.gte?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.lt?.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("tarix verilməsə aralıq BOŞ obyektdir (şərt ümumiyyətlə qurulmur)", () => {
    expect(auditDateRange(emptyAuditFilters())).toEqual({});
  });

  it("href səhifə yolunu saxlayır", () => {
    expect(auditHref(emptyAuditFilters())).toBe("/admin/audit");
  });
});

describe("səhifələmə köməkçiləri", () => {
  it("skip səhifə ölçüsünə görə hesablanır", () => {
    expect(adminSkipOf(1, MODERATION_PAGE_SIZE)).toBe(0);
    expect(adminSkipOf(3, MODERATION_PAGE_SIZE)).toBe(2 * MODERATION_PAGE_SIZE);
    // Diapazondan kənar dəyər sıxılır — mənfi `skip` Prisma-da xətadır.
    expect(adminSkipOf(0, ADMIN_USER_PAGE_SIZE)).toBe(0);
    expect(adminSkipOf(-5, AUDIT_PAGE_SIZE)).toBe(0);
  });

  it("boş nəticədə də ən azı bir səhifə var", () => {
    expect(adminPageCount(0, AUDIT_PAGE_SIZE)).toBe(1);
    expect(adminPageCount(1, AUDIT_PAGE_SIZE)).toBe(1);
    expect(adminPageCount(AUDIT_PAGE_SIZE + 1, AUDIT_PAGE_SIZE)).toBe(2);
  });
});
