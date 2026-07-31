# Responsive audit — Blok 12C

Baza: `http://127.0.0.1:3100` · Breakpoint-lər: 375 / 768 / 1024 / 1280 / 1536 px
Toxunma hədəfi: QAPI 24px (WCAG 2.2 AA) · MƏSLƏHƏT 44px (KUDS)

## 1. Üfüqi sürüşmə

**Tapıntı yoxdur** — beş breakpoint-in heç birində üfüqi sürüşmə yoxdur ✅

## 2. Toxunma hədəfi — QAPI (WCAG 2.2 AA, 24px)

**Tapıntı yoxdur** — bütün interaktiv elementlər ≥ 24px ✅

## 3. Toxunma hədəfi — MƏSLƏHƏT (KUDS 44px)

351 element 24px-i keçir, amma KUDS-un 44px tövsiyəsindən kiçikdir.
Böyük hissəsi shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36px) və
`src/components/ui/` CLAUDE.md §1-ə görə toxunulmazdır — ona görə bu bölmə
qapı deyil, siyahıdır.

Ekran görüntüləri: `<səhifə>__<en>.png` (50 ədəd).
