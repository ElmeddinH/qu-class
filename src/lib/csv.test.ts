// ============================================================================
// src/lib/csv.test.ts
// CSV ixracı (KUDS §14) — üç tələ: formula inyeksiyası · BOM · CRLF.
// ============================================================================

import { describe, expect, it } from "vitest";

import { CSV_BOM_BYTES, buildCsv, csvFileName, csvRow, escapeCsvCell } from "./csv";

describe("escapeCsvCell", () => {
  it("adi mətn dəyişmir", () => {
    expect(escapeCsvCell("Aysel")).toBe("Aysel");
  });

  it("`null` / `undefined` boş xanadır", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("ədəd mətnə çevrilir", () => {
    expect(escapeCsvCell(5)).toBe("5");
    expect(escapeCsvCell(0)).toBe("0");
  });

  it("vergül və dırnaq olan xana dırnaqlanır", () => {
    expect(escapeCsvCell("Bakı, Azərbaycan")).toBe('"Bakı, Azərbaycan"');
    expect(escapeCsvCell('O "dedi"')).toBe('"O ""dedi"""');
  });

  it("sətir sonu olan xana dırnaqlanır", () => {
    expect(escapeCsvCell("bir\niki")).toBe('"bir\niki"');
  });

  // --- TƏLƏ 1: formula inyeksiyası ---

  it("🔴 `=` ilə başlayan xana zərərsizləşdirilir", () => {
    expect(escapeCsvCell("=HYPERLINK(\"http://x\")")).toBe(
      '"\'=HYPERLINK(""http://x"")"',
    );
  });

  it("🔴 `+`, `-`, `@`, TAB, CR prefiksləri də zərərsizləşdirilir", () => {
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("\tx")).toBe("'\tx");
  });

  it("mənfi ƏDƏD də prefiks alır (Excel onu düstur kimi oxuya bilər)", () => {
    expect(escapeCsvCell(-5)).toBe("'-5");
  });

  it("ortada `=` olan mətn toxunulmur", () => {
    expect(escapeCsvCell("a=b")).toBe("a=b");
  });
});

describe("csvRow", () => {
  it("xanalar vergüllə birləşir", () => {
    expect(csvRow(["a", "b", 3])).toBe("a,b,3");
  });
});

describe("buildCsv", () => {
  const csv = buildCsv(["Ad", "Status"], [["Aysel", "Qeydiyyatdan keçib"]]);

  it("🔴 BOM MƏTNƏ əlavə OLUNMUR — o, bayt başlığıdır", () => {
    // Blok 9-un dərsi: BOM `buildCsv`-in çıxışında U+FEFF simvolu kimi idi və
    // endirilən faylda İTİRDİ. İndi `Blob`-a bayt kimi verilir.
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(csv.startsWith("Ad,Status")).toBe(true);
  });

  it("BOM baytları UTF-8 spesifikasiyasına uyğundur", () => {
    expect([...CSV_BOM_BYTES]).toEqual([0xef, 0xbb, 0xbf]);
    // Bayt massivi mətnə çevriləndə məhz U+FEFF verir.
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(
      new Uint8Array(CSV_BOM_BYTES),
    )).toBe("\uFEFF");
  });

  it("🔴 sətirlər CRLF ilə ayrılır və fayl CRLF ilə bitir", () => {
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(csv)).toBe(false);
  });

  it("başlıq sətri birincidir", () => {
    const [header] = csv.split("\r\n");
    expect(header).toBe("Ad,Status");
  });

  it("azərbaycan hərfləri qorunur", () => {
    expect(csv).toContain("Qeydiyyatdan keçib");
  });

  it("sətirsiz cədvəl yalnız başlıq verir", () => {
    expect(buildCsv(["Ad"], [])).toBe("Ad\r\n");
  });
});

describe("csvFileName", () => {
  const at = new Date("2026-07-30T10:00:00.000Z");

  it("slug + tarix damğası", () => {
    expect(csvFileName("istirakcilar-Career Day", at)).toBe(
      "istirakcilar-career-day-2026-07-30.csv",
    );
  });

  it("azərbaycan hərfləri ASCII-yə çevrilir (atılmır)", () => {
    // ⚠️ Sadəcə atsaydıq "Görüş" → "g-r" olardı — tanınmaz fayl adı.
    expect(csvFileName("Görüş", at)).toBe("gorus-2026-07-30.csv");
    expect(csvFileName("Məzun şənliyi", at)).toBe("mezun-senliyi-2026-07-30.csv");
  });

  it("tamamilə hərfsiz ad `export`-a düşür", () => {
    expect(csvFileName("!!! ???", at)).toBe("export-2026-07-30.csv");
  });
});
