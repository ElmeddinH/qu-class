// ============================================================================
// src/lib/ics.test.ts
// `.ics` faylının RFC 5545 uyğunluğu.
//
// NİYƏ TESTLƏ ÖRTÜLÜB: format səhvi SƏSSİZDİR — fayl yüklənir, brauzer onu
// təqvim proqramına verir, proqram isə xəbərdarlıq etmədən atır. DoD "təqvimdə
// düzgün açılır" tələb edir, bu testlər həmin tələbin avtomatlaşdırılmış
// hissəsidir.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVENT_DURATION_MS,
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  icsFileName,
  toIcsDateTime,
} from "./ics";

const NOW = new Date("2026-07-30T09:15:00.000Z");

const OPTIONS = {
  now: NOW,
  origin: "https://class.qu.edu.az",
  eventPath: "/events/evt-1",
};

function baseEvent() {
  return {
    id: "evt-1",
    title: "Buraxılış gecəsi",
    description: "Sinfin son görüşü",
    location: "Xankəndi, QU kampusu",
    url: null,
    startsAt: new Date("2026-08-15T14:00:00.000Z"),
    endsAt: new Date("2026-08-15T18:00:00.000Z"),
  };
}

/** Faylı sətirlərə ayırır (qatlanma açılmadan). */
function lines(ics: string): string[] {
  return ics.split("\r\n");
}

describe("toIcsDateTime", () => {
  it("UTC damğası qurur", () => {
    expect(toIcsDateTime(new Date("2026-07-30T14:00:00.000Z"))).toBe("20260730T140000Z");
  });

  it("millisaniyələr atılır", () => {
    expect(toIcsDateTime(new Date("2026-07-30T14:00:00.789Z"))).toBe("20260730T140000Z");
  });
});

describe("escapeIcsText", () => {
  it("nöqtəli vergül, vergül və yeni sətir qaçırılır", () => {
    expect(escapeIcsText("a;b,c\nd")).toBe("a\\;b\\,c\\nd");
  });

  it("🔴 tərs kəsik BİRİNCİ qaçırılır (ikiqat qaçırma olmasın)", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
    expect(escapeIcsText("a\\;b")).toBe("a\\\\\\;b");
  });

  it("CRLF tək `\\n`-ə çevrilir", () => {
    expect(escapeIcsText("a\r\nb")).toBe("a\\nb");
  });

  it("azərbaycan hərflərinə toxunmur", () => {
    expect(escapeIcsText("Buraxılış gecəsi")).toBe("Buraxılış gecəsi");
  });
});

