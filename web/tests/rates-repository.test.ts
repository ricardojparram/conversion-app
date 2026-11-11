import { describe, expect, it, vi } from "vitest";
import { fetchLatestRatesSnapshot, type RpcInvoker } from "@/lib/rates/supabase";
import {
  aggregateDailyHistory,
  fetchPaginatedHistory,
  fetchRatesHistory,
  fillMissingDailyRates,
  type HistoryPageFetcher,
} from "@/lib/rates/history";
import type { RawRateRow } from "@/lib/rates/types";

describe("fetchLatestRatesSnapshot", () => {
  it("resolves effective BCV rates and computes updatedAtIso cleanly", async () => {
    const mockRows: RawRateRow[] = [
      {
        currency_id: 3,
        currency_name: "USDT Venta",
        code: "USDT",
        symbol: "$",
        source: "Binance",
        rate: 1050.6,
        date: "2026-11-09T22:15:04.246255",
        rate_old: null,
        date_old: null,
      },
      {
        currency_id: 1,
        currency_name: "BCV Dólar",
        code: "USD",
        symbol: "$",
        source: "BCV",
        rate: 899.27,
        date: "2026-11-10T00:00:00",
        rate_old: 897.54,
        date_old: "2026-11-09T00:00:00",
      },
    ];

    const rpcClient: RpcInvoker = {
      rpc: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    };

    const now = new Date("2026-11-10T02:20:00Z"); // 2026-11-09 22:20 Caracas
    const result = await fetchLatestRatesSnapshot(rpcClient, now);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.rates.map((r) => r.currencyId)).toEqual([1, 3]);
    expect(result.rates[0].effectiveRate).toBe(897.54);
    expect(result.rates[0].hasNextRate).toBe(true);
    expect(result.rates[0].nextRate).toBe(899.27);
    expect(result.rates[1].effectiveRate).toBe(1050.6);
    expect(result.updatedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("never throws on RPC error or network rejection", async () => {
    const failingRpc: RpcInvoker = {
      rpc: vi.fn().mockRejectedValue(new Error("The operation timed out")),
    };

    const result = await fetchLatestRatesSnapshot(failingRpc);
    expect(result.ok).toBe(false);
    expect(result.rates).toEqual([]);
    expect(result.updatedAtIso).toBeNull();
    expect(result.error).toContain("timed out");
  });
});

describe("aggregateDailyHistory", () => {
  it("averages multiple intraday Caracas readings per day in ascending chronological order", () => {
    const rows = [
      { rate: 1052.0, date: "2026-11-09T23:50:00" },
      { rate: 1048.0, date: "2026-11-09T01:00:00" },
      { rate: 1040.0, date: "2026-11-08T14:00:00" },
      // UTC timestamp 2026-11-09T02:00:00Z is 2026-11-08 22:00 in Caracas
      { rate: 1044.0, date: "2026-11-09T02:00:00Z" },
    ];

    const daily = aggregateDailyHistory(rows);
    expect(daily).toHaveLength(2);
    expect(daily[0].date).toBe("2026-11-08");
    expect(daily[0].rate).toBeCloseTo(1042.0, 4);
    expect(daily[1].date).toBe("2026-11-09");
    expect(daily[1].rate).toBeCloseTo(1050.0, 4);
  });
});

describe("fetchPaginatedHistory", () => {
  it("fetches subsequent ranges when a page hits the 1000-row PostgREST cap", async () => {
    const page1 = Array.from({ length: 1000 }, (_, idx) => ({
      rate: 1000 + idx * 0.01,
      date: "2026-11-08T12:00:00",
    }));
    const page2 = [
      { rate: 1050.5, date: "2026-11-09T10:00:00" },
      { rate: 1051.5, date: "2026-11-09T18:00:00" },
    ];

    const fetcher: HistoryPageFetcher = vi.fn(async ({ from, to }) => {
      if (from === 0 && to === 999) return { data: page1, error: null };
      if (from === 1000 && to === 1999) return { data: page2, error: null };
      return { data: [], error: null };
    });

    const result = await fetchPaginatedHistory(
      fetcher,
      3,
      7,
      new Date("2026-11-09T22:00:00-04:00"),
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ from: 1000, to: 1999, currencyId: 3 }),
    );
    expect(result.map((p) => p.date)).toEqual(["2026-11-08", "2026-11-09"]);
    expect(result[1].rate).toBeCloseTo(1051.0, 4);
  });

  it("handles server max_rows=20 cap for dense intraday series via per-Caracas-day fallback", async () => {
    const makeDayRows = (day: string, baseRate: number, count: number) =>
      Array.from({ length: count }, (_, idx) => ({
        rate: baseRate + idx * 0.01,
        date: `${day}T${String(Math.floor(idx / 12)).padStart(2, "0")}:${String((idx % 12) * 5).padStart(2, "0")}:00`,
      }));

    // Simulate a DB where each day has 288 rows (USDT) and PostgREST caps any response to 20 rows
    const fetcher: HistoryPageFetcher = vi.fn(async ({ startIso, endIso, from, ascending }) => {
      if (startIso === "2026-11-07T00:00:00" && endIso === "2026-11-09T23:59:59") {
        // Ascending full-range query hits 20-row cap on day 1
        return {
          data: makeDayRows("2026-11-07", 1040 + from * 0.001, 20),
          error: null,
        };
      }
      // Single-day queries triggered by fallback (ascending: false)
      const day = startIso.slice(0, 10);
      const base = day === "2026-11-07" ? 1040 : day === "2026-11-08" ? 1050 : 1060;
      const rows = makeDayRows(day, base, 20);
      return {
        data: ascending === false ? rows.reverse() : rows,
        error: null,
      };
    });

    const result = await fetchPaginatedHistory(
      fetcher,
      3,
      3,
      new Date("2026-11-09T22:00:00-04:00"),
    );

    expect(result.map((p) => p.date)).toEqual([
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
    ]);
    expect(result[0].rate).toBeGreaterThan(1040);
    expect(result[1].rate).toBeGreaterThan(1050);
    expect(result[2].rate).toBeGreaterThan(1060);
  });
});

