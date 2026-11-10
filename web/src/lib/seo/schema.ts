import { buildCanonicalUrl, getSiteUrl, SITE_NAME, type RouteKey } from "./config";
import type { FaqItem } from "./faqs";
import type { PageMeta } from "./meta";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface StructuredDataParams {
  routeKey: RouteKey;
  siteUrl?: string;
  meta: PageMeta;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FaqItem[];
  updatedAtIso?: string | null;
}

export function buildStructuredData({
  routeKey,
  siteUrl,
  meta,
  breadcrumbs = [],
  faqs = [],
  updatedAtIso,
}: StructuredDataParams): Record<string, unknown>[] {
  const base = getSiteUrl(siteUrl);
  const schemas: Record<string, unknown>[] = [];

  if (routeKey === "home") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${base}/`,
      inLanguage: "es-VE",
      description: meta.description,
    });

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: `${base}/`,
      logo: `${base}/icon-512.png`,
    });

    const webAppSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: `${base}/`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      inLanguage: "es-VE",
      isAccessibleForFree: true,
      description: meta.description,
      image: meta.ogImage,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    };
    if (updatedAtIso) {
      webAppSchema.dateModified = updatedAtIso;
    }
    schemas.push(webAppSchema);
  }

  if (breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: buildCanonicalUrl(crumb.path, base),
      })),
    });
  }

  if (faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
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

  return schemas;
}
