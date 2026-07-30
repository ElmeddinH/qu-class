// ============================================================================
// src/components/shared/Markdown.tsx
// `lib/markdown.ts` bloklarının render edilməsi.
//
// 🔴 `dangerouslySetInnerHTML` YOXDUR — bloklar React elementlərinə çevrilir,
// yəni mətnin içindəki HTML EKRANDA MƏTN kimi görünür. Bu, `ContentPage.body`
// üçün əsas qorumadır: gövdəni admin CMS-i (Blok 11B) yazacaq və o, etibarsız
// giriş sayılır.
//
// ⚠️ `headingOffset` SƏHİFƏNİN İYERARXİYASINA görə verilir. Markdown-dakı `##`
// məntiqi 2-ci səviyyədir, amma səhifədə artıq `<h1>` (səhifə başlığı) və bəzən
// `<h2>` (bölmə) var. Səviyyə ATLANMAMALIDIR (WCAG 1.3.1) — ona görə çağıran
// tərəf sürüşməni açıq verir, komponent təxmin etmir.
//
// SERVER komponentidir (`"use client"` yoxdur) — məzmun səhifələri serverdə
// render olunur və mətn client bundle-ına düşmür.
// ============================================================================

import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { parseMarkdown } from "@/lib/markdown";

interface MarkdownProps {
  source: string;
  /**
   * Başlıq səviyyəsi sürüşməsi: `0` → `##` = `<h2>`, `1` → `##` = `<h3>`.
   * Maksimum `<h6>`-ya sıxılır (səviyyə 7 HTML-də yoxdur).
   */
  headingOffset?: 0 | 1 | 2;
  /**
   * Mətn ölçüsü. `article` — müstəqil məzmun səhifəsi (16px, KUDS Body);
   * `compact` — kartın içindəki köməkçi mətn (14px, KUDS Small).
   * ⚠️ Tədbir proqramı `compact`-dır və bu, Blok 9-dakı görünüşü SAXLAYIR.
   */
  tone?: "article" | "compact";
  className?: string;
}

/** Mətn ölçüsü səviyyəyə görə: KUDS tipoqrafiya cədvəli (h2 24 · h3 20 · h4 18). */
const HEADING_CLASS: Record<number, string> = {
  2: "text-h2 font-semibold text-text-primary",
  3: "text-h3 font-semibold text-text-primary",
  4: "text-h4 font-medium text-text-primary",
  5: "text-body font-medium text-text-primary",
  6: "text-body font-medium text-text-primary",
};

export function Markdown({
  source,
  headingOffset = 0,
  tone = "article",
  className,
}: MarkdownProps) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  const bodyClass = tone === "compact" ? "text-small" : "text-body";
  const listGap = tone === "compact" ? "gap-1" : "gap-2";

  return (
    <div className={cn("flex flex-col", tone === "compact" ? "gap-3" : "gap-4", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const level = Math.min(block.level + headingOffset, 6);
          const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <Tag key={index} className={HEADING_CLASS[level]}>
              {block.text}
            </Tag>
          );
        }

        return (
          <Fragment key={index}>
            {block.kind === "bullets" ? (
              <ul
                className={cn(
                  "ml-4 flex list-disc flex-col text-text-secondary",
                  listGap,
                  bodyClass,
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            ) : null}

            {block.kind === "numbers" ? (
              <ol
                className={cn(
                  "ml-4 flex list-decimal flex-col text-text-secondary",
                  listGap,
                  bodyClass,
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            ) : null}

            {block.kind === "paragraph" ? (
              <p className={cn("text-text-secondary", bodyClass)}>{block.text}</p>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
