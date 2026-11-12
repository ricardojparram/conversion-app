import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
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
  const staticPrerenderPages = ["preguntas-frecuentes.astro", "privacidad.astro", "404.astro"];
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
    path.join("og", "[route].png.ts"),
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

    const homeAstro = fs.readFileSync(path.join(PAGES_DIR, "index.astro"), "utf-8");
    expect(homeAstro).toContain('titleTag="p"');
    expect(homeAstro).not.toContain("brandLabel=");
    expect(homeAstro).not.toMatch(/asH1=\{true\}/);
    const h1Idx = homeAstro.search(/<h1[\s>]/);
    const firstH2Idx = homeAstro.search(/<h2[\s>]/);
    expect(h1Idx).toBeGreaterThan(-1);
    expect(firstH2Idx).toBeGreaterThan(h1Idx);
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

  it("hides header on home, removes BCV switcher from CalculatorCard, and keeps desktop-only Navbar theme toggle plus Footer controls", () => {
    const homeAstro = fs.readFileSync(path.join(PAGES_DIR, "index.astro"), "utf-8");
    expect(homeAstro).toMatch(/hideHeader=\{true\}/);
    expect(homeAstro).toContain("min-height: 100dvh");
    expect(homeAstro).toContain("fetchRatesHistory");
    expect(homeAstro).toContain('variant="home"');
    expect(homeAstro).toContain("scroll-cue");

    const calcAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "CalculatorCard.astro"),
      "utf-8",
    );
    expect(calcAstro).not.toContain("data-bcv-toggle-wrap");
    expect(calcAstro).not.toContain("data-bcv-mode");
    expect(calcAstro).toContain("data-swap-btn");
    expect(calcAstro).toContain("data-inputs-stack");

    const navbarAstro = fs.readFileSync(path.join(COMPONENTS_DIR, "Navbar.astro"), "utf-8");
    expect(navbarAstro).toContain("navbar-theme-switch");
    expect(navbarAstro).toContain("data-theme-toggle");
    expect(navbarAstro).toMatch(
      /\.navbar-theme-switch\s*\{[^}]*display:\s*none/,
    );
    expect(navbarAstro).toMatch(
      /@media\s*\(min-width:\s*54rem\)[\s\S]*\.navbar-theme-switch\s*\{[^}]*display:\s*inline-flex/,
    );

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

    const brechaPage = fs.readFileSync(
      path.join(PAGES_DIR, "brecha-cambiaria.astro"),
      "utf-8",
    );
    expect(brechaPage).toContain("showBrechaUsd={true}");
  });

  it("places a desktop-only floating theme toggle in Home corner, displays brecha in $, and keeps instant full-height copy button", () => {
    const homeAstro = fs.readFileSync(path.join(PAGES_DIR, "index.astro"), "utf-8");
    expect(homeAstro).toContain("floating-theme-toggle");
    expect(homeAstro).toContain("data-theme-toggle");
    expect(homeAstro).toContain("@media (min-width: 768px)");

    const brechaSummary = fs.readFileSync(
      path.join(COMPONENTS_DIR, "BrechaSummary.astro"),
      "utf-8",
    );
    expect(brechaSummary).toContain("data-brecha-impact-usd-usdt");
    expect(brechaSummary).toContain("data-brecha-impact-usd-bcv");
    expect(brechaSummary).toContain("impactUsdAtUsdt");
    expect(brechaSummary).toContain("impactUsdAtBcv");

    const calcAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "CalculatorCard.astro"),
      "utf-8",
    );
    expect(calcAstro).toContain("min-inline-size: 44px");
    expect(calcAstro).toContain("min-block-size: 44px");
    expect(calcAstro).toContain("touch-action: manipulation");
  });

  it("keeps outer table containers non-circular, preserves SVG chart strokes/dots, and avoids 768px navbar cramping", () => {
    const eqTable = fs.readFileSync(
      path.join(COMPONENTS_DIR, "EquivalenceTable.astro"),
      "utf-8",
    );
    expect(eqTable).toMatch(/\.eq-section\s*\{[^}]*container-type:\s*inline-size/);
    expect(eqTable).not.toMatch(/\.table-wrapper\s*\{[^}]*container-type:/);
    expect(eqTable).toMatch(/@container\s*\(width\s*<\s*520px\)[\s\S]*caption[\s\S]*display:\s*block/);
    expect(eqTable).toMatch(/tbody th\s*\{[^}]*position:\s*static/);

    const tendenciasAstro = fs.readFileSync(
      path.join(PAGES_DIR, "tendencias.astro"),
      "utf-8",
    );
    expect(tendenciasAstro).toContain('class="table-container"');
    expect(tendenciasAstro).toMatch(/\.table-container\s*\{[^}]*container-type:\s*inline-size/);
    expect(tendenciasAstro).toMatch(/@container\s*\(width\s*<\s*560px\)[\s\S]*caption/);

    const historyPanel = fs.readFileSync(
      path.join(COMPONENTS_DIR, "RateHistoryPanel.astro"),
      "utf-8",
    );
    const historyClient = fs.readFileSync(
      path.join(SRC_DIR, "scripts", "history-client.ts"),
      "utf-8",
    );
    expect(historyPanel).toContain('vector-effect="non-scaling-stroke"');
    expect(historyPanel).toContain("data-chart-dots");
    expect(historyPanel).not.toContain("<circle");
    expect(historyClient).toContain('vector-effect="non-scaling-stroke"');
    expect(historyClient).toContain("chart-dot-marker");
    expect(historyClient).not.toContain("<circle");

    const navbarAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "Navbar.astro"),
      "utf-8",
    );
    expect(navbarAstro).toContain("@media (min-width: 54rem)");
    expect(navbarAstro).toContain("min-block-size: 44px");

    const globalCss = fs.readFileSync(
      path.join(SRC_DIR, "styles", "global.css"),
      "utf-8",
    );
    expect(globalCss).toContain("overflow-wrap: anywhere");
  });

  it("uses white CheckCircle with green check, hides mobile hamburger >= 54rem without freeze, and defaults calculator order Foreign -> Bolívares", () => {
    const checkCircleAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "icons", "CheckCircle.astro"),
      "utf-8",
    );
    expect(checkCircleAstro).toContain('fill="#ffffff"');
    expect(checkCircleAstro).toContain('stroke="var(--cr-primary, #16a249)"');

    const calcClient = fs.readFileSync(
      path.join(SRC_DIR, "scripts", "calculator-client.ts"),
      "utf-8",
    );
    expect(calcClient).toContain('fill="#ffffff"');
    expect(calcClient).toContain('stroke="var(--cr-primary, #16a249)"');

    const navbarAstro = fs.readFileSync(path.join(COMPONENTS_DIR, "Navbar.astro"), "utf-8");
    const media54Idx = navbarAstro.indexOf("@media (min-width: 54rem)");
    const baseMobileBtnIdx = navbarAstro.indexOf(".mobile-menu-btn {");
    expect(media54Idx).toBeGreaterThan(-1);
    expect(baseMobileBtnIdx).toBeGreaterThan(-1);
    expect(baseMobileBtnIdx).toBeLessThan(media54Idx);
    expect(navbarAstro).toMatch(
      /@media\s*\(min-width:\s*54rem\)[\s\S]*\.mobile-menu-btn\s*\{[^}]*display:\s*none/,
    );
    expect(navbarAstro).toContain('closedby="any"');
    expect(navbarAstro).toContain("autofocus");
    expect(navbarAstro).toContain("mobile-drawer-theme-switch");

    const calcAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "CalculatorCard.astro"),
      "utf-8",
    );
    const foreignFieldIdx = calcAstro.indexOf('data-field-role="foreign"');
    const bsFieldIdx = calcAstro.indexOf('data-field-role="bs"');
    expect(foreignFieldIdx).toBeGreaterThan(-1);
    expect(bsFieldIdx).toBeGreaterThan(-1);
    expect(foreignFieldIdx).toBeLessThan(bsFieldIdx);
    expect(calcAstro).toMatch(
      /\.currency-field\[data-field-role="foreign"\]\s*\{[^}]*order:\s*1/,
    );
    expect(calcAstro).toMatch(
      /\.currency-field\[data-field-role="bs"\]\s*\{[^}]*order:\s*3/,
    );
    expect(calcAstro).toContain('data-offline-banner hidden');
  });

  it("provides interactive chart column hover elements and HeroUI DataGrid trays with neutral highlights", () => {
    const historyPanel = fs.readFileSync(
      path.join(COMPONENTS_DIR, "RateHistoryPanel.astro"),
      "utf-8",
    );
    expect(historyPanel).toContain("data-chart-wrapper");
    expect(historyPanel).toContain("data-chart-hover-band");
    expect(historyPanel).toContain("data-chart-crosshair");
    expect(historyPanel).toContain("data-chart-columns");
    expect(historyPanel).toContain("data-chart-tooltip");
    expect(historyPanel).not.toContain("<circle");

    const eqTable = fs.readFileSync(
      path.join(COMPONENTS_DIR, "EquivalenceTable.astro"),
      "utf-8",
    );
    expect(eqTable).toContain('class="table-tray"');
    expect(eqTable).toContain("filter: drop-shadow");
    expect(eqTable).not.toContain("max-block-size:");
    expect(eqTable).not.toMatch(/\.is-featured-row\s*\.amount-value\s*\{[^}]*var\(--cr-primary-ink\)/);
    expect(eqTable).toContain("amount-sub");
    expect(eqTable).not.toContain("nth-child(even)");
    expect(eqTable).not.toContain("--cr-row-alt");
    expect(eqTable).not.toContain("--cr-row-highlight");
    expect(eqTable).toMatch(/tbody\s*\{[^}]*background:\s*transparent/);
    expect(eqTable).toMatch(/tbody tr\s*\{[^}]*background:\s*transparent/);
    expect(eqTable).toMatch(
      /tbody th,\s*\r?\n\s*tbody td\s*\{[^}]*background-color:\s*var\(--cr-card-inner\)[^}]*border-bottom:\s*1px solid var\(--cr-table-divider\)/,
    );
    expect(eqTable).toContain("border-start-start-radius: 1rem;");
    expect(eqTable).toContain("border-end-end-radius: 1rem;");

    const tendenciasAstro = fs.readFileSync(
      path.join(PAGES_DIR, "tendencias.astro"),
      "utf-8",
    );
    expect(tendenciasAstro).toContain('class="table-tray"');
    expect(tendenciasAstro).toContain("table-tray-footer");
    expect(tendenciasAstro).toContain("formatShortCaracasMonthDay");
    expect(tendenciasAstro).toContain("buildContinuousDailyTimeline");
    expect(tendenciasAstro).toContain("const isTodayRow = row.date === todayCaracasKey");
    expect(tendenciasAstro).not.toMatch(/<time[^>]*title=/);
    expect(tendenciasAstro).toContain("filter: drop-shadow");
    expect(tendenciasAstro).not.toContain("max-block-size:");
    expect(tendenciasAstro).not.toContain("nth-child(even)");
    expect(tendenciasAstro).not.toContain("--cr-row-alt");
    expect(tendenciasAstro).not.toContain("--cr-row-highlight");
    expect(tendenciasAstro).toMatch(/tbody\s*\{[^}]*background:\s*transparent/);
    expect(tendenciasAstro).toMatch(/tbody tr\s*\{[^}]*background:\s*transparent/);
    expect(tendenciasAstro).toMatch(
      /tbody th,\s*\r?\n\s*tbody td\s*\{[^}]*background-color:\s*var\(--cr-card-inner\)[^}]*border-bottom:\s*1px solid var\(--cr-table-divider\)/,
    );
    expect(tendenciasAstro).toContain("border-start-start-radius: 1rem;");
    expect(tendenciasAstro).toContain("border-end-end-radius: 1rem;");
  });

  it("uses semantic live <time> elements with natural Caracas date formatting across calculator, subpages, and detail history", () => {
    const layoutAstro = fs.readFileSync(
      path.join(SRC_DIR, "layouts", "BaseLayout.astro"),
      "utf-8",
    );
    expect(layoutAstro).toContain("initLiveTimestamps");

    const liveTargets = [
      path.join(COMPONENTS_DIR, "CalculatorCard.astro"),
      path.join(COMPONENTS_DIR, "RateHistoryPanel.astro"),
      path.join(PAGES_DIR, "dolar-bcv.astro"),
      path.join(PAGES_DIR, "euro-bcv.astro"),
      path.join(PAGES_DIR, "usdt-binance.astro"),
      path.join(PAGES_DIR, "brecha-cambiaria.astro"),
    ];

    for (const filePath of liveTargets) {
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `${path.basename(filePath)} missing data-live-time`).toContain(
        "data-live-time",
      );
      expect(content, `${path.basename(filePath)} missing <time>`).toContain("<time");
      expect(
        content,
        `${path.basename(filePath)} still uses formatCaracasTimestamp`,
      ).not.toContain("formatCaracasTimestamp");
    }

    const dolarAstro = fs.readFileSync(path.join(PAGES_DIR, "dolar-bcv.astro"), "utf-8");
    expect(dolarAstro).toContain('data-live-future="true"');

    const euroAstro = fs.readFileSync(path.join(PAGES_DIR, "euro-bcv.astro"), "utf-8");
    expect(euroAstro).toContain('data-live-future="true"');

    const calcClient = fs.readFileSync(
      path.join(SRC_DIR, "scripts", "calculator-client.ts"),
      "utf-8",
    );
    expect(calcClient).toContain("syncLiveTimeElement");
    expect(calcClient).not.toContain("formatCaracasTimestamp");
  });

  it("renders valid dynamic PNG OG images for supported routes, returns 404 on invalid routes, and configures vercel.json SEO/security headers", async () => {
    const ogMod = await import("@/pages/og/[route].png");

    for (const route of ["home", "dolar-bcv", "brecha-cambiaria", "tendencias"]) {
      const res = await ogMod.GET({ params: { route } } as never);
      expect(res.status, `Expected 200 PNG for ${route}`).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(bytes.byteLength).toBeGreaterThan(5000);
      expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }

    const notFoundRes = await ogMod.GET({ params: { route: "invalid-route" } } as never);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

    const notFoundAstro = fs.readFileSync(path.join(PAGES_DIR, "404.astro"), "utf-8");
    expect(notFoundAstro).toContain('buildPageMeta("not-found")');

    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(WEB_ROOT, "vercel.json"), "utf-8"),
    ) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const rootRule = vercelConfig.headers.find((h) => h.source === "/(.*)");
    const apiRule = vercelConfig.headers.find((h) => h.source === "/api/(.*)");
    const notFoundRule = vercelConfig.headers.find((h) => h.source === "/404");

    expect(rootRule?.headers).toContainEqual({
      key: "X-Content-Type-Options",
      value: "nosniff",
    });
    expect(rootRule?.headers).toContainEqual({
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    });
    expect(rootRule?.headers).toContainEqual({
      key: "X-Frame-Options",
      value: "DENY",
    });
    expect(rootRule?.headers).toContainEqual({
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    });
    expect(apiRule?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow",
    });
    expect(notFoundRule?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow",
    });

    const privacidadAstro = fs.readFileSync(path.join(PAGES_DIR, "privacidad.astro"), "utf-8");
    expect(privacidadAstro).not.toContain("mailto:");
    expect(privacidadAstro).not.toContain("info@cambiorapido.app");

    const astroConfig = fs.readFileSync(path.join(WEB_ROOT, "astro.config.mjs"), "utf-8");
    expect(astroConfig).toContain('tsconfig: path.join(webDir, "tsconfig.json")');
    expect(astroConfig).toContain('inlineStylesheets: "never"');
    expect(astroConfig).toContain("assetsInlineLimit");
  });

  it("enforces strict hash-based CSP, CORP rules, and keeps inline script digest synced with BaseLayout.astro", () => {
    const layoutPath = path.join(SRC_DIR, "layouts", "BaseLayout.astro");
    const layoutAstro = fs.readFileSync(layoutPath, "utf-8");
    expect(layoutAstro).toContain("initNavbar");

    const navbarAstro = fs.readFileSync(path.join(COMPONENTS_DIR, "Navbar.astro"), "utf-8");
    expect(navbarAstro).not.toMatch(/<script\b/i);

    const inlineThemeMatch = layoutAstro.match(/<script\s+is:inline>([\s\S]*?)<\/script>/);
    expect(inlineThemeMatch, "BaseLayout.astro missing theme <script is:inline>").not.toBeNull();
    const expectedHash = crypto
      .createHash("sha256")
      .update(inlineThemeMatch![1], "utf8")
      .digest("base64");
    const expectedHashToken = `'sha256-${expectedHash}'`;

    // Ensure no unexpected inline executable scripts, inline <style is:inline>, inline event handlers, or javascript: URLs exist.
    const allSrcFiles = collectFilesRecursive(SRC_DIR);
    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (file.endsWith(".astro") || file.endsWith(".html")) {
        expect(content, `Forbidden <style is:inline> in ${file}`).not.toMatch(
          /<style\b[^>]*\bis:inline\b/i,
        );
        for (const match of content.matchAll(
          /<script\b([^>]*?)(?:\/>|>([\s\S]*?)<\/script>)/gi,
        )) {
          const attrs = match[1] ?? "";
          const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(attrs);
          const hasInlineAttr = /\bis:inline\b/i.test(attrs);
          if (hasInlineAttr && !isJsonLd) {
            expect(file, `Unexpected executable <script is:inline> in ${file}`).toBe(layoutPath);
          }
        }
      }
      expect(content, `Forbidden inline JS event attribute in ${file}`).not.toMatch(
        /\s+on(?:click|load|error|mouseover|focus)\s*=\s*["']/i,
      );
      expect(content, `Forbidden javascript: URI in ${file}`).not.toMatch(/javascript:/i);
    }

    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(WEB_ROOT, "vercel.json"), "utf-8"),
    ) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };

    const rootIdx = vercelConfig.headers.findIndex((h) => h.source === "/(.*)");
    const ogIdx = vercelConfig.headers.findIndex((h) => h.source === "/og/(.*)");
    const publicMediaIdx = vercelConfig.headers.findIndex(
      (h) =>
        h.source.includes("og-image") &&
        h.source.includes("apple-touch-icon") &&
        h.source.includes("icon-512") &&
        h.source.includes("icon-maskable-512"),
    );

    expect(layoutAstro).toContain("viewport-fit=cover");
    expect(layoutAstro).toContain("<PwaInstallPrompt />");
    expect(layoutAstro).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
    expect(layoutAstro).toContain('data-theme-color="light"');
    expect(layoutAstro).toContain('content="#e8edf4"');
    expect(layoutAstro).toContain('data-theme-color="dark"');
    expect(layoutAstro).toContain('content="#080f17"');
    expect(layoutAstro).not.toContain('name="theme-color" content="#16a249"');
    expect(layoutAstro.indexOf('data-theme-color="dark"')).toBeLessThan(
      layoutAstro.indexOf("<script is:inline>"),
    );

    const pwaPromptAstro = fs.readFileSync(
      path.join(COMPONENTS_DIR, "PwaInstallPrompt.astro"),
      "utf-8",
    );
    expect(pwaPromptAstro).toContain('role="region"');
    expect(pwaPromptAstro).toContain('popover="manual"');
    expect(pwaPromptAstro).toContain('popovertarget="pwa-install-banner"');
    expect(pwaPromptAstro).toContain('popovertargetaction="hide"');
    expect(pwaPromptAstro).toContain("data-pwa-install-banner");
    expect(pwaPromptAstro).toContain("data-pwa-banner-install");
    expect(pwaPromptAstro).toContain("data-pwa-banner-dismiss");
    expect(pwaPromptAstro).toContain("transition-behavior: allow-discrete");
    expect(pwaPromptAstro).toContain("@starting-style");
    expect(pwaPromptAstro).toContain("prefers-reduced-motion: reduce");
    expect(pwaPromptAstro).toContain("forced-colors: active");
    expect(pwaPromptAstro).not.toMatch(/<script\b/i);
    expect(rootIdx).toBeGreaterThanOrEqual(0);
    expect(ogIdx).toBeGreaterThan(rootIdx);
    expect(publicMediaIdx).toBeGreaterThan(rootIdx);

    const rootHeaders = vercelConfig.headers[rootIdx].headers;
    expect(rootHeaders).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    });

    const cspHeader = rootHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(cspHeader, "Missing Content-Security-Policy header rule").toBeDefined();

    const directives = cspHeader!.value.split(";").map((d) => d.trim());
    const scriptDirective = directives.find((d) => d.startsWith("script-src "));
    expect(scriptDirective).toBeDefined();
    expect(scriptDirective).toContain("'self'");
    expect(scriptDirective).toContain(expectedHashToken);
    expect(scriptDirective).toContain("'report-sample'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(scriptDirective).not.toContain("'strict-dynamic'");

    expect(directives).toContain("default-src 'self'");
    expect(directives).toContain("script-src-attr 'none'");
    expect(directives).toContain("style-src 'self' 'unsafe-inline'");
    expect(directives).toContain("style-src-elem 'self'");
    expect(directives).toContain("style-src-attr 'unsafe-inline'");
    expect(directives).toContain("img-src 'self' data:");
    expect(directives).toContain("font-src 'self'");
    expect(directives).toContain("connect-src 'self'");
    expect(directives).toContain("manifest-src 'self'");
    expect(directives).toContain("worker-src 'self'");
    expect(directives).toContain("object-src 'none'");
    expect(directives).toContain("base-uri 'none'");
    expect(directives).toContain("form-action 'self'");
    expect(directives).toContain("frame-ancestors 'none'");
    expect(directives).toContain("upgrade-insecure-requests");

    expect(vercelConfig.headers[ogIdx].headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "cross-origin",
    });
    expect(vercelConfig.headers[publicMediaIdx].headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "cross-origin",
    });
  });
});
