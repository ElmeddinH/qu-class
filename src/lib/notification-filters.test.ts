// ============================================================================
// src/lib/notification-filters.test.ts
// Bildiriş mərkəzinin [M15] URL vəziyyəti — SAF modul testi.
//
// ⚠️ Bu faylda SAHİBLİK qaydası yoxdur və olmamalıdır: `recipientId =
// viewer.userId` şərti SERVİSDƏDİR (`notification.service.ts`) və inteqrasiya
// testi ilə ölçülür. Burada yalnız URL ↔ obyekt çevirməsi yoxlanılır.
// ============================================================================

import { describe, expect, it } from "vitest";

import { NOTIFICATION_TYPE_VALUES } from "./enums";
import {
  FIRST_NOTIFICATION_PAGE,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PARAMS,
  NOTIFICATION_STATUS_VALUES,
  NOTIFICATIONS_PATH,
  activeNotificationFilterCount,
  emptyNotificationFilters,
  hasActiveNotificationFilters,
  notificationPageCount,
  notificationSkipOf,
  notificationsHref,
  parseNotificationParams,
  serializeNotificationParams,
} from "./notification-filters";

describe("parse ↔ serialize dövrəsi", () => {
  it("boş filtr kanonik ünvanı verir", () => {
    expect(notificationsHref(emptyNotificationFilters())).toBe(NOTIFICATIONS_PATH);
    expect(notificationsHref()).toBe(NOTIFICATIONS_PATH);
  });

  it("hər status × hər tip üçün dövrə qapanır", () => {
    for (const status of NOTIFICATION_STATUS_VALUES) {
      for (const type of NOTIFICATION_TYPE_VALUES) {
        const filters = { status, type, page: 3 };
        expect(parseNotificationParams(serializeNotificationParams(filters))).toEqual(
          filters,
        );
      }
    }
  });

  it("`page = 1` URL-ə YAZILMIR (link təmiz qalır)", () => {
    const query = serializeNotificationParams({
      status: "unread",
      type: null,
      page: FIRST_NOTIFICATION_PAGE,
    });

    expect(query.has(NOTIFICATION_PARAMS.page)).toBe(false);
    expect(query.get(NOTIFICATION_PARAMS.status)).toBe("unread");
  });

  it("🔴 naməlum dəyər 404 VERMİR — filtr səssizcə atılır", () => {
    const parsed = parseNotificationParams({
      [NOTIFICATION_PARAMS.status]: "yarımoxunmuş",
      [NOTIFICATION_PARAMS.type]: "NAMƏLUM_TİP",
    });

    expect(parsed.status).toBeNull();
    expect(parsed.type).toBeNull();
  });

  it("səhv səhifə nömrəsi birinci səhifəyə düşür", () => {
    for (const raw of ["0", "-3", "abc", "1.5", ""]) {
      expect(
        parseNotificationParams({ [NOTIFICATION_PARAMS.page]: raw }).page,
        raw,
      ).toBe(FIRST_NOTIFICATION_PAGE);
    }
  });

  it("`URLSearchParams` və obyekt eyni nəticəni verir", () => {
    const search = new URLSearchParams({ status: "read", type: "SYSTEM", page: "2" });
    expect(parseNotificationParams(search)).toEqual(
      parseNotificationParams({ status: "read", type: "SYSTEM", page: "2" }),
    );
  });
});

describe("aktiv filtr sayı", () => {
  it("səhifə nömrəsi FİLTR SAYILMIR", () => {
    // «Sıfırla» düyməsi səhifəni də atır, amma «2 filtr aktivdir» yazısı
    // səhifə nömrəsini saymamalıdır.
    expect(activeNotificationFilterCount({ status: null, type: null, page: 7 })).toBe(0);
    expect(hasActiveNotificationFilters({ status: null, type: null, page: 7 })).toBe(false);
  });

  it("status və tip ayrı-ayrılıqda sayılır", () => {
    expect(activeNotificationFilterCount({ status: "unread", type: null, page: 1 })).toBe(1);
    expect(
      activeNotificationFilterCount({ status: "unread", type: "SYSTEM", page: 1 }),
    ).toBe(2);
  });
});

describe("səhifələmə", () => {
  it("boş siyahıda da ən azı bir səhifə var", () => {
    expect(notificationPageCount(0)).toBe(1);
  });

  it("sərhəd dəyərləri düzgün yuvarlaqlaşır", () => {
    expect(notificationPageCount(NOTIFICATION_PAGE_SIZE)).toBe(1);
    expect(notificationPageCount(NOTIFICATION_PAGE_SIZE + 1)).toBe(2);
  });

  it("`skip` səhifə ölçüsünə uyğundur", () => {
    expect(notificationSkipOf({ status: null, type: null, page: 1 })).toBe(0);
    expect(notificationSkipOf({ status: null, type: null, page: 3 })).toBe(
      NOTIFICATION_PAGE_SIZE * 2,
    );
  });

  it("diapazondan kənar səhifə mənfi `skip` vermir", () => {
    expect(notificationSkipOf({ status: null, type: null, page: 0 })).toBe(0);
  });
});
