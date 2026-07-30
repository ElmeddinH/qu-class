"use client";

// ============================================================================
// src/features/docs/ApiDocs.tsx
// Swagger UI qabığı — `/docs` səhifəsinin bütün məntiqi burada (CLAUDE.md §8).
//
// 🔴 AKTİVLƏR LOKALDIR, CDN-DƏN DEYİL. `public/swagger/` qovluğu
// `scripts/copy-swagger.mjs` ilə qurulur (`predev` / `prebuild` hook-ları).
// Səbəb: müdafiə otağında internet olmaya bilər və CDN-dən yüklənən Swagger UI
// orada BOŞ AĞ SƏHİFƏ kimi görünərdi.
//
// 🔴 `withCredentials: true` MƏCBURİDİR. Bunsuz «Try it out» sessiya kukisini
// GÖNDƏRMİR və hər qorunan endpoint 401 verir — yəni sprint kriteriyası
// ("endpoint-lər Swagger üzərindən test edilə bilir) məhz burada sınardı.
// Sessiya kukisi `HttpOnly`-dir, JS onu oxuya bilmir; yeganə yol brauzerin
// kukini sorğuya özünün əlavə etməsidir və bunu `credentials: "include"`
// (fetch səviyyəsində `withCredentials`) açır.
//
// ⚠️ Swagger UI React-in İDARƏ ETDİYİ ağacın DIŞINDA işləyir: öz DOM-unu
// `#swagger-ui` qabına özü qurur. Ona görə qab `<div>`-i BOŞ render olunur və
// React onun içinə heç nə yazmır (əks halda iki idarəçi eyni node üstündə
// döyüşərdi).
//
// ⚠️ `initialized` ref-i MƏCBURİDİR: React 19 development rejimində effekt-ləri
// İKİ DƏFƏ işlədir (Strict Mode) və ikinci çağırış Swagger UI-ı eyni qabda
// yenidən qurub cüt interfeys yaradardı.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** OpenAPI sənədinin ünvanı — `src/app/api/v1/openapi.json/route.ts`. */
export const OPENAPI_URL = "/api/v1/openapi.json";

const CONTAINER_ID = "swagger-ui";

const STYLESHEET = "/swagger/swagger-ui.css";
const SCRIPTS = [
  "/swagger/swagger-ui-bundle.js",
  "/swagger/swagger-ui-standalone-preset.js",
];

/**
 * Swagger UI-ın qlobal API-si. `@types/swagger-ui-dist` paketi əlavə EDİLMİR —
 * stack kilidlidir (CLAUDE.md) və bizə yalnız bu iki qlobal lazımdır.
 */
type SwaggerUiPreset = unknown[];

interface SwaggerUiBundle {
  (config: Record<string, unknown>): unknown;
  presets: { apis: unknown };
  plugins: { DownloadUrl: unknown };
}

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUiBundle;
    SwaggerUIStandalonePreset?: SwaggerUiPreset;
  }
}

/** Skripti bir dəfə yükləyir; artıq varsa dərhal həll olunur. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false; // sıra vacibdir: bundle → preset
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error(src)), { once: true });
    document.head.append(script);
  });
}

type Status = "loading" | "ready" | "error";

export function ApiDocs() {
  const [status, setStatus] = useState<Status>("loading");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    void (async () => {
      try {
        for (const src of SCRIPTS) {
          await loadScript(src);
        }
        if (cancelled) return;

        const factory = window.SwaggerUIBundle;
        if (!factory) throw new Error("SwaggerUIBundle qlobalı tapılmadı");

        // ⚠️ `.slice(1)` — standalone preset-in BİRİNCİ elementi üst paneldir
        // (URL sahəsi + «Explore» düyməsi). Onu saxlasaydıq istifadəçi sənəd
        // ünvanını dəyişə bilərdi; bizdə ünvan sabitdir.
        const standalone = window.SwaggerUIStandalonePreset;
        const presets = [
          factory.presets.apis,
          ...(standalone ? standalone.slice(1) : []),
        ];

        factory({
          url: OPENAPI_URL,
          dom_id: `#${CONTAINER_ID}`,
          presets,
          plugins: [factory.plugins.DownloadUrl],
          layout: standalone ? "StandaloneLayout" : "BaseLayout",

          // 🔴 Sessiya kukisi olmadan «Try it out» mənasızdır (fayl başlığı).
          withCredentials: true,
          // Səhifə yenilənəndə «Authorize» dəyəri itməsin.
          persistAuthorization: true,

          deepLinking: true,
          tryItOutEnabled: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          displayRequestDuration: true,
        });

        setStatus("ready");
      } catch (error) {
        console.error("[docs] Swagger UI yüklənmədi:", error);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* React 19 `rel="stylesheet"`-i özü `<head>`-ə qaldırır və dublikatı
          birləşdirir — `precedence` bunu aktivləşdirən atributdur. */}
      <link rel="stylesheet" href={STYLESHEET} precedence="default" />

      {status === "loading" ? (
        <p
          className="flex items-center gap-2 text-small text-text-secondary"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Sənəd yüklənir…
        </p>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
          <p className="flex items-center gap-2 text-h4 font-medium text-text-primary">
            <TriangleAlert className="h-5 w-5 text-danger-strong" aria-hidden />
            Swagger UI yüklənmədi
          </p>
          <p className="text-small text-text-secondary">
            Aktivlər <code>public/swagger/</code> qovluğunda tapılmadı.{" "}
            <code>npm run docs:assets</code> əmrini işlədin və səhifəni yeniləyin.
            Sənədin özü yenə də açıqdır:
          </p>
          <Button variant="outline" asChild>
            <Link href={OPENAPI_URL}>openapi.json faylını aç</Link>
          </Button>
        </div>
      ) : null}

      {/* Swagger UI öz DOM-unu buraya qurur — React içini idarə etmir. */}
      <div id={CONTAINER_ID} className="swagger-host" />
    </div>
  );
}
