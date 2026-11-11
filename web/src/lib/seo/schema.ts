import {
  hasExplicitCaracasTime,
  shouldIncludeTimeForRate,
  toCaracasIsoString,
} from "@/lib/rates/caracas-date";
import type { ResolvedRate } from "@/lib/rates/types";
import {
  buildCanonicalUrl,
  getContactEmail,
  getSiteUrl,
  SITE_NAME,
  type RouteKey,
} from "./config";
import type { FaqItem } from "./faqs";
import type { PageMeta } from "./meta";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface HistoryDateRange {
  start: string;
  end: string;
}

export interface StructuredDataParams {
  routeKey: RouteKey;
  siteUrl?: string;
  contactEmail?: string | null;
  meta: PageMeta;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FaqItem[];
  updatedAtIso?: string | null;
  rates?: ResolvedRate[];
  historyDateRange?: HistoryDateRange | null;
}

const ROUTE_RATE_FILTER: Record<RouteKey, number[]> = {
  home: [1, 2, 3, 4],
  "dolar-bcv": [1],
  "euro-bcv": [2],
  "usdt-binance": [3, 4],
  "brecha-cambiaria": [1, 3],
  tendencias: [1, 2, 3],
  "preguntas-frecuentes": [],
  privacidad: [],
  "not-found": [],
};

const CALCULATOR_ROUTES = new Set<RouteKey>([
  "home",
  "dolar-bcv",
  "euro-bcv",
  "usdt-binance",
  "brecha-cambiaria",
]);

function buildExchangeRateSpecNode(
  rate: ResolvedRate,
  base: string,
): Record<string, unknown> | null {
  if (!Number.isFinite(rate.effectiveRate) || rate.effectiveRate <= 0) return null;

  let isoCurrency = "USD";
  let idSuffix = `rate-${rate.currencyId}`;
  let specName = rate.currencyName;
  let description = `Tasa de referencia informativa para ${rate.currencyName} en bolívares (VES).`;

  switch (rate.currencyId) {
    case 1:
      isoCurrency = "USD";
      idSuffix = "rate-usd-bcv";
      specName = "Tasa oficial Dólar BCV (USD/VES)";
      description =
        "Tipo de cambio oficial del dólar estadounidense publicado por el Banco Central de Venezuela (BCV).";
      break;
    case 2:
      isoCurrency = "EUR";
      idSuffix = "rate-eur-bcv";
      specName = "Tasa oficial Euro BCV (EUR/VES)";
      description =
        "Tipo de cambio oficial del euro publicado por el Banco Central de Venezuela (BCV).";
      break;
    case 3:
      isoCurrency = "USD";
      idSuffix = "rate-usdt-venta";
      specName = "Referencia USDT Binance P2P Venta (USDT/VES)";
      description =
        "Promedio informativo de venta de USDT por bolívares (VES) en Binance P2P Venezuela.";
      break;
    case 4:
      isoCurrency = "USD";
      idSuffix = "rate-usdt-compra";
      specName = "Referencia USDT Binance P2P Compra (USDT/VES)";
      description =
        "Promedio informativo de compra de USDT por bolívares (VES) en Binance P2P Venezuela.";
      break;
    default:
      isoCurrency = rate.code === "EUR" ? "EUR" : "USD";
      break;
  }

  const includeTime = shouldIncludeTimeForRate(rate) && hasExplicitCaracasTime(rate.effectiveDate);
  const validFrom = toCaracasIsoString(rate.effectiveDate, includeTime);

  return {
    "@type": "ExchangeRateSpecification",
    "@id": `${base}/#${idSuffix}`,
    name: specName,
    description,
    currency: isoCurrency,
    currentExchangeRate: {
      "@type": "UnitPriceSpecification",
      price: Number(rate.effectiveRate.toFixed(4)),
      priceCurrency: "VES",
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: 1,
        unitText: rate.code === "USDT" ? "USDT" : isoCurrency,
      },
      ...(validFrom ? { validFrom } : {}),
    },
  };
}

