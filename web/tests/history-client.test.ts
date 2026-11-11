import { describe, expect, it } from "vitest";
import type { ResolvedRate } from "@/lib/rates/types";
import { buildChartSeriesModel } from "@/scripts/calculator-state";
import {
  buildChartHoverColumns,
  buildDateAxisLabels,
} from "@/scripts/history-client";

const sampleRates: ResolvedRate[] = [
  {
    currencyId: 1,
    currencyName: "BCV Dólar",
    code: "USD",
    symbol: "$",
    source: "BCV",
    effectiveRate: 901.62,
    effectiveDate: "2026-11-11T00:00:00",
    nextRate: null,
    nextDate: null,
    hasNextRate: false,
  },
  {
    currencyId: 3,
    currencyName: "USDT Venta",
    code: "USDT",
    symbol: "$",
    source: "Binance",
    effectiveRate: 1073.08,
    effectiveDate: "2026-11-11T00:00:00",
    nextRate: null,
    nextDate: null,
    hasNextRate: false,
  },
];

describe("interactive chart timeline alignment & column hover model", () => {
  it("aligns multi-series points and carries forward prior BCV rates across weekend gaps", () => {
    const model = buildChartSeriesModel({
      selectedSources: [1, 3],
      rates: sampleRates,
      historyByCurrency: {
        // BCV omits Sat 2026-11-07 and Sun 2026-11-08
        1: [
          { date: "2026-11-06", rate: 896.12 },
          { date: "2026-11-09", rate: 897.54 },
          { date: "2026-11-10", rate: 899.27 },
          { date: "2026-11-11", rate: 901.62 },
        ],
        // USDT trades 7 days/week
        3: [
          { date: "2026-11-06", rate: 1021.56 },
          { date: "2026-11-07", rate: 1031.22 },
          { date: "2026-11-08", rate: 1030.29 },
          { date: "2026-11-09", rate: 1050.99 },
          { date: "2026-11-10", rate: 1072.69 },
          { date: "2026-11-11", rate: 1073.08 },
        ],
      },
      days: 7,
    });

    expect(model.timeline).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);

    const bcv = model.series[0];
    const usdt = model.series[1];
    expect(bcv.points).toHaveLength(6);
    expect(usdt.points).toHaveLength(6);
    expect(bcv.points.find((p) => p.dayKey === "2026-11-07")?.rate).toBe(896.12);
    expect(bcv.points.find((p) => p.dayKey === "2026-11-08")?.rate).toBe(896.12);

    // BCV Monday (2026-11-09) shares the exact X coordinate as USDT Monday (index 3)
    const bcvMon = bcv.points.find((p) => p.dayKey === "2026-11-09");
    const usdtMon = usdt.points.find((p) => p.dayKey === "2026-11-09");
    expect(bcvMon).toBeDefined();
    expect(usdtMon).toBeDefined();
    expect(bcvMon!.x).toBeCloseTo(usdtMon!.x, 5);
  });

  it("partitions [0..100%] contiguously, carries forward active BCV rates into weekend hover columns, and formats Hoy vs short dates", () => {
    const model = buildChartSeriesModel({
      selectedSources: [1, 3],
      rates: sampleRates,
      historyByCurrency: {
        1: [
          { date: "2026-11-06", rate: 896.12 },
          { date: "2026-11-09", rate: 897.54 },
          { date: "2026-11-11", rate: 901.62 },
        ],
        3: [
          { date: "2026-11-06", rate: 1021.56 },
          { date: "2026-11-07", rate: 1031.22 },
          { date: "2026-11-09", rate: 1050.99 },
          { date: "2026-11-11", rate: 1073.08 },
        ],
      },
      days: 7,
    });

    const cols = buildChartHoverColumns(model, "2026-11-11");
    expect(cols).toHaveLength(6);
    expect(cols.map((c) => c.dayKey)).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);

    // Contiguous 0..100% column coverage with zero overlaps or gaps
    expect(cols[0].leftPct).toBeCloseTo(0, 5);
    const totalWidth = cols.reduce((acc, c) => acc + c.widthPct, 0);
    expect(totalWidth).toBeCloseTo(100, 5);
    for (let i = 0; i < cols.length - 1; i += 1) {
      expect(cols[i].leftPct + cols[i].widthPct).toBeCloseTo(
        cols[i + 1].leftPct,
        5,
      );
      expect(cols[i].xPct).toBeLessThan(cols[i + 1].xPct);
    }

    // Saturday 2026-11-07 and Sunday 2026-11-08 include dots and carried-forward values for both series
    const satCol = cols[1];
    expect(satCol.dayKey).toBe("2026-11-07");
    expect(satCol.isToday).toBe(false);
    expect(satCol.dateLabel).toBe("07 Nov");
    expect(satCol.dots).toHaveLength(2);
    expect(satCol.values[0]).toMatchObject({
      seriesId: 1,
      rate: 896.12,
      formattedRate: "896,12 Bs",
    });
    expect(satCol.values[1].rate).toBe(1031.22);

    const sunCol = cols[2];
    expect(sunCol.dayKey).toBe("2026-11-08");
    expect(sunCol.dots).toHaveLength(2);
    expect(sunCol.values[0]).toMatchObject({
      seriesId: 1,
      rate: 896.12,
      formattedRate: "896,12 Bs",
    });
    expect(sunCol.values[1].rate).toBe(1031.22);

    // Today column formats with "Hoy" prefix
    const todayCol = cols[cols.length - 1];
    expect(todayCol.isToday).toBe(true);
    expect(todayCol.badgePrefix).toBe("Hoy");
    expect(todayCol.dateLabel).toBe("Hoy · 11 Nov");
    expect(todayCol.dots).toHaveLength(2);

    // Date axis labels use contiguous timeline ending in "Hoy"
    const axis = buildDateAxisLabels(model.series, "2026-11-11", model.timeline);
    expect(axis.map((a) => a.label)).toEqual([
      "06 Nov",
      "07 Nov",
      "08 Nov",
      "09 Nov",
      "10 Nov",
      "Hoy",
    ]);
    expect(axis[axis.length - 1].isLatest).toBe(true);
  });

  it("handles a single-point timeline cleanly at xPct = 50 covering full width", () => {
    const model = buildChartSeriesModel({
      selectedSources: [1],
      rates: [sampleRates[0]],
      historyByCurrency: {
        1: [{ date: "2026-11-11", rate: 901.62 }],
      },
      days: 7,
    });

    const cols = buildChartHoverColumns(model, "2026-11-11");
    expect(cols).toHaveLength(1);
    expect(cols[0].leftPct).toBe(0);
    expect(cols[0].widthPct).toBe(100);
    expect(cols[0].xPct).toBe(50);
    expect(cols[0].dots).toHaveLength(1);
    expect(cols[0].dots[0].xPct).toBe(50);
  });
});
