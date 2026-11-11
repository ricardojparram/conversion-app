import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaracasDayKey, getCaracasDayStartMs } from "./caracas-date";
import { getServerSupabaseClient } from "./supabase";
import type { HistoryPoint, HistorySeries } from "./types";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const DAY_MS = 86_400_000;
const PER_DAY_BATCH_SIZE = 15;

export interface HistoryPageParams {
  currencyId: number;
  startIso: string;
  endIso: string;
  from: number;
  to: number;
  ascending?: boolean;
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

async function fetchPerDayHistory(
  fetchPageFn: HistoryPageFetcher,
  currencyId: number,
  startDayMs: number,
  safeDays: number,
  maxPerDayRows: number,
): Promise<HistoryPoint[]> {
  const dayKeys: string[] = [];
  for (let i = 0; i < safeDays; i += 1) {
    dayKeys.push(getCaracasDayKey(startDayMs + i * DAY_MS));
  }

  const collected: HistoryPoint[] = [];
  for (let i = 0; i < dayKeys.length; i += PER_DAY_BATCH_SIZE) {
    const batch = dayKeys.slice(i, i + PER_DAY_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (dayKey) => {
        const { data, error } = await fetchPageFn({
          currencyId,
          startIso: `${dayKey}T00:00:00`,
          endIso: `${dayKey}T23:59:59`,
          from: 0,
          to: Math.max(0, maxPerDayRows - 1),
          ascending: false,
        });
        if (error) {
          throw new Error(error.message);
        }
        return data ?? [];
      }),
    );
    for (const rows of batchResults) {
      if (rows.length > 0) collected.push(...rows);
    }
  }

  return aggregateDailyHistory(collected);
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

  const first = await fetchPageFn({
    currencyId,
    startIso,
    endIso,
    from: 0,
    to: PAGE_SIZE - 1,
    ascending: true,
  });

  if (first.error) {
    throw new Error(first.error.message);
  }
  if (!first.data || first.data.length === 0) {
    return [];
  }

  const firstLen = first.data.length;
  const allRows: HistoryPoint[] = [...first.data];

  // If the response was capped below PAGE_SIZE (e.g., Supabase PostgREST db-max-rows=20),
  // probe once from `firstLen` to distinguish a short low-frequency BCV series from
  // a dense 5-minute intraday series (Binance USDT) that would otherwise truncate or time out.
  if (firstLen < PAGE_SIZE) {
    const probe = await fetchPageFn({
      currencyId,
      startIso,
      endIso,
      from: firstLen,
      to: firstLen + PAGE_SIZE - 1,
      ascending: true,
    });
    if (probe.error) {
      throw new Error(probe.error.message);
    }
    if (!probe.data || probe.data.length === 0) {
      return aggregateDailyHistory(allRows);
    }
    if (probe.data.length < firstLen) {
      allRows.push(...probe.data);
      return aggregateDailyHistory(allRows);
    }

    // Server cap confirmed while querying a dense intraday dataset:
    // fall back to parallel per-Caracas-day descending queries (matching Expo repo behavior).
    return fetchPerDayHistory(fetchPageFn, currencyId, startDayMs, safeDays, firstLen);
  }

