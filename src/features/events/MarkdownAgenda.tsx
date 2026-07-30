// ============================================================================
// src/features/events/MarkdownAgenda.tsx
// Tədbir proqramının markdown göstərilməsi (spec §14 sahə 8).
//
// 🔴 AYRIŞTIRICI ARTIQ BURADA DEYİL. Blok 11A-da `parseAgenda` `lib/markdown.ts`-ə
// (`parseMarkdown`) köçdü, çünki ikinci istifadəçi yarandı: ictimai məzmun
// səhifələri `ContentPage.body`-ni eyni sintaksisdə saxlayır. İki nüsxə
// qalsaydı onlar vaxtla ayrılardı — Blok 7-nin etiket dublikatı dərsi (T13)
// eynilə buna aiddir. Render `components/shared/Markdown.tsx`-dədir
// (istiqamət: features → shared, əksi yox).
//
// 🔴 `dangerouslySetInnerHTML` İŞLƏDİLMİR. Proqram mətnini İSTİFADƏÇİ yazır
// (sinif nümayəndəsi / koordinator), yəni o, etibarsız girişdir. HTML
// ümumiyyətlə QURULMUR — `<script>` yazılsa ekranda MƏTN kimi görünür.
//
// ⚠️ `headingOffset={1}` — DAVRANIŞ DƏYİŞMİR: tədbir detalında səhifə başlığı
// `<h1>`, bölmə başlığı `<h2>`-dir, ona görə proqramdakı `##` yenə `<h3>`,
// `###` yenə `<h4>` kimi render olunur (səviyyə atlanmır, WCAG 1.3.1).
// ============================================================================

import { Markdown } from "@/components/shared/Markdown";

export function MarkdownAgenda({ source }: { source: string }) {
  return <Markdown source={source} headingOffset={1} tone="compact" />;
}
