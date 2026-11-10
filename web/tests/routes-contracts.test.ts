import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const WEB_ROOT = path.resolve(import.meta.dirname, "..");
const PAGES_DIR = path.join(WEB_ROOT, "src", "pages");
const COMPONENTS_DIR = path.join(WEB_ROOT, "src", "components");
const SRC_DIR = path.join(WEB_ROOT, "src");

function collectFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

describe("routes, endpoints, and SEO/MWG structural contracts", () => {
  const staticPrerenderPages = ["preguntas-frecuentes.astro", "privacidad.astro"];
  const dynamicSsrPages = [
    "index.astro",
    "dolar-bcv.astro",
    "euro-bcv.astro",
    "usdt-binance.astro",
    "brecha-cambiaria.astro",
    "tendencias.astro",
  ];
  const dynamicEndpoints = [
    "robots.txt.ts",
    "sitemap.xml.ts",
    path.join("api", "rates.json.ts"),
    path.join("api", "history.json.ts"),
  ];

  it("defines all required pages and API/crawler endpoints", () => {
    for (const rel of [...staticPrerenderPages, ...dynamicSsrPages, ...dynamicEndpoints]) {
      const target = path.join(PAGES_DIR, rel);
      expect(fs.existsSync(target), `Missing route file: ${rel}`).toBe(true);
    }
  });

  it("sets explicit prerender flags correctly across static and ISR routes", () => {
    for (const rel of staticPrerenderPages) {
      const content = fs.readFileSync(path.join(PAGES_DIR, rel), "utf-8");
      expect(content, `${rel} must export prerender = true`).toMatch(
        /export\s+const\s+prerender\s*=\s*true\b/,
      );
    }

    for (const rel of [...dynamicSsrPages, ...dynamicEndpoints]) {
      const content = fs.readFileSync(path.join(PAGES_DIR, rel), "utf-8");
      expect(content, `${rel} must export prerender = false`).toMatch(
        /export\s+const\s+prerender\s*=\s*false\b/,
      );
    }
  });

  it("provides semantic and responsive EquivalenceTable, BrechaSummary, and FaqSection components", () => {
    const eqTable = fs.readFileSync(
      path.join(COMPONENTS_DIR, "EquivalenceTable.astro"),
      "utf-8",
    );
    expect(eqTable).toContain("<table");
    expect(eqTable).toContain("<caption");
    expect(eqTable).toMatch(/<th\s[^>]*scope=/);
    expect(eqTable).toContain('role="region"');
    expect(eqTable).toContain('tabindex="0"');
    expect(eqTable).toContain("@container");

    const brechaSummary = fs.readFileSync(
      path.join(COMPONENTS_DIR, "BrechaSummary.astro"),
      "utf-8",
    );
    expect(brechaSummary).toContain("calculateBrecha");

    const faqSection = fs.readFileSync(
      path.join(COMPONENTS_DIR, "FaqSection.astro"),
      "utf-8",
    );
    expect(faqSection).toContain("<details");
    expect(faqSection).toContain("<summary");
  });

  it("never places headings inside <summary> and never uses Cache-Control no-store anywhere in src/", () => {
    const allSrcFiles = collectFilesRecursive(SRC_DIR);
    for (const file of allSrcFiles) {
      const text = fs.readFileSync(file, "utf-8");
      const summaryMatches = text.match(/<summary[\s\S]*?<\/summary>/gi) ?? [];
      for (const block of summaryMatches) {
        expect(block, `Heading inside <summary> in ${file}`).not.toMatch(/<h[1-6]\b/i);
      }
      expect(text, `Forbidden no-store cache directive in ${file}`).not.toMatch(
        /no-store/i,
      );
    }
  });

  it("keeps a single primary H1 strategy per HTML page and uses dynamic public sitemap links", () => {
    for (const rel of [...staticPrerenderPages, ...dynamicSsrPages]) {
      const text = fs.readFileSync(path.join(PAGES_DIR, rel), "utf-8");
      const explicitH1Count = (text.match(/<h1[\s>]/g) ?? []).length;
      const calcAsH1 = /asH1=\{true\}/.test(text) ? 1 : 0;
      expect(
        explicitH1Count + calcAsH1,
        `${rel} must declare exactly one H1 strategy`,
      ).toBe(1);
    }
  });

  it("executes endpoint GET handlers cleanly and avoids caching degraded errors as fresh", async () => {
    const robotsMod = await import("@/pages/robots.txt");
    const robotsRes = await robotsMod.GET({
      url: new URL("https://cambiorapido.app/robots.txt"),
    } as never);
    expect(robotsRes.status).toBe(200);
    expect(robotsRes.headers.get("Content-Type")).toContain("text/plain");
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain("Disallow: /api/");
    expect(robotsText).toContain("Sitemap: https://cambiorapido.app/sitemap.xml");

    const sitemapMod = await import("@/pages/sitemap.xml");
    const sitemapRes = await sitemapMod.GET({
      url: new URL("https://cambiorapido.app/sitemap.xml"),
    } as never);
    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.headers.get("Content-Type")).toContain("application/xml");
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("<loc>https://cambiorapido.app/dolar-bcv</loc>");

    const ratesMod = await import("@/pages/api/rates.json");
    const ratesRes = await ratesMod.GET({
      url: new URL("https://cambiorapido.app/api/rates.json"),
    } as never);
    expect(ratesRes.status).toBe(200);
    expect(ratesRes.headers.get("Content-Type")).toContain("application/json");
    const ratesJson = (await ratesRes.json()) as { ok: boolean; rates: unknown[] };
    expect(typeof ratesJson.ok).toBe("boolean");
    expect(Array.isArray(ratesJson.rates)).toBe(true);
    if (!ratesJson.ok) {
      expect(ratesRes.headers.get("Cache-Control")).toBe(
        "public, max-age=0, must-revalidate",
      );
    }

    const historyMod = await import("@/pages/api/history.json");
    const historyRes = await historyMod.GET({
      url: new URL("https://cambiorapido.app/api/history.json?days=999&currencyIds=1,3"),
    } as never);
    expect(historyRes.status).toBe(200);
    const historyJson = (await historyRes.json()) as {
      ok: boolean;
      days: number;
      currencyIds: number[];
    };
    expect(historyJson.days).toBe(60);
    expect(historyJson.currencyIds).toEqual([1, 3]);
  });

  it("hides header on home, removes BCV switcher from CalculatorCard, and places theme + PWA controls in Footer/BaseLayout", () => {
    const homeAstro = fs.readFileSync(path.join(PAGES_DIR, "index.astro"), "utf-8");
    expect(homeAstro).toMatch(/hideHeader=\{true\}/);
    expect(homeAstro).toContain("min-height: 100dvh");

    const calcAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "CalculatorCard.astro"),
      "utf-8",
    );
    expect(calcAstro).not.toContain("data-bcv-toggle-wrap");
    expect(calcAstro).not.toContain("data-bcv-mode");

    const navbarAstro = fs.readFileSync(path.join(COMPONENTS_DIR, "Navbar.astro"), "utf-8");
    expect(navbarAstro).not.toContain("data-theme-toggle");

    const footerAstro = fs.readFileSync(path.join(COMPONENTS_DIR, "Footer.astro"), "utf-8");
    expect(footerAstro).toContain("data-theme-toggle");
    expect(footerAstro).toContain("data-pwa-install");
    expect(footerAstro).toContain("data-pwa-ios-hint");

    const layoutAstro = fs.readFileSync(
      path.join(SRC_DIR, "layouts", "BaseLayout.astro"),
      "utf-8",
    );
    expect(layoutAstro).toContain("hideHeader");
    expect(layoutAstro).toContain("initPwa");

    const dolarAstro = fs.readFileSync(path.join(PAGES_DIR, "dolar-bcv.astro"), "utf-8");
    expect(dolarAstro).not.toContain("directo en la calculadora superior");
  });
});
