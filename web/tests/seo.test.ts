import { describe, expect, it } from "vitest";
import {
  PUBLIC_ROUTES,
  getSiteUrl,
  buildCanonicalUrl,
  isIndexableDeployment,
} from "@/lib/seo/config";
import { buildPageMeta } from "@/lib/seo/meta";
import { buildStructuredData } from "@/lib/seo/schema";
import { getFaqsForRoute } from "@/lib/seo/faqs";
import { buildOgSvg } from "@/lib/seo/og-image";
import { buildRobotsTxt, buildSitemapXml } from "@/lib/seo/sitemap";
import type { ResolvedRate } from "@/lib/rates/types";

const sampleRates: ResolvedRate[] = [
  {
    currencyId: 1,
    currencyName: "BCV Dólar",
    code: "USD",
    symbol: "$",
    source: "BCV",
    effectiveRate: 897.54,
    effectiveDate: "2026-11-09T00:00:00",
    nextRate: 899.27,
    nextDate: "2026-11-10T00:00:00",
    hasNextRate: true,
  },
  {
    currencyId: 2,
    currencyName: "BCV Euro",
    code: "EUR",
    symbol: "€",
    source: "BCV",
    effectiveRate: 1001.19,
    effectiveDate: "2026-11-09T00:00:00",
    nextRate: 1006.61,
    nextDate: "2026-11-10T00:00:00",
    hasNextRate: true,
  },
  {
    currencyId: 3,
    currencyName: "USDT Venta",
    code: "USDT",
    symbol: "$",
    source: "Binance",
    effectiveRate: 1050.6,
    effectiveDate: "2026-11-09T22:15:00",
    nextRate: null,
    nextDate: null,
    hasNextRate: false,
  },
];

describe("seo config & canonical URLs", () => {
  it("falls back to https://cambiorapido.app and strips trailing slashes", () => {
    expect(getSiteUrl(undefined)).toBe("https://cambiorapido.app");
    expect(getSiteUrl("https://ejemplo.app///")).toBe("https://ejemplo.app");
  });

  it("normalizes canonical paths cleanly", () => {
    expect(buildCanonicalUrl("/", "https://cambiorapido.app/")).toBe(
      "https://cambiorapido.app/",
    );
    expect(buildCanonicalUrl("/dolar-bcv/", "https://cambiorapido.app")).toBe(
      "https://cambiorapido.app/dolar-bcv",
    );
    expect(buildCanonicalUrl("euro-bcv", "https://cambiorapido.app")).toBe(
      "https://cambiorapido.app/euro-bcv",
    );
  });

  it("blocks indexing on vercel.app / preview deployments unless explicitly enabled", () => {
    expect(
      isIndexableDeployment({
        siteUrl: "https://cambio-rapido-astro-preview.vercel.app",
      }),
    ).toBe(false);
    expect(
      isIndexableDeployment({
        siteUrl: "https://cambiorapido.app",
        vercelEnv: "preview",
      }),
    ).toBe(false);
    expect(
      isIndexableDeployment({
        siteUrl: "https://cambiorapido.app",
        vercelEnv: "production",
      }),
    ).toBe(true);
    expect(
      isIndexableDeployment({
        siteUrl: "https://cambiorapido.app",
        indexableEnv: "true",
        vercelEnv: "preview",
      }),
    ).toBe(true);
  });
});

describe("seo metadata", () => {
  it("builds unique non-empty title, description, and OG URL within SERP length budgets", () => {
    const highRates: ResolvedRate[] = sampleRates.map((r, i) => ({
      ...r,
      effectiveRate: 9876.54 + i * 321.11,
    }));
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const route of PUBLIC_ROUTES) {
      const meta = buildPageMeta(route.key, highRates, "https://cambiorapido.app");
      expect(meta.title.trim().length).toBeGreaterThan(15);
      expect(meta.title.length, `Title too long on ${route.key}`).toBeLessThanOrEqual(60);
      expect(meta.description.trim().length).toBeGreaterThan(40);
      expect(
        meta.description.length,
        `Description too long on ${route.key}`,
      ).toBeLessThanOrEqual(155);
      expect(meta.canonical).toMatch(/^https:\/\/cambiorapido\.app\//);
      expect(meta.ogImage).toBe(`https://cambiorapido.app/og/${route.key}.png`);
      expect(meta.ogImageAlt.trim().length).toBeGreaterThan(10);
      titles.add(meta.title);
      descriptions.add(meta.description);
    }

    expect(titles.size).toBe(PUBLIC_ROUTES.length);
    expect(descriptions.size).toBe(PUBLIC_ROUTES.length);
  });

  it("embeds formatted current rates into currency page metadata", () => {
    const dolarMeta = buildPageMeta("dolar-bcv", sampleRates);
    const euroMeta = buildPageMeta("euro-bcv", sampleRates);
    const usdtMeta = buildPageMeta("usdt-binance", sampleRates);

    expect(dolarMeta.title).toContain("897,54");
    expect(euroMeta.title).toContain("1.001,19");
    expect(usdtMeta.title).toContain("1.050,60");
  });

  it("marks 404 route as noindex, nofollow with canonical /404", () => {
    const notFoundMeta = buildPageMeta("not-found", sampleRates, "https://cambiorapido.app");
    expect(notFoundMeta.robots).toBe("noindex, nofollow");
    expect(notFoundMeta.canonical).toBe("https://cambiorapido.app/404");
    expect(notFoundMeta.ogImage).toBe("https://cambiorapido.app/og-image.png");
  });
});