describe("foldIcsLine", () => {
  it("qısa sətir dəyişmir", () => {
    expect(foldIcsLine("SUMMARY:Qısa")).toBe("SUMMARY:Qısa");
  });

  it("uzun sətir 75 oktetlik hissələrə bölünür", () => {
    const folded = foldIcsLine(`DESCRIPTION:${"a".repeat(200)}`);
    const parts = folded.split("\r\n");

    expect(parts.length).toBeGreaterThan(1);
    expect(new TextEncoder().encode(parts[0]).length).toBeLessThanOrEqual(75);
    for (const part of parts.slice(1)) {
      expect(part.startsWith(" ")).toBe(true);
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it("🔴 ölçü OKTETLƏ hesablanır, simvolla YOX", () => {
    // Azərbaycan hərfləri UTF-8-də 2 baytdır: 50 `ə` = 100 oktet, yəni sətir
    // 50 simvol olsa da qatlanmalıdır.
    const folded = foldIcsLine(`SUMMARY:${"ə".repeat(50)}`);
    expect(folded).toContain("\r\n ");
    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it("qatlanmış sətir birləşdiriləndə orijinalı verir", () => {
    const original = `DESCRIPTION:${"əb".repeat(60)}`;
    const unfolded = foldIcsLine(original).split("\r\n").join("").replace(/\r\n /g, "");
    // Davam sətirlərinin başındakı boşluqlar açılır.
    expect(unfolded.replace(/ /g, "")).toBe(original.replace(/ /g, ""));
  });
});

describe("icsFileName", () => {
  it("ASCII slug qurur", () => {
    expect(icsFileName("Career Day 2026", "evt-1")).toBe("career-day-2026.ics");
  });

  it("azərbaycan hərfləri ASCII-yə çevrilir (atılmır)", () => {
    // ⚠️ Sadəcə atsaydıq "Görüş" → "g-r" olardı.
    expect(icsFileName("Görüş", "evt-42")).toBe("gorus.ics");
    expect(icsFileName("Buraxılış gecəsi", "evt-1")).toBe("buraxilis-gecesi.ics");
  });

  it("tamamilə hərfsiz addan tədbir id-si işlədilir", () => {
    expect(icsFileName("— ///", "evt-42")).toBe("evt-42.ics");
  });
});

describe("buildIcsCalendar", () => {
  it("VCALENDAR / VEVENT sərhədləri düzgündür", () => {
    const ics = buildIcsCalendar(baseEvent(), OPTIONS);
    const parts = lines(ics);

    expect(parts[0]).toBe("BEGIN:VCALENDAR");
    expect(parts).toContain("VERSION:2.0");
    expect(parts).toContain("BEGIN:VEVENT");
    expect(parts).toContain("END:VEVENT");
    expect(parts.at(-2)).toBe("END:VCALENDAR");
  });

  it("🔴 sətirlər CRLF ilə ayrılır və fayl CRLF ilə BİTİR", () => {
    const ics = buildIcsCalendar(baseEvent(), OPTIONS);
    expect(ics.endsWith("\r\n")).toBe(true);
    // Tək LF olmamalıdır (yalnız CRLF-in bir hissəsi kimi).
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("UID tədbir id-si + host-dan qurulur (təkrar yükləmə DUBLİKAT yaratmır)", () => {
    const ics = buildIcsCalendar(baseEvent(), OPTIONS);
    expect(ics).toContain("UID:evt-1@class.qu.edu.az");
  });

  it("xarab `origin` UID-i sındırmır", () => {
    const ics = buildIcsCalendar(baseEvent(), { ...OPTIONS, origin: "not-a-url" });
    expect(ics).toContain("UID:evt-1@qu-class");
  });

  it("DTSTART / DTEND UTC formatındadır", () => {
    const ics = buildIcsCalendar(baseEvent(), OPTIONS);
    expect(ics).toContain("DTSTART:20260815T140000Z");
    expect(ics).toContain("DTEND:20260815T180000Z");
  });

  it("DTSTAMP `now`-dan gəlir (testdə sabit)", () => {
    expect(buildIcsCalendar(baseEvent(), OPTIONS)).toContain("DTSTAMP:20260730T091500Z");
  });

  it("🔴 `endsAt` yoxdursa müddət 1 saat sayılır", () => {
    const event = { ...baseEvent(), endsAt: null };
    const ics = buildIcsCalendar(event, OPTIONS);

    const expected = toIcsDateTime(
      new Date(event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS),
    );
    expect(ics).toContain(`DTEND:${expected}`);
  });

  it("başlıq və məkan qaçırılır", () => {
    const event = { ...baseEvent(), title: "Görüş; qeyd", location: "A, B" };
    const ics = buildIcsCalendar(event, OPTIONS);

    expect(ics).toContain("SUMMARY:Görüş\\; qeyd");
    expect(ics).toContain("LOCATION:A\\, B");
  });

  it("boş təsvir / məkan sahəsi ÜMUMİYYƏTLƏ yazılmır", () => {
    const ics = buildIcsCalendar(
      { ...baseEvent(), description: null, location: null },
      OPTIONS,
    );
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("LOCATION:");
  });

  it("onlayn keçid varsa URL odur, yoxsa tədbirin öz səhifəsi", () => {
    expect(
      buildIcsCalendar({ ...baseEvent(), url: "https://meet.example.com/x" }, OPTIONS),
    ).toContain("URL:https://meet.example.com/x");

    expect(buildIcsCalendar(baseEvent(), OPTIONS)).toContain(
      "URL:https://class.qu.edu.az/events/evt-1",
    );
  });

  it("ləğv edilmiş tədbir STATUS:CANCELLED alır", () => {
    expect(buildIcsCalendar({ ...baseEvent(), cancelled: true }, OPTIONS)).toContain(
      "STATUS:CANCELLED",
    );
    expect(buildIcsCalendar(baseEvent(), OPTIONS)).toContain("STATUS:CONFIRMED");
  });

  it("uzun təsvir qatlanır və heç bir sətir 75 okteti aşmır", () => {
    const ics = buildIcsCalendar(
      { ...baseEvent(), description: "Ətraflı təsvir. ".repeat(30) },
      OPTIONS,
    );

    for (const line of lines(ics)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
