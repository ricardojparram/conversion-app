import { describe, expect, it } from "vitest";
import { PUBLIC_ROUTES, getSiteUrl, buildCanonicalUrl } from "@/lib/seo/config";
import { buildPageMeta } from "@/lib/seo/meta";
import { buildStructuredData } from "@/lib/seo/schema";
import { getFaqsForRoute } from "@/lib/seo/faqs";
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
});

describe("seo metadata", () => {
  it("builds unique non-empty title and description for every public route", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const route of PUBLIC_ROUTES) {
      const meta = buildPageMeta(route.key, sampleRates, "https://cambiorapido.app");
      expect(meta.title.trim().length).toBeGreaterThan(15);
      expect(meta.description.trim().length).toBeGreaterThan(40);
      expect(meta.canonical).toMatch(/^https:\/\/cambiorapido\.app\//);
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
});

describe("JSON-LD schema & FAQs", () => {
  it("emits WebSite, Organization and WebApplication on home without MobileApplication", () => {
    const meta = buildPageMeta("home", sampleRates);
    const faqs = getFaqsForRoute("home");
    const schemas = buildStructuredData({
      routeKey: "home",
      meta,
      faqs,
      updatedAtIso: "2026-11-10T02:15:00.000Z",
    });

    const types = schemas.map((s) => s["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
    expect(types).toContain("WebApplication");
    expect(types).toContain("FAQPage");
    expect(types).not.toContain("MobileApplication");
  });

  it("emits BreadcrumbList on subpages with absolute canonical item URLs", () => {
    const meta = buildPageMeta("dolar-bcv", sampleRates);
    const schemas = buildStructuredData({
      routeKey: "dolar-bcv",
      meta,
      breadcrumbs: [
        { name: "Inicio", path: "/" },
        { name: "Dólar BCV hoy", path: "/dolar-bcv" },
      ],
      faqs: getFaqsForRoute("dolar-bcv"),
    });

    const breadcrumb = schemas.find((s) => s["@type"] === "BreadcrumbList") as {
      itemListElement: { position: number; name: string; item: string }[];
    };
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toHaveLength(2);
    expect(breadcrumb.itemListElement[1].item).toBe(
      "https://cambiorapido.app/dolar-bcv",
    );
  });
});

describe("robots.txt & sitemap.xml", () => {
  it("allows crawling public pages, disallows /api/, and links sitemap", () => {
    const robots = buildRobotsTxt("https://cambiorapido.app");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap: https://cambiorapido.app/sitemap.xml");
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
