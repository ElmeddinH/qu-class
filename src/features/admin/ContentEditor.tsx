"use client";

// ============================================================================
// src/features/admin/ContentEditor.tsx
// `ContentPage` redaktoru — YAN-YANA Markdown önizləməsi ilə.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 GÖVDƏ ETİBARSIZ GİRİŞDİR — `dangerouslySetInnerHTML` YOXDUR
// ────────────────────────────────────────────────────────────────────────────
// Önizləmə `lib/markdown.ts` → `parseMarkdown` ilə qurulur və o, HTML QURMUR:
// nəticə blok siyahısıdır, render tərəfi onları React elementlərinə çevirir.
// Yəni gövdədəki `<script>` ekranda MƏTN kimi görünür. Bu, 11A-nın
// `markdown.test.ts` testi ilə bərkidilib.
//
// ⚠️ Önizləmə üçün `components/shared/Markdown.tsx` işlədilə bilməzdi — o,
// SERVER komponentidir və burada canlı yazı ilə yenilənməlidir. Ona görə
// eyni SAF parse funksiyası client-də çağırılır; render qaydası (başlıq
// səviyyələri, siyahılar) sadələşdirilmiş formadadır.
//
// ────────────────────────────────────────────────────────────────────────────
// SLUG DƏYİŞİKLİYİ
// ────────────────────────────────────────────────────────────────────────────
// Marşrut xəritəsinə (`lib/content-routes.ts`) bağlı slug-lar KİLİDLİDİR —
// input `disabled` olur və server də rədd edir. Qalan slug-larda xəbərdarlıq
// göstərilir: mövcud ünvan sınır.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseMarkdown } from "@/lib/markdown";

import { updateContentPageAction } from "./actions";

interface ContentEditorProps {
  page: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    body: string;
    isPublished: boolean;
    locked: boolean;
  };
}

/** Sadələşdirilmiş önizləmə — HTML QURULMUR, React elementləri yaradılır. */
function MarkdownPreview({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return block.level === 2 ? (
            <h3 key={index} className="text-h3 font-semibold text-text-primary">
              {block.text}
            </h3>
          ) : (
            <h4 key={index} className="text-h4 font-medium text-text-primary">
              {block.text}
            </h4>
          );
        }

        if (block.kind === "bullets") {
          return (
            <ul key={index} className="list-disc pl-6 text-small text-text-secondary">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.kind === "numbers") {
          return (
            <ol key={index} className="list-decimal pl-6 text-small text-text-secondary">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index} className="text-small text-text-secondary">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export function ContentEditor({ page }: ContentEditorProps) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(page.slug);
  const [title, setTitle] = useState(page.title);
  const [excerpt, setExcerpt] = useState(page.excerpt ?? "");
  const [body, setBody] = useState(page.body);
  const [isPublished, setPublished] = useState(page.isPublished);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const result = await updateContentPageAction({
        id: page.id,
        slug,
        title,
        excerpt,
        body,
        isPublished,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Yenilənmədi.");
        return;
      }

      toast.success(result.message ?? "Səhifə yeniləndi.");
      setOpen(false);
      router.refresh();
    });
  };

  const fieldId = (name: string) => `content-${page.id}-${name}`;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-normal">
          {page.isPublished ? "Dərc olunub" : "Qaralama"}
        </Badge>
        {page.locked ? (
          <Badge variant="outline" className="font-normal">
            Ünvan kilidli
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label={`${page.title} səhifəsini redaktə et`}
        >
          Redaktə et
        </Button>
      </div>
    );
  }

  return (
    <form
      aria-label={`${page.title} redaktə formu`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4 rounded-card border border-border bg-background p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("title")}>Başlıq</Label>
          <Input
            id={fieldId("title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("slug")}>Ünvan (slug)</Label>
          <Input
            id={fieldId("slug")}
            value={slug}
            disabled={page.locked}
            onChange={(event) => setSlug(event.target.value)}
            className="rounded-input"
          />
          <p className="text-caption text-text-secondary">
            {page.locked
              ? "Bu səhifə marşrut xəritəsinə bağlıdır — ünvan dəyişdirilə bilməz."
              : "⚠️ Slug dəyişsə mövcud ünvan sınır və paylaşılmış linklər 404 verir."}
          </p>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={fieldId("excerpt")}>Qısa təsvir</Label>
          <Input
            id={fieldId("excerpt")}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            className="rounded-input"
          />
        </div>
      </div>

      {/* --- YAN-YANA: redaktor | önizləmə --- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("body")}>Gövdə (Markdown)</Label>
          <Textarea
            id={fieldId("body")}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={16}
            className="rounded-input font-mono text-caption"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small font-medium text-text-primary">Önizləmə</span>
          <div className="max-h-[26rem] overflow-y-auto rounded-card border border-border bg-surface p-4">
            <MarkdownPreview source={body} />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-small text-text-primary">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setPublished(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Dərc olunub
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Yadda saxla
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Ləğv et
        </Button>
      </div>
    </form>
  );
}
