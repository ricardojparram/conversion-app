import type { APIRoute } from "astro";
import { fetchLatestRatesSnapshot } from "@/lib/rates/supabase";
import { getSiteUrl, isIndexableDeployment } from "@/lib/seo/config";
import { buildSitemapXml } from "@/lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl();
  const indexable = isIndexableDeployment({ siteUrl });
  const snapshot = await fetchLatestRatesSnapshot();
  const xml = buildSitemapXml(siteUrl, snapshot.updatedAtIso);

  const headers: Record<string, string> = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": snapshot.ok
      ? "public, s-maxage=300, stale-while-revalidate=600"
      : "public, max-age=0, must-revalidate",
  };
  if (!indexable) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }

  return new Response(xml, {
    status: 200,
    headers,
  });
};
