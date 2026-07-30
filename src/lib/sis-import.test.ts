// ============================================================================
// src/lib/sis-import.test.ts
// SIS CSV parse qatının vahid testləri (Blok 11B, TƏLƏ E).
//
// Bu modul DB-siz sınanır və məhz buna görə ayrıdır: toplu importun ən çox
// səhv edən hissəsi (kodlaşdırma, sətir sonu, dırnaq, sütun sırası) real
// bazaya ehtiyac duymur.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  SIS_COLUMNS,
  SIS_MAX_BYTES,
  SIS_TEMPLATE_CSV,
  normalizeSisText,
  parseCsvRows,
  parseSisCsv,
  sisPreviewToken,
} from "./sis-import";

const HEADER = SIS_COLUMNS.join(",");

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join("\n");
}

describe("normalizeSisText", () => {
  it("UTF-8 BOM-u yalnız FAYLIN ƏVVƏLİNDƏN kəsir", () => {
    expect(normalizeSisText("﻿email")).toBe("email");
    // Ortadaki U+FEFF adi simvoldur — silinsə dəyər səssizcə dəyişərdi.
    expect(normalizeSisText("ad﻿soyad")).toBe("ad﻿soyad");
  });

  it("CRLF və tək CR sətir sonlarını LF-ə çevirir", () => {
    expect(normalizeSisText("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});

describe("parseCsvRows", () => {
  it("dırnaqlı xanadakı vergülü xana ayırıcısı SAYMIR", () => {
    const rows = parseCsvRows('a,"Əliyev, Nicat",c');
    expect(rows[0].cells).toEqual(["a", "Əliyev, Nicat", "c"]);
  });

  it("ikiqat dırnaq bir dırnaq kimi oxunur (RFC 4180)", () => {
    const rows = parseCsvRows('"o ""böyük"" gün",x');
    expect(rows[0].cells).toEqual(['o "böyük" gün', "x"]);
  });

  it("dırnaq içindəki sətir sonu SƏTİR NÖMRƏSİNİ sürüşdürür", () => {
    // 🔴 Hesabatdakı «sətir 3» faylın 3-cü FİZİKİ sətri olmalıdır.
    const rows = parseCsvRows('a,"iki\nsətir"\nb,c');
    expect(rows).toHaveLength(2);
    expect(rows[0].line).toBe(1);
    expect(rows[1].line).toBe(3);
  });

  it("fayl yeni sətirlə bitməsə də son sətri itirmir", () => {
    expect(parseCsvRows("a,b\nc,d")).toHaveLength(2);
  });
});

describe("parseSisCsv — fayl səviyyəsi", () => {
  it("boş fayl rədd olunur", () => {
    const result = parseSisCsv("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("EMPTY_FILE");
  });

  it("çatışmayan sütun rədd olunur və ADINI yazır", () => {
    const result = parseSisCsv("email,firstName\nx@qu.edu.az,Ayan");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("MISSING_COLUMN");
      expect(result.message).toContain("lastName");
    }
  });

  it("yalnız başlıqdan ibarət fayl rədd olunur", () => {
    const result = parseSisCsv(HEADER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NO_DATA_ROWS");
  });

  it("🔴 ŞİFRƏ SÜTUNU BÜTÜN FAYLI DAYANDIRIR", () => {
    // Şifrə CSV ilə qəbul edilmir — nə ilk sətirdə, nə də adı dəyişdirilmiş
    // formada. Səbəb `lib/sis-import.ts` başlığındadır.
    for (const column of ["password", "Password", "PAROL", "şifrə", "password_hash"]) {
      const result = parseSisCsv(`${HEADER},${column}\nx@qu.edu.az,A,B,eng,cs,2026,gizli`);
      expect(result.ok, `«${column}» sütunu keçdi`).toBe(false);
      if (!result.ok) expect(result.reason).toBe("FORBIDDEN_COLUMN");
    }
  });

  it("sütun SIRASI sərbəstdir, ADLAR məcburidir", () => {
    const result = parseSisCsv(
      "admissionYear,programCode,facultyCode,lastName,firstName,email\n" +
        "2026,cs,eng,Əliyev,Nicat,nicat@qu.edu.az",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0]).toMatchObject({
        email: "nicat@qu.edu.az",
        firstName: "Nicat",
        lastName: "Əliyev",
        facultyCode: "eng",
        programCode: "cs",
        admissionYear: 2026,
      });
    }
  });

  it("BOM + CRLF ilə yazılmış fayl normal oxunur (Excel ixracı)", () => {
    const result = parseSisCsv(
      `﻿${HEADER}\r\nnicat@qu.edu.az,Nicat,Əliyev,eng,cs,2026\r\n`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.issues).toHaveLength(0);
    }
  });
});

describe("parseSisCsv — sətir səviyyəsi", () => {
  it("azərbaycan hərfləri qorunur", () => {
    const result = parseSisCsv(csv("gunel@qu.edu.az,Günel,Şıxəliyeva,eng,cs,2026"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0].lastName).toBe("Şıxəliyeva");
  });

  it("boş sətirlər SƏSSİZCƏ atılır (fayl sonundakı yeni sətir normaldır)", () => {
    const result = parseSisCsv(
      csv("a@qu.edu.az,A,B,eng,cs,2026", "", "  ", "c@qu.edu.az,C,D,eng,cs,2026"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.issues).toHaveLength(0);
    }
  });

  it("sütun sayı uyğun gəlməyən sətir SƏTİR NÖMRƏSİ ilə rədd olunur", () => {
    const result = parseSisCsv(csv("a@qu.edu.az,A,B,eng,cs", "c@qu.edu.az,C,D,eng,cs,2026"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({ line: 2, reason: "COLUMN_COUNT" });
    }
  });

  it("universitet domenindən kənar e-poçt AYRI səbəblə rədd olunur", () => {
    const result = parseSisCsv(
      csv("kimse@gmail.com,A,B,eng,cs,2026", "yanlis,A,B,eng,cs,2026"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // İki səbəb qəsdən ayrıdır: «domen səhvdir» ilə «ümumiyyətlə e-poçt
      // deyil» fərqli düzəliş tələb edir.
      expect(result.issues.map((i) => i.reason)).toEqual([
        "NOT_UNIVERSITY_EMAIL",
        "INVALID_EMAIL",
      ]);
    }
  });

  it("ad, kod və il boşluqları ayrı-ayrı səbəblərlə rədd olunur", () => {
    const result = parseSisCsv(
      csv(
        "a@qu.edu.az,,B,eng,cs,2026",
        "b@qu.edu.az,A,B,,cs,2026",
        "c@qu.edu.az,A,B,eng,cs,20xx",
        "d@qu.edu.az,A,B,eng,cs,1990",
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.map((i) => i.reason)).toEqual([
        "MISSING_NAME",
        "MISSING_CODE",
        "INVALID_YEAR",
        "INVALID_YEAR",
      ]);
    }
  });

  it("FAYL DAXİLİNDƏ təkrar e-poçt ikinci sətirdə rədd olunur", () => {
    // ⚠️ BAZADAKI mövcud e-poçt səhv DEYİL — o, YENİLƏMƏDİR və servisdə
    // həll olunur. Burada yalnız faylın öz təkrarı tutulur.
    const result = parseSisCsv(
      csv("a@qu.edu.az,A,B,eng,cs,2026", "A@QU.edu.az,A,B,eng,cs,2026"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({ line: 3, reason: "DUPLICATE_IN_FILE" });
    }
  });

  it("e-poçt normallaşdırılır (kiçik hərf + kənar boşluq)", () => {
    const result = parseSisCsv(csv("  Nicat@QU.edu.az ,Nicat,Əliyev,eng,cs,2026"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0].email).toBe("nicat@qu.edu.az");
  });

  it("səhvli sətir QALANLARINI dayandırmır", () => {
    const result = parseSisCsv(
      csv(
        "a@qu.edu.az,A,B,eng,cs,2026",
        "pozuq",
        "c@qu.edu.az,C,D,eng,cs,2026",
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.issues).toHaveLength(1);
    }
  });
});

describe("sisPreviewToken", () => {
  it("eyni məzmun → eyni jeton", () => {
    const text = csv("a@qu.edu.az,A,B,eng,cs,2026");
    expect(sisPreviewToken(text)).toBe(sisPreviewToken(text));
  });

  it("məzmun dəyişəndə jeton dəyişir", () => {
    expect(sisPreviewToken(csv("a@qu.edu.az,A,B,eng,cs,2026"))).not.toBe(
      sisPreviewToken(csv("b@qu.edu.az,A,B,eng,cs,2026")),
    );
  });

  it("YALNIZ sətir sonu formatı fərqlənirsə jeton EYNİDİR", () => {
    // Fayl Excel-dən CRLF ilə, redaktordan LF ilə gələ bilər — məzmun eynidirsə
    // admin ikinci dəfə önizləməyə məcbur olmamalıdır.
    const lf = "a,b\nc,d";
    const crlf = "a,b\r\nc,d";
    expect(sisPreviewToken(lf)).toBe(sisPreviewToken(crlf));
  });
});

describe("şablon və limitlər", () => {
  it("şablon fayl ÖZ parse qaydalarından keçir", () => {
    const result = parseSisCsv(SIS_TEMPLATE_CSV);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.issues).toHaveLength(0);
    }
  });

  it("ölçü limiti 2 MB-dır", () => {
    expect(SIS_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});
