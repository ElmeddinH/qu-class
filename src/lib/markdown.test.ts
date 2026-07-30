// ============================================================================
// src/lib/markdown.test.ts
// Məhdud markdown ayrıştırıcısı — SAF modul testi.
//
// 🔴 ƏSAS SUAL: HTML QURULURMU? Cavab XEYİRDİR — ayrıştırıcı BLOK obyektləri
// qaytarır və render tərəfi onları React elementlərinə çevirir
// (`dangerouslySetInnerHTML` heç yerdə yoxdur). Aşağıdaki «XSS» testi məhz
// bunu ölçür: `<script>` sətri MƏTN kimi qalır.
//
// ⚠️ Bu ayrıştırıcı Blok 9-dakı `parseAgenda`-nın davamıdır (tədbir proqramı)
// və Blok 11A-da ictimai məzmun səhifələri ikinci istifadəçi oldu.
// ============================================================================

import { describe, expect, it } from "vitest";

import { firstParagraph, parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("boş mətn boş siyahı verir", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("   \n\n  ")).toEqual([]);
  });

  it("`##` ikinci səviyyə başlıqdır", () => {
    expect(parseMarkdown("## Missiya")).toEqual([
      { kind: "heading", level: 2, text: "Missiya" },
    ]);
  });

  it("🔴 `###` `##`-dən ƏVVƏL yoxlanılır (üçüncü səviyyə itmir)", () => {
    // `##` şablonu `###` sətrinə də uyğun gəlir — sıra pozulsa üç səviyyəli
    // başlıq səhvən ikinci səviyyə çıxardı.
    expect(parseMarkdown("### Alt başlıq")).toEqual([
      { kind: "heading", level: 3, text: "Alt başlıq" },
    ]);
  });

  it("işarəli siyahı yığılır", () => {
    expect(parseMarkdown("- bir\n- iki\n* üç")).toEqual([
      { kind: "bullets", items: ["bir", "iki", "üç"] },
    ]);
  });

  it("nömrəli siyahı yığılır", () => {
    expect(parseMarkdown("1. bir\n2) iki")).toEqual([
      { kind: "numbers", items: ["bir", "iki"] },
    ]);
  });

  it("boş sətir abzasları ayırır", () => {
    const blocks = parseMarkdown("Birinci abzas.\n\nİkinci abzas.");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Birinci abzas." },
      { kind: "paragraph", text: "İkinci abzas." },
    ]);
  });

  it("ardıcıl sətirlər BİR abzasa birləşir", () => {
    expect(parseMarkdown("bir sətir\ndavamı")).toEqual([
      { kind: "paragraph", text: "bir sətir davamı" },
    ]);
  });

  it("siyahı növü dəyişəndə yeni blok başlayır", () => {
    const blocks = parseMarkdown("- bir\n1. iki");
    expect(blocks.map((b) => b.kind)).toEqual(["bullets", "numbers"]);
  });

  it("real `ContentPage.body` strukturunu düzgün oxuyur", () => {
    const body =
      "## Missiya\n\nUniversitet bölgənin təhsil mərkəzidir.\n\n" +
      "## Strateji hədəflər\n\n1. Mütəxəssis hazırlığı.\n2. Tədqiqat.\n\n" +
      "### Dəyərlər\n\n- Dürüstlük\n- Açıqlıq";

    expect(parseMarkdown(body).map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "numbers",
      "heading",
      "bullets",
    ]);
  });

  it("CRLF sətir sonu da işləyir", () => {
    expect(parseMarkdown("## Başlıq\r\n\r\nMətn.")).toHaveLength(2);
  });

  it("🔴 HTML QURULMUR — `<script>` MƏTN kimi qalır", () => {
    // Gövdəni admin CMS-i (Blok 11B) yazacaq, yəni etibarsız girişdir.
    const blocks = parseMarkdown("<script>alert(1)</script>");

    expect(blocks).toEqual([
      { kind: "paragraph", text: "<script>alert(1)</script>" },
    ]);
    // Nəticə obyektdir, sətir DEYİL — render tərəfi onu mətn kimi yerləşdirir.
    expect(typeof blocks[0]).toBe("object");
  });
});

describe("firstParagraph", () => {
  it("başlıqları ATLAYIR", () => {
    expect(firstParagraph("## Başlıq\n\nƏsl mətn.")).toBe("Əsl mətn.");
  });

  it("abzas yoxdursa `null`", () => {
    expect(firstParagraph("## Yalnız başlıq")).toBeNull();
    expect(firstParagraph("")).toBeNull();
  });
});
