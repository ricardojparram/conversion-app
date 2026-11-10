import type { APIRoute } from "astro";
import { fetchLatestRatesSnapshot } from "@/lib/rates/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const snapshot = await fetchLatestRatesSnapshot();

  return new Response(
    JSON.stringify({
      ok: snapshot.ok,
      rates: snapshot.rates,
      updatedAtIso: snapshot.updatedAtIso,
      ...(snapshot.error ? { error: snapshot.error } : {}),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": snapshot.ok
          ? "public, s-maxage=30, stale-while-revalidate=60"
          : "public, max-age=0, must-revalidate",
      },
    },
  );
};
