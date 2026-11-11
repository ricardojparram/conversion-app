import type { APIRoute } from "astro";
import { fetchLatestRatesSnapshot } from "@/lib/rates/supabase";
import type { ResolvedRate } from "@/lib/rates/types";
import { getSiteUrl } from "@/lib/seo/config";
import { isValidOgRoute, renderOgPng } from "@/lib/seo/og-image";

export const prerender = false;

const STATIC_OG_ROUTES = new Set(["preguntas-frecuentes", "privacidad"]);

export const GET: APIRoute = async ({ params }) => {
  const route = params.route;
  if (!isValidOgRoute(route)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  let rates: ResolvedRate[] = [];
  let cacheControl = "public, s-maxage=86400, stale-while-revalidate=604800";

  if (!STATIC_OG_ROUTES.has(route)) {
    const snapshot = await fetchLatestRatesSnapshot();
    rates = snapshot.rates;
    cacheControl = snapshot.ok
      ? "public, s-maxage=300, stale-while-revalidate=600"
      : "public, max-age=0, must-revalidate";
  }

  const png = await renderOgPng(route, rates, getSiteUrl());
  const pngCopy = new Uint8Array(png.byteLength);
  pngCopy.set(png);

  return new Response(new Blob([pngCopy], { type: "image/png" }), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
};