describe("fillMissingDailyRates & fetchRatesHistory", () => {
  it("fills weekend and holiday gaps by carrying forward the previous active rate", () => {
    const filled = fillMissingDailyRates(
      [
        { date: "2026-11-06", rate: 896.12 },
        { date: "2026-11-09", rate: 897.54 },
      ],
      "2026-11-06",
      "2026-11-10",
    );

    expect(filled).toEqual([
      { date: "2026-11-06", rate: 896.12 },
      { date: "2026-11-07", rate: 896.12 },
      { date: "2026-11-08", rate: 896.12 },
      { date: "2026-11-09", rate: 897.54 },
      { date: "2026-11-10", rate: 897.54 },
    ]);
  });

  it("looks back before day 0 when the requested window starts on a weekend or holiday", async () => {
    const fetcher: HistoryPageFetcher = vi.fn(async ({ startIso, endIso, from }) => {
      if (from > 0) return { data: [], error: null };
      if (startIso === "2026-11-07T00:00:00" && endIso === "2026-11-09T23:59:59") {
        // Window is Sat..Mon: only Monday has a direct row
        return {
          data: [{ date: "2026-11-09T00:00:00", rate: 897.54 }],
          error: null,
        };
      }
      // Lookback query [2026-10-24 .. 2026-11-06] finds Friday's active BCV rate
      return {
        data: [{ date: "2026-11-06T00:00:00", rate: 896.12 }],
        error: null,
      };
    });

    const result = await fetchRatesHistory(
      [1],
      3,
      fetcher,
      new Date("2026-11-09T12:00:00-04:00"),
    );

    expect(result.ok).toBe(true);
    expect(result.series[1]).toEqual([
      { date: "2026-11-07", rate: 896.12 },
      { date: "2026-11-08", rate: 896.12 },
      { date: "2026-11-09", rate: 897.54 },
    ]);
  });

  it("degrades gracefully without throwing when exchange_rates returns a permission or network error", async () => {
    const brokenFetcher: HistoryPageFetcher = vi.fn(async () => ({
      data: null,
      error: { message: "permission denied for table exchange_rates" },
    }));

    const result = await fetchRatesHistory([1, 3], 7, brokenFetcher);
    expect(result.ok).toBe(false);
    expect(result.series).toEqual({});
    expect(result.error).toContain("permission denied");
  });
});