  for (let page = 1; page < MAX_PAGES; page += 1) {
    const from = allRows.length;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPageFn({
      currencyId,
      startIso,
      endIso,
      from,
      to,
      ascending: true,
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
  return async ({ currencyId, startIso, endIso, from, to, ascending = true }) => {
    const { data, error } = await client
      .from("exchange_rates")
      .select("rate, date")
      .eq("currency_id", currencyId)
      .gte("date", startIso)
      .lte("date", endIso)
      .order("date", { ascending })
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

const LOOKBACK_DAYS = 14;

/**
 * Builds an inclusive contiguous sequence of YYYY-MM-DD Caracas calendar days.
 */
export function buildContinuousDailyTimeline(
  startDayKey: string,
  endDayKey: string,
): string[] {
  const startMs = getCaracasDayStartMs(startDayKey);
  const endMs = getCaracasDayStartMs(endDayKey);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    return [];
  }
  const days: string[] = [];
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) {
    days.push(getCaracasDayKey(ms));
  }
  return days;
}

/**
 * Fills missing weekend/holiday days in a daily history series by carrying forward
 * the previous active rate across `[startDayKey .. endDayKey]`.
 */
export function fillMissingDailyRates(
  points: HistoryPoint[],
  startDayKey: string,
  endDayKey: string,
  initialCarryRate: number | null = null,
): HistoryPoint[] {
  const pointByDay = new Map<string, number>();
  let seedRate =
    initialCarryRate !== null && Number.isFinite(initialCarryRate) && initialCarryRate > 0
      ? initialCarryRate
      : null;

  const sortedPoints = [...points].sort((a, b) => a.date.localeCompare(b.date));
  for (const pt of sortedPoints) {
    const rate = Number(pt.rate);
    if (!Number.isFinite(rate) || rate <= 0 || !pt.date) continue;
    const dayKey = getCaracasDayKey(pt.date);
    pointByDay.set(dayKey, rate);
    if (dayKey < startDayKey) {
      seedRate = rate;
    }
  }

  const timeline = buildContinuousDailyTimeline(startDayKey, endDayKey);
  const filled: HistoryPoint[] = [];
  let lastKnown = seedRate;

  for (const dayKey of timeline) {
    const exactRate = pointByDay.get(dayKey);
    if (exactRate !== undefined) {
      lastKnown = exactRate;
    }
    if (lastKnown !== null && Number.isFinite(lastKnown) && lastKnown > 0) {
      filled.push({ date: dayKey, rate: lastKnown });
    }
  }

  return filled;
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
        ? getServerSupabaseClient(8000)
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

  const safeDays = Math.max(1, Math.min(60, Math.floor(days)));
  const endDayKey = getCaracasDayKey(now);
  const startDayMs = getCaracasDayStartMs(now) - (safeDays - 1) * DAY_MS;
  const startDayKey = getCaracasDayKey(startDayMs);

  const settled = await Promise.allSettled(
    uniqueIds.map(async (id) => {
      const rawPoints = await fetchPaginatedHistory(fetcher!, id, safeDays, now);
      let initialCarryRate: number | null = null;

      if (rawPoints.length === 0 || rawPoints[0].date > startDayKey) {
        try {
          const lookbackStartKey = getCaracasDayKey(startDayMs - LOOKBACK_DAYS * DAY_MS);
          const lookbackEndKey = getCaracasDayKey(startDayMs - DAY_MS);
          const { data, error } = await fetcher!({
            currencyId: id,
            startIso: `${lookbackStartKey}T00:00:00`,
            endIso: `${lookbackEndKey}T23:59:59`,
            from: 0,
            to: 19,
            ascending: false,
          });
          if (!error && data && data.length > 0) {
            const lookbackDaily = aggregateDailyHistory(data);
            if (lookbackDaily.length > 0) {
              initialCarryRate = lookbackDaily[lookbackDaily.length - 1].rate;
            }
          }
        } catch {
          // Optional lookback failure should not discard already-fetched window points
        }
      }

      const filledPoints = fillMissingDailyRates(
        rawPoints,
        startDayKey,
        endDayKey,
        initialCarryRate,
      );
      return [id, filledPoints] as const;
    }),
  );

  const series: HistorySeries = {};
  const errors: string[] = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const [id, points] = outcome.value;
      series[id] = points;
    } else {
      const message =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : "Unknown history error";
      errors.push(message);
    }
  }

  if (errors.length > 0) {
    console.warn("[fetchRatesHistory] Degraded gracefully:", errors[0]);
    return {
      ok: false,
      series,
      error: errors[0],
    };
  }

  return { ok: true, series };
}
