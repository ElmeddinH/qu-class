// ============================================================================
// src/features/events/MarkdownAgenda.tsx
// Tədbir proqramının markdown göstərilməsi (spec §14 sahə 8).
//
// 🔴 NİYƏ `react-markdown` DEYİL: stack KİLİDLİDİR (CLAUDE.md "Yeni asılılıq
// əlavə etmədən əvvəl soruş"). Proqram sahəsi bir neçə başlıq və siyahıdan
// ibarətdir — tam markdown mühərriki bu iş üçün həddindən artıq böyükdür və
// özü ilə sanitizasiya məsuliyyəti gətirir.
//
// 🔴 `dangerouslySetInnerHTML` İŞLƏDİLMİR. Proqram mətnini İSTİFADƏÇİ yazır
// (sinif nümayəndəsi / koordinator), yəni o, etibarsız girişdir. Burada HTML
// ümumiyyətlə QURULMUR — mətn parçalanıb React elementləri kimi render olunur,
// yəni XSS səthi yoxdur: `<script>` yazılsa ekranda MƏTN kimi görünür.
//
// Dəstəklənən sintaksis (formadakı izahla eyni):
//   `## Başlıq`   →  <h3>          (səhifədə artıq h1/h2 var, iyerarxiya qorunur)
//   `### Başlıq`  →  <h4>
//   `- element`   →  <ul><li>
//   `1. element`  →  <ol><li>
//   boş sətir     →  abzas ayrıcı
// Qalan hər şey adi mətndir.
// ============================================================================

import { Fragment } from "react";

type Block =
  | { kind: "heading"; level: 3 | 4; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "paragraph"; text: string };

const HEADING_3 = /^##\s+(.*)$/;
const HEADING_4 = /^###\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;

/**
 * Mətni bloklara bölür.
 *
 * ⚠️ `###` `##`-dən ƏVVƏL yoxlanılır: `##` şablonu `###` sətrinə də uyğun
 * gəlir (birinci iki `#`-dən sonra boşluq yoxdur, amma `.*` üçüncü `#`-i
 * udardı) və üç səviyyəli başlıq səhvən h3 kimi çıxardı.
 */
export function parseAgenda(source: string): Block[] {
  const blocks: Block[] = [];
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

    const h4 = HEADING_4.exec(line);
    if (h4) {
      flush();
      blocks.push({ kind: "heading", level: 4, text: h4[1].trim() });
      continue;
    }

    const h3 = HEADING_3.exec(line);
    if (h3) {
      flush();
      blocks.push({ kind: "heading", level: 3, text: h3[1].trim() });
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

export function MarkdownAgenda({ source }: { source: string }) {
  const blocks = parseAgenda(source);

  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {block.kind === "heading" && block.level === 3 ? (
            <h3 className="text-h4 font-medium text-text-primary">{block.text}</h3>
          ) : null}

          {block.kind === "heading" && block.level === 4 ? (
            <h4 className="text-body font-medium text-text-primary">{block.text}</h4>
          ) : null}

          {block.kind === "bullets" ? (
            <ul className="ml-4 flex list-disc flex-col gap-1 text-small text-text-secondary">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          ) : null}

          {block.kind === "numbers" ? (
            <ol className="ml-4 flex list-decimal flex-col gap-1 text-small text-text-secondary">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ol>
          ) : null}

          {block.kind === "paragraph" ? (
            <p className="text-small text-text-secondary">{block.text}</p>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