export function buildStructuredData({
  routeKey,
  siteUrl,
  contactEmail = getContactEmail(),
  meta,
  breadcrumbs = [],
  faqs = [],
  updatedAtIso,
  rates = [],
  historyDateRange = null,
}: StructuredDataParams): Record<string, unknown>[] {
  const base = getSiteUrl(siteUrl);
  const canonical = meta.canonical || buildCanonicalUrl("/", base);
  const orgId = `${base}/#organization`;
  const logoId = `${base}/#logo`;
  const websiteId = `${base}/#website`;
  const webappId = `${base}/#webapp`;
  const webpageId = `${canonical}#webpage`;
  const primaryImageId = `${canonical}#primaryimage`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const faqId = `${canonical}#faq`;
  const datasetId = `${canonical}#dataset`;

  const graph: Record<string, unknown>[] = [];

  graph.push({
    "@type": "Organization",
    "@id": orgId,
    name: SITE_NAME,
    alternateName: ["Cambio Rápido", "Cambio Rápido Venezuela"],
    url: `${base}/`,
    logo: {
      "@type": "ImageObject",
      "@id": logoId,
      url: `${base}/icon-512.png`,
      contentUrl: `${base}/icon-512.png`,
      width: 512,
      height: 512,
      caption: SITE_NAME,
    },
    image: { "@id": logoId },
    ...(contactEmail
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: contactEmail,
            availableLanguage: "es",
            areaServed: "VE",
          },
        }
      : {}),
    publishingPrinciples: `${base}/privacidad`,
  });

  graph.push({
    "@type": "WebSite",
    "@id": websiteId,
    url: `${base}/`,
    name: SITE_NAME,
    alternateName: "Calculadora Dólar BCV, Euro y USDT Venezuela",
    inLanguage: "es-VE",
    description:
      "Calculadora cambiaria y comparador informativo de Dólar BCV, Euro BCV, USDT Binance P2P y brecha cambiaria en Venezuela.",
    publisher: { "@id": orgId },
  });

  if (CALCULATOR_ROUTES.has(routeKey)) {
    const webAppNode: Record<string, unknown> = {
      "@type": "WebApplication",
      "@id": webappId,
      name: `${SITE_NAME} — Calculadora cambiaria Venezuela`,
      url: `${base}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      inLanguage: "es-VE",
      isAccessibleForFree: true,
      description: meta.description,
      image: meta.ogImage,
      provider: { "@id": orgId },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    };
    if (updatedAtIso) {
      webAppNode.dateModified = updatedAtIso;
    }
    graph.push(webAppNode);
  }

  const allowedRateIds = ROUTE_RATE_FILTER[routeKey] ?? [];
  const rateNodes =
    allowedRateIds.length > 0
      ? allowedRateIds
          .map((id) => rates.find((r) => r.currencyId === id))
          .filter((r): r is ResolvedRate => Boolean(r))
          .map((r) => buildExchangeRateSpecNode(r, base))
          .filter((node): node is Record<string, unknown> => Boolean(node))
      : [];

  if (routeKey !== "not-found") {
    graph.push({
      "@type": "ImageObject",
      "@id": primaryImageId,
      url: meta.ogImage,
      contentUrl: meta.ogImage,
      width: 1200,
      height: 630,
      caption: meta.ogImageAlt,
    });
  }

  const webPageNode: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": webpageId,
    url: canonical,
    name: meta.title,
    description: meta.description,
    inLanguage: "es-VE",
    isPartOf: { "@id": websiteId },
    publisher: { "@id": orgId },
  };

  if (routeKey !== "not-found") {
    webPageNode.primaryImageOfPage = { "@id": primaryImageId };
  }
  if (updatedAtIso && routeKey !== "privacidad" && routeKey !== "not-found") {
    webPageNode.dateModified = updatedAtIso;
  }
  if (breadcrumbs.length > 0) {
    webPageNode.breadcrumb = { "@id": breadcrumbId };
  }
  if (routeKey === "tendencias") {
    webPageNode.mainEntity = { "@id": datasetId };
  } else if (routeKey === "preguntas-frecuentes" && faqs.length > 0) {
    webPageNode.mainEntity = { "@id": faqId };
  } else if (CALCULATOR_ROUTES.has(routeKey)) {
    webPageNode.mainEntity = { "@id": webappId };
  }
  if (rateNodes.length > 0) {
    webPageNode.about = rateNodes.map((n) => ({ "@id": n["@id"] }));
  }

  graph.push(webPageNode);

  for (const rateNode of rateNodes) {
    graph.push(rateNode);
  }

  if (routeKey === "tendencias") {
    const datasetNode: Record<string, unknown> = {
      "@type": "Dataset",
      "@id": datasetId,
      name: "Historial diario del Dólar BCV, Euro BCV y USDT Binance P2P en Venezuela",
      description:
        "Serie diaria de promedios de cierre en horario de Caracas (America/Caracas, VET) para Dólar BCV, Euro BCV, USDT Binance P2P y brecha cambiaria.",
      url: canonical,
      inLanguage: "es-VE",
      isAccessibleForFree: true,
      creator: { "@id": orgId },
      license: `${base}/privacidad`,
      variableMeasured: [
        "Dólar BCV (USD/VES)",
        "Euro BCV (EUR/VES)",
        "USDT Binance P2P Venta (USDT/VES)",
        "Brecha cambiaria (%)",
      ],
      distribution: {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${base}/api/history.json?days=30&currencyIds=1,2,3,4`,
      },
    };
    if (historyDateRange?.start && historyDateRange?.end) {
      datasetNode.temporalCoverage = `${historyDateRange.start}/${historyDateRange.end}`;
    }
    if (updatedAtIso) {
      datasetNode.dateModified = updatedAtIso;
    }
    graph.push(datasetNode);
  }

  if (breadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: buildCanonicalUrl(crumb.path, base),
      })),
    });
  }

  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": faqId,
      isPartOf: { "@id": webpageId },
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  return [
    {
      "@context": "https://schema.org",
      "@graph": graph,
    },
  ];
}
