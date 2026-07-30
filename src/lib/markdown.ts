// ============================================================================
// src/lib/markdown.ts
// Məhdud markdown ayrıştırıcısı — SAF (React / Prisma importu YOXDUR).
//
// 🔴 NİYƏ `react-markdown` DEYİL: stack KİLİDLİDİR (CLAUDE.md — "yeni asılılıq
// əlavə etmədən əvvəl soruş"). Bizim mətnlərimiz (tədbir proqramı,
// `ContentPage.body`) bir neçə başlıq, siyahı və abzasdan ibarətdir; tam
// markdown mühərriki bu iş üçün böyükdür və özü ilə sanitizasiya məsuliyyəti
// gətirir.
//
// 🔴 NƏTİCƏ HTML DEYİL, BLOK SİYAHISIDIR. `dangerouslySetInnerHTML` HEÇ YERDƏ
// işlədilmir — render tərəfi blokları React elementlərinə çevirir, yəni mətnin
// içindəki `<script>` ekranda MƏTN kimi görünür. Ayrıştırıcının SAF olması bu
// zəmanəti testlə ölçüləbilən edir.
//
// Blok 11A-da fayl `features/events/MarkdownAgenda.tsx`-dən çıxarıldı: ikinci
// istifadəçi yarandı (ictimai məzmun səhifələri) və `features/*` bir-birindən
// import etmir. İki nüsxə saxlasaydıq onlar vaxtla ayrılardı (TƏLƏ T13).
//
// Dəstəklənən sintaksis:
//   `## Başlıq`   →  heading level 2
//   `### Başlıq`  →  heading level 3
//   `- element`   →  bullets
//   `1. element`  →  numbers
//   boş sətir     →  abzas ayrıcı
// Qalan hər şey adi mətndir.
// ============================================================================

export type MarkdownBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "paragraph"; text: string };

const HEADING_2 = /^##\s+(.*)$/;
const HEADING_3 = /^###\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;

/**
 * Mətni bloklara bölür.
 *
 * ⚠️ `###` `##`-dən ƏVVƏL yoxlanılır: `##` şablonu `###` sətrinə də uyğun gəlir
 * (`.*` üçüncü `#`-i udur) və üç səviyyəli başlıq səhvən ikinci səviyyə çıxardı.
 *
 * ⚠️ `level` MƏNTİQİ səviyyədir (markdown-dakı `#` sayı), HTML teqi deyil.
 * Render tərəfi onu səhifənin iyerarxiyasına uyğun sürüşdürür (`headingOffset`)
 * — məzmun səhifəsində `##` → `<h2>`, tədbir kartında isə `<h3>` olmalıdır.
 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (bullets.length > 0) {
      blocks.push({ kind: "bullets", items: bullets });
      bullets = [];
    }
    if (numbers.length > 0) {
      blocks.push({ kind: "numbers", items: numbers });
      numbers = [];
    }
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    const h3 = HEADING_3.exec(line);
    if (h3) {
      flush();
      blocks.push({ kind: "heading", level: 3, text: h3[1].trim() });
      continue;
    }

    const h2 = HEADING_2.exec(line);
    if (h2) {
      flush();
      blocks.push({ kind: "heading", level: 2, text: h2[1].trim() });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      if (numbers.length > 0 || paragraph.length > 0) flush();
      bullets.push(bullet[1].trim());
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      if (bullets.length > 0 || paragraph.length > 0) flush();
      numbers.push(numbered[1].trim());
      continue;
    }

    if (bullets.length > 0 || numbers.length > 0) flush();
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * Mətnin ilk abzası — kart xülasəsi üçün.
 * Başlıqlar və siyahılar ATLANIR (başlıq xülasə deyil).
 */
export function firstParagraph(source: string): string | null {
  for (const block of parseMarkdown(source)) {
    if (block.kind === "paragraph") return block.text;
  }
  return null;
}
