import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("web project scaffold", () => {
  it("contains required PWA and OG assets in public/", () => {
    const publicDir = path.resolve(import.meta.dirname, "../public");
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "og-image.png"))).toBe(true);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicDir, "manifest.json"), "utf-8"),
    );
    expect(manifest.theme_color).toBe("#16a249");
    expect(manifest.lang).toBe("es-VE");
  });
});
