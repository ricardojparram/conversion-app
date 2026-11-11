import type { APIRoute } from "astro";
import { getSiteUrl, isIndexableDeployment } from "@/lib/seo/config";
import { buildRobotsTxt } from "@/lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl();
  const indexable = isIndexableDeployment({ siteUrl });
  const body = buildRobotsTxt(siteUrl, indexable);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
