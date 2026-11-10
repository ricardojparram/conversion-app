import type { APIRoute } from "astro";
import { fetchLatestRatesSnapshot } from "@/lib/rates/supabase";
import { getSiteUrl } from "@/lib/seo/config";
import { buildSitemapXml } from "@/lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const snapshot = await fetchLatestRatesSnapshot();
  const xml = buildSitemapXml(getSiteUrl(), snapshot.updatedAtIso);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": snapshot.ok
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "public, max-age=0, must-revalidate",
    },
  });
};
