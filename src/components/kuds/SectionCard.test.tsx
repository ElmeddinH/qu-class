// ============================================================================
// src/components/kuds/SectionCard.test.tsx
// T22 — `CardHeading` / `SectionCard` başlıq semantikası.
//
// 🔴 TESTİN SUALI: shadcn `CardTitle` `<div>` render edir; wrapper onu
// accessibility ağacında BAŞLIQ kimi göstərirmi və səviyyəni doğru verirmi?
//
// ⚠️ Yoxlama TEQ adına baxmır (`<div>` qalır — `ui/card.tsx` toxunulmazdır),
// ROLA baxır: `getByRole("heading", { level })`. Səhifə səviyyəsində eyni
// şərt `tests/e2e/headings.spec.ts`-də bütün route-lar üzrə ölçülür.
// ============================================================================

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CardHeading, SectionCard } from "./SectionCard";

afterEach(() => {
  cleanup();
});

describe("CardHeading", () => {
  it("başlıq rolu verir və defolt səviyyə 2-dir", () => {
    render(<CardHeading>Səhifələr</CardHeading>);

    expect(screen.getByRole("heading", { level: 2, name: "Səhifələr" })).toBeDefined();
  });

  it("`level` prop-u aria-level-i dəyişir", () => {
    render(<CardHeading level={3}>Sinif xronologiyası</CardHeading>);

    expect(
      screen.getByRole("heading", { level: 3, name: "Sinif xronologiyası" }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("əlavə prop-lar (id, className) ötürülür — `aria-labelledby` zənciri qırılmır", () => {
    render(
      <CardHeading id="section-heading" className="text-h4">
        Nəzərə alın
      </CardHeading>,
    );

    const heading = screen.getByRole("heading", { name: "Nəzərə alın" });
    expect(heading.id).toBe("section-heading");
    expect(heading.className).toContain("text-h4");
  });

  it("shadcn `CardTitle` DOM-u dəyişmir — hələ də <div>-dir", () => {
    // Bu, `ui/` toxunulmazlığının ölçüsüdür: düzəliş semantikadadır, teqdə yox.
    render(<CardHeading>Növbələr</CardHeading>);

    expect(screen.getByRole("heading", { name: "Növbələr" }).tagName).toBe("DIV");
  });
});

describe("SectionCard", () => {
  it("başlıq + təsvir + məzmunu KUDS §12 sırası ilə render edir", () => {
    render(
      <SectionCard title="Səhifələr (3)" description="İctimai məzmun">
        <p>Məzmun</p>
      </SectionCard>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Səhifələr (3)" })).toBeDefined();
    expect(screen.getByText("İctimai məzmun")).toBeDefined();
    expect(screen.getByText("Məzmun")).toBeDefined();
  });

  it("`headingId` `aria-labelledby` üçün başlığa yazılır", () => {
    const { container } = render(
      <SectionCard title="Növbələr" headingId="queues" level={3}>
        <p>Boş</p>
      </SectionCard>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Növbələr" }).id).toBe("queues");
    expect(container.querySelector("#queues")).not.toBeNull();
  });
});
