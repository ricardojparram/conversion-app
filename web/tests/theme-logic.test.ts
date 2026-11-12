import { describe, expect, it } from "vitest";
import {
  computeNextColorScheme,
  normalizeStoredColorScheme,
  resolveRenderedScheme,
  syncThemeColorMeta,
} from "@/scripts/theme";

describe("dark-mode-toggle tri-state logic", () => {
  it("resolves rendered scheme from meta content and OS preference", () => {
    expect(resolveRenderedScheme("light dark", false)).toBe("light");
    expect(resolveRenderedScheme("light dark", true)).toBe("dark");
    expect(resolveRenderedScheme("dark", false)).toBe("dark");
    expect(resolveRenderedScheme("light", true)).toBe("light");
  });

  it("normalizes invalid localStorage values back to light dark", () => {
    expect(normalizeStoredColorScheme(null)).toBe("light dark");
    expect(normalizeStoredColorScheme("sepia")).toBe("light dark");
    expect(normalizeStoredColorScheme("dark")).toBe("dark");
    expect(normalizeStoredColorScheme("light")).toBe("light");
  });

  it("stores literal opposite when toggling away from OS scheme", () => {
    // OS is light, page currently follows OS ("light dark") -> pin dark
    expect(computeNextColorScheme("light dark", false)).toEqual({
      stored: "dark",
      metaContent: "dark",
    });

    // OS is dark, page currently follows OS ("light dark") -> pin light
    expect(computeNextColorScheme("light dark", true)).toEqual({
      stored: "light",
      metaContent: "light",
    });
  });

  it("clears stored override when toggling back to current OS scheme", () => {
    // OS is light, user had pinned dark -> toggling targets light (matches OS) -> delete entry
    expect(computeNextColorScheme("dark", false)).toEqual({
      stored: null,
      metaContent: "light dark",
    });

    // OS switched to dark while pinned dark -> user sees dark, toggles -> targets light (!== OS dark) -> pin light
    expect(computeNextColorScheme("dark", true)).toEqual({
      stored: "light",
      metaContent: "light",
    });
  });

  it("syncs light and dark theme-color meta tags with scheme overrides and system mode", () => {
    const createMeta = (slot: "light" | "dark") => {
      const attrs = new Map<string, string>([
        ["data-theme-color", slot],
        ["content", slot === "dark" ? "#080f17" : "#e8edf4"],
      ]);
      return {
        getAttribute: (name: string) => attrs.get(name) ?? null,
        setAttribute: (name: string, value: string) => attrs.set(name, value),
      } as unknown as HTMLMetaElement;
    };

    const lightMeta = createMeta("light");
    const darkMeta = createMeta("dark");
    const fakeDoc = {
      querySelectorAll: () => [lightMeta, darkMeta],
    } as unknown as Pick<Document, "querySelectorAll">;

    syncThemeColorMeta(fakeDoc, "dark");
    expect(lightMeta.getAttribute("content")).toBe("#080f17");
    expect(darkMeta.getAttribute("content")).toBe("#080f17");

    syncThemeColorMeta(fakeDoc, "light");
    expect(lightMeta.getAttribute("content")).toBe("#e8edf4");
    expect(darkMeta.getAttribute("content")).toBe("#e8edf4");

    syncThemeColorMeta(fakeDoc, "light dark");
    expect(lightMeta.getAttribute("content")).toBe("#e8edf4");
    expect(darkMeta.getAttribute("content")).toBe("#080f17");
  });
});
