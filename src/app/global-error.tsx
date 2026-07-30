"use client";

// ============================================================================
// src/app/global-error.tsx
// ROOT LAYOUT-un xəta sərhədi — son sığorta.
//
// 🔴 `error.tsx` ROOT LAYOUT-un ÖZÜNDƏ atılan xətanı TUTA BİLMİR (layout onun
// üstündədir). Bu fayl olmayanda belə xəta TAM AĞ EKRAN verir — nə mətn, nə
// düymə, nə də konsola mənalı bir şey. İstifadəçinin gördüyü: "səhifə açılmır".
//
// ⚠️ Bu komponent ROOT LAYOUT-u ƏVƏZ EDİR, ona görə `<html>` və `<body>`
// teqlərini ÖZÜ yazmalıdır (Next.js müqaviləsi). Layout render olunmadığı
// üçün font dəyişəni və `globals.css`-in gətirdiyi siniflər ETİBARLI DEYİL —
// stil `style` atributu ilə, KUDS hex dəyərləri ilə birbaşa verilir.
// Bu, CLAUDE.md §2-nin (hardcode rəng yoxdur) YEGANƏ istisnasıdır və səbəbi
// budur: Tailwind sinifləri bu ekranda işləməyə bilər.
//
// ⚠️ Praktikada demək olar heç vaxt görünmür — məhz buna görə sadə saxlanılıb.
// ============================================================================

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="az">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#F8FAFC", // KUDS background
          color: "#1E293B", // KUDS text-primary
          fontFamily: "Poppins, Tahoma, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <main style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 12px" }}>
            Sistem xətası
          </h1>

          <p style={{ fontSize: 16, color: "#64748B", margin: "0 0 24px" }}>
            Tətbiq açıla bilmədi. Səhifəni yeniləyin — problem davam edərsə
            universitetin texniki dəstəyinə müraciət edin.
          </p>

          {error.digest ? (
            <p
              style={{
                fontSize: 12,
                color: "#64748B",
                fontFamily: "monospace",
                margin: "0 0 24px",
              }}
            >
              Xəta kodu: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              backgroundColor: "#44766C", // KUDS ku-green — ağ mətnlə 5.18:1 ✅
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Yenidən cəhd et
          </button>
        </main>
      </body>
    </html>
  );
}
