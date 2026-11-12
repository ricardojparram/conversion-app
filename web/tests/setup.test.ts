import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

describe("web project scaffold", () => {
  it("contains required PWA and OG assets in public/", () => {
    const publicDir = path.resolve(import.meta.dirname, "../public");
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "favicon.svg"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "apple-touch-icon.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-maskable-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "sw.js"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "og-image.png"))).toBe(true);

    expect(readPngDimensions(path.join(publicDir, "apple-touch-icon.png"))).toEqual({
      width: 180,
      height: 180,
    });
    expect(readPngDimensions(path.join(publicDir, "icon-192.png"))).toEqual({
      width: 192,
      height: 192,
    });
    expect(readPngDimensions(path.join(publicDir, "icon-512.png"))).toEqual({
      width: 512,
      height: 512,
    });
    expect(readPngDimensions(path.join(publicDir, "icon-maskable-512.png"))).toEqual({
      width: 512,
      height: 512,
    });

    const faviconSvg = fs.readFileSync(path.join(publicDir, "favicon.svg"), "utf-8");
    expect(faviconSvg).toContain('fill="#16a249"');
    expect(faviconSvg).toContain('stroke="#095625"');

    const icoHeader = fs.readFileSync(path.join(publicDir, "favicon.ico"));
    expect(icoHeader.readUInt16LE(0)).toBe(0);
    expect(icoHeader.readUInt16LE(2)).toBe(1);
    expect(icoHeader.readUInt16LE(4)).toBeGreaterThanOrEqual(3);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicDir, "manifest.json"), "utf-8"),
    );
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#16a249");
    expect(manifest.lang).toBe("es-VE");
    expect(manifest.icons).toContainEqual({
      src: "/icon-maskable-512.png",
      type: "image/png",
      sizes: "512x512",
      purpose: "maskable",
    });
  });
});
