import { buildCanonicalUrl, getSiteUrl, PUBLIC_ROUTES } from "./config";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildRobotsTxt(siteUrl?: string): string {
  const base = getSiteUrl(siteUrl);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

export function buildSitemapXml(
  siteUrl?: string,
  lastModIso?: string | null,
): string {
  const base = getSiteUrl(siteUrl);
  const normalizedLastMod =
    lastModIso && !Number.isNaN(Date.parse(lastModIso))
      ? new Date(lastModIso).toISOString()
      : null;

  const urlNodes = PUBLIC_ROUTES.map((route) => {
    const loc = escapeXml(buildCanonicalUrl(route.path, base));
    const lines = [
      "  <url>",
      `    <loc>${loc}</loc>`,
      ...(normalizedLastMod && route.key !== "privacidad"
        ? [`    <lastmod>${escapeXml(normalizedLastMod)}</lastmod>`]
        : []),
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      "  </url>",
    ];
    return lines.join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlNodes,
    "</urlset>",
    "",
  ].join("\n");
}
