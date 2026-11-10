import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaracasDayKey, getCaracasDayStartMs } from "./caracas-date";
import { getServerSupabaseClient } from "./supabase";
import type { HistoryPoint, HistorySeries } from "./types";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const DAY_MS = 86_400_000;

export interface HistoryPageParams {
  currencyId: number;
  startIso: string;
  endIso: string;
  from: number;
  to: number;
}

export type HistoryPageFetcher = (params: HistoryPageParams) => Promise<{
  data: HistoryPoint[] | null;
  error: { message: string } | null;
}>;

export interface RatesHistoryResult {
  ok: boolean;
  series: HistorySeries;
  error?: string;
}

/**
 * Aggregates raw intraday quotes by Caracas calendar date (YYYY-MM-DD),
 * averaging multiple readings on the same day and sorting oldest -> newest.
 */
export function aggregateDailyHistory(rows: HistoryPoint[]): HistoryPoint[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0 || !row.date) continue;
    const dayKey = getCaracasDayKey(row.date);
    const existing = buckets.get(dayKey);
    if (existing) {
      existing.sum += rate;
      existing.count += 1;
    } else {
      buckets.set(dayKey, { sum: rate, count: 1 });
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      rate: Number((bucket.sum / bucket.count).toFixed(4)),
    }));
}

export async function fetchPaginatedHistory(
  fetchPageFn: HistoryPageFetcher,
  currencyId: number,
  days: number,
  now: Date = new Date(),
): Promise<HistoryPoint[]> {
  const safeDays = Math.max(1, Math.min(60, Math.floor(days)));
  const endDayKey = getCaracasDayKey(now);
  const startDayMs = getCaracasDayStartMs(now) - (safeDays - 1) * DAY_MS;
  const startDayKey = getCaracasDayKey(startDayMs);

  const startIso = `${startDayKey}T00:00:00`;
  const endIso = `${endDayKey}T23:59:59`;

  const allRows: HistoryPoint[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPageFn({
      currencyId,
      startIso,
      endIso,
      from,
      to,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
  }

  return aggregateDailyHistory(allRows);
}

function createSupabasePageFetcher(client: SupabaseClient): HistoryPageFetcher {
  return async ({ currencyId, startIso, endIso, from, to }) => {
    const { data, error } = await client
      .from("exchange_rates")
      .select("rate, date")
      .eq("currency_id", currencyId)
      .gte("date", startIso)
      .lte("date", endIso)
      .order("date", { ascending: true })
      .range(from, to);

    return {
      data: data as HistoryPoint[] | null,
      error: error ? { message: error.message } : null,
    };
  };
}

function isPageFetcher(value: unknown): value is HistoryPageFetcher {
  return typeof value === "function";
}

export async function fetchRatesHistory(
  currencyIds: number[],
  days: number = 30,
  clientOrFetcher?: SupabaseClient | HistoryPageFetcher | null,
  now: Date = new Date(),
): Promise<RatesHistoryResult> {
  const uniqueIds = Array.from(
    new Set(currencyIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (uniqueIds.length === 0) {
    return { ok: true, series: {} };
  }

  let fetcher: HistoryPageFetcher | null = null;
  if (isPageFetcher(clientOrFetcher)) {
    fetcher = clientOrFetcher;
  } else {
    const client =
      clientOrFetcher === undefined
        ? getServerSupabaseClient(4500)
        : clientOrFetcher;
    if (client) {
      fetcher = createSupabasePageFetcher(client);
    }
  }

  if (!fetcher) {
    return {
      ok: false,
      series: {},
      error: "Supabase credentials are not configured",
    };
  }

  try {
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        const points = await fetchPaginatedHistory(fetcher!, id, days, now);
        return [id, points] as const;
      }),
    );

    const series: HistorySeries = {};
    for (const [id, points] of entries) {
      series[id] = points;
    }

    return { ok: true, series };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown history error";
    console.warn("[fetchRatesHistory] Degraded gracefully:", message);
    return {
      ok: false,
      series: {},
      error: message,
    };
  }
}
