import type { APIRoute } from "astro";
import { fetchRatesHistory } from "@/lib/rates/history";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const daysParam = Number(url.searchParams.get("days") ?? "7");
  const safeDays =
    Number.isFinite(daysParam) && daysParam > 0
      ? Math.min(60, Math.max(1, Math.floor(daysParam)))
      : 7;

  const idsParam = url.searchParams.get("currencyIds") ?? "1";
  const parsedIds = idsParam
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 6);

  const currencyIds = parsedIds.length > 0 ? parsedIds : [1];
  const history = await fetchRatesHistory(currencyIds, safeDays);

  return new Response(
    JSON.stringify({
      ok: history.ok,
      days: safeDays,
      currencyIds,
      series: history.series,
      ...(history.error ? { error: history.error } : {}),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": history.ok
          ? "public, s-maxage=300, stale-while-revalidate=600"
          : "public, max-age=0, must-revalidate",
      },
    },
  );
};