describe("JSON-LD schema, FAQs & dynamic OG SVG", () => {
  it("emits unified @graph with Organization, WebSite, WebApplication, ExchangeRateSpecification and FAQPage on home", () => {
    const meta = buildPageMeta("home", sampleRates, "https://cambiorapido.app");
    const faqs = getFaqsForRoute("home");
    const schemas = buildStructuredData({
      routeKey: "home",
      siteUrl: "https://cambiorapido.app",
      meta,
      faqs,
      updatedAtIso: "2026-11-10T02:15:00.000Z",
      rates: sampleRates,
    });

    expect(schemas).toHaveLength(1);
    expect(schemas[0]["@context"]).toBe("https://schema.org");
    const graph = schemas[0]["@graph"] as Array<Record<string, unknown>>;
    expect(Array.isArray(graph)).toBe(true);

    const types = graph.map((s) => s["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("WebApplication");
    expect(types).toContain("WebPage");
    expect(types).toContain("ImageObject");
    expect(types).toContain("FAQPage");
    expect(types).toContain("ExchangeRateSpecification");
    expect(types).not.toContain("MobileApplication");

    const rateSpecs = graph.filter((s) => s["@type"] === "ExchangeRateSpecification");
    expect(rateSpecs.length).toBeGreaterThanOrEqual(3);

    const org = graph.find((s) => s["@type"] === "Organization") as Record<string, unknown>;
    expect(org.contactPoint).toBeUndefined();
  });

  it("emits BreadcrumbList on subpages with absolute canonical item URLs", () => {
    const meta = buildPageMeta("dolar-bcv", sampleRates, "https://cambiorapido.app");
    const schemas = buildStructuredData({
      routeKey: "dolar-bcv",
      siteUrl: "https://cambiorapido.app",
      meta,
      breadcrumbs: [
        { name: "Inicio", path: "/" },
        { name: "Dólar BCV hoy", path: "/dolar-bcv" },
      ],
      faqs: getFaqsForRoute("dolar-bcv"),
      rates: sampleRates,
    });

    const graph = schemas[0]["@graph"] as Array<Record<string, unknown>>;
    const breadcrumb = graph.find((s) => s["@type"] === "BreadcrumbList") as {
      itemListElement: { position: number; name: string; item: string }[];
    };
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toHaveLength(2);
    expect(breadcrumb.itemListElement[1].item).toBe(
      "https://cambiorapido.app/dolar-bcv",
    );
  });

  it("emits Dataset schema on tendencias with temporalCoverage and DataDownload", () => {
    const meta = buildPageMeta("tendencias", sampleRates, "https://cambiorapido.app");
    const schemas = buildStructuredData({
      routeKey: "tendencias",
      siteUrl: "https://cambiorapido.app",
      meta,
      faqs: getFaqsForRoute("tendencias"),
      updatedAtIso: "2026-11-10T02:15:00.000Z",
      rates: sampleRates,
      historyDateRange: { start: "2026-10-12", end: "2026-11-10" },
    });

    const graph = schemas[0]["@graph"] as Array<Record<string, unknown>>;
    const dataset = graph.find((s) => s["@type"] === "Dataset") as
      | Record<string, unknown>
      | undefined;
    expect(dataset).toBeDefined();
    expect(dataset?.temporalCoverage).toBe("2026-10-12/2026-11-10");
    expect(
      (dataset?.distribution as Record<string, unknown> | undefined)?.contentUrl,
    ).toBe("https://cambiorapido.app/api/history.json?days=30&currencyIds=1,2,3,4");
  });

  it("renders dynamic SVG templates containing live Venezuelan FX rates", () => {
    const homeSvg = buildOgSvg("home", sampleRates, "https://cambiorapido.app");
    expect(homeSvg).toContain("897,54 Bs");
    expect(homeSvg).toContain("1.001,19 Bs");
    expect(homeSvg).toContain("1.050,60 Bs");
    expect(homeSvg).toContain("cambiorapido.app");

    const brechaSvg = buildOgSvg("brecha-cambiaria", sampleRates, "https://cambiorapido.app");
    expect(brechaSvg).toContain("+17,05%");

    const previewSvg = buildOgSvg(
      "dolar-bcv",
      sampleRates,
      "https://cambio-rapido-astro-preview.vercel.app",
    );
    const pillMatch = previewSvg.match(/transform="translate\((\d+), 48\)"\s*>\s*<rect width="(\d+)"/);
    expect(pillMatch).not.toBeNull();
    const pillRight = Number(pillMatch![1]) + Number(pillMatch![2]);
    expect(pillRight).toBe(1136);
  });
});

describe("robots.txt & sitemap.xml", () => {
  it("allows crawling public pages, disallows /api/, and links sitemap when indexable", () => {
    const robots = buildRobotsTxt("https://cambiorapido.app", true);
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap: https://cambiorapido.app/sitemap.xml");
  });

  it("blocks indexing on vercel preview origins when indexable is omitted or false", () => {
    const robots = buildRobotsTxt("https://cambio-rapido-astro-preview.vercel.app");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Disallow: /");
    expect(robots).not.toContain("Allow: /");
    expect(robots).not.toContain("Sitemap:");
  });

  it("generates valid sitemap XML containing all 8 public routes and no API endpoints", () => {
    const xml = buildSitemapXml("https://cambiorapido.app", "2026-11-10T02:15:00.000Z");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://cambiorapido.app/</loc>");
    expect(xml).toContain("<loc>https://cambiorapido.app/dolar-bcv</loc>");
    expect(xml).toContain("<loc>https://cambiorapido.app/preguntas-frecuentes</loc>");
    expect(xml).toContain("<lastmod>2026-11-10T02:15:00.000Z</lastmod>");
    expect(xml).not.toContain("/api/");
  });
});

