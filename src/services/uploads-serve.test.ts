// @vitest-environment node
// ============================================================================
// src/services/uploads-serve.test.ts
//
// Ölçülən şey: `public/uploads` altından fayl verilməsinin YOL VALİDASİYASI.
// Bu qat istifadəçidən gələn seqmentləri diskə çevirir, yəni burada bir
// boşluq = ixtiyari fayl oxuma. Testlər həmin sərhədə baxır, oxunan bayta yox.
// ============================================================================

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  contentTypeFor,
  readUpload,
  resolveUploadPath,
  uploadsRoot,
} from "@/services/uploads-serve";

describe("resolveUploadPath — təhlükəsizlik sərhədi", () => {
  it("`storage.ts`-in yazdığı formanı qəbul edir", () => {
    const resolved = resolveUploadPath(["2026", "08", "cm1abc234def.webp"]);
    expect(resolved).toBe(path.join(uploadsRoot(), "2026", "08", "cm1abc234def.webp"));
  });

  it("thumb variantını da qəbul edir", () => {
    expect(resolveUploadPath(["2026", "08", "cm1abc234def-thumb.webp"])).not.toBeNull();
  });

  it.each([
    [["..", "..", "etc", "passwd"], "yuxarı qalxma"],
    [["2026", "..", "..", "prisma", "dev.db"], "ortada `..`"],
    [["2026", "08", "..%2Fx.webp"], "kodlanmış ayırıcı"],
    [["2026", "08", "x.webp\0.png"], "NUL bayt"],
    [["/etc/passwd"], "mütləq yol"],
    [[], "boş seqment siyahısı"],
    // Seqment ALNUM ilə başlamalıdır: `.hidden`, `-flag`, `_tmp` kimi adlar
    // `storage.ts`-in yazdığı formada YOXDUR və gizli fayl oxumağa aparır.
    [["2026", "08", ".env.webp"], "nöqtə ilə başlayan ad"],
    [["_gizli", "x.webp"], "alt xətt ilə başlayan qovluq"],
  ])("rədd edir: %j (%s)", (segments) => {
    expect(resolveUploadPath(segments as string[])).toBeNull();
  });

  it("uzantı ağ siyahıda deyilsə rədd edir — SVG DAXİL", () => {
    // SVG skript daşıya bilir və eyni mənbədən verilir (`storage.ts:35-40`).
    expect(resolveUploadPath(["2026", "08", "x.svg"])).toBeNull();
    expect(resolveUploadPath(["2026", "08", "x.html"])).toBeNull();
    expect(resolveUploadPath(["2026", "08", "x.db"])).toBeNull();
    expect(resolveUploadPath(["2026", "08", "x"])).toBeNull();
  });

  it("həddindən artıq dərin yolu rədd edir", () => {
    const deep = [...Array.from({ length: 9 }, () => "a"), "x.webp"];
    expect(resolveUploadPath(deep)).toBeNull();
  });
});

describe("contentTypeFor", () => {
  it("uzantını MIME-a çevirir", () => {
    expect(contentTypeFor("/a/b/c.webp")).toBe("image/webp");
    expect(contentTypeFor("/a/b/c.JPG")).toBe("image/jpeg");
  });
});

describe("readUpload", () => {
  it("mövcud faylı oxuyur, olmayana `null` qaytarır", async () => {
    // 🔴 Test qovluğu KÖKÜN ALTINDA yaradılır: `uploadsRoot()` `process.cwd()`
    // ilə hesablanır və bu, istehsalda simvolik keçidin arxasındaki `/data`
    // olacaq. Sabit yol yazmaq testi həmin qurğudan qoparardı.
    const dir = path.join(uploadsRoot(), "zz-vitest", "01");
    const file = path.join(dir, "sample.webp");

    await mkdir(dir, { recursive: true });
    await writeFile(file, Buffer.from([0x52, 0x49, 0x46, 0x46]));

    try {
      const found = await readUpload(["zz-vitest", "01", "sample.webp"]);
      expect(found?.contentType).toBe("image/webp");
      expect(found?.size).toBe(4);

      expect(await readUpload(["zz-vitest", "01", "yoxdur.webp"])).toBeNull();

      // Ad ağ siyahıdan keçsə belə QOVLUQ verilmir — `stat().isFile()` qapısı.
      await mkdir(path.join(dir, "qovluq.webp"), { recursive: true });
      expect(await readUpload(["zz-vitest", "01", "qovluq.webp"])).toBeNull();
    } finally {
      await rm(path.join(uploadsRoot(), "zz-vitest"), { recursive: true, force: true });
    }
  });
});
