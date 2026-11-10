import type { APIRoute } from "astro";
import { getSiteUrl } from "@/lib/seo/config";
import { buildRobotsTxt } from "@/lib/seo/sitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const body = buildRobotsTxt(getSiteUrl());
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
