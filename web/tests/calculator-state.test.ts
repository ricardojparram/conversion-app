import { describe, expect, it } from "vitest";
import {
  createCalculatorState,
  resetOnFocus,
  inputDigitsForField,
  applyClipboardValue,
  selectSource,
  setBcvDisplayMode,
  getActiveRateValue,
  buildChartSeriesModel,
  getSourceChartColor,
} from "@/scripts/calculator-state";
import type { ResolvedRate } from "@/lib/rates/types";

const sampleRates: ResolvedRate[] = [
  {
    currencyId: 1,
    currencyName: "BCV Dólar",
    code: "USD",
    symbol: "$",
    source: "BCV",
    effectiveRate: 897.54,
    effectiveDate: "2026-11-09T00:00:00",
    nextRate: 899.27,
    nextDate: "2026-11-10T00:00:00",
    hasNextRate: true,
  },
  {
    currencyId: 3,
    currencyName: "USDT Venta",
    code: "USDT",
    symbol: "$",
    source: "Binance",
    effectiveRate: 1050.6,
    effectiveDate: "2026-11-09T22:15:00",
    nextRate: null,
    nextDate: null,
    hasNextRate: false,
  },
];

describe("calculator state machine", () => {
  it("initializes with foreign = 1 and bs = 1 * activeRate", () => {
    const state = createCalculatorState(sampleRates, 1);
    expect(state.selectedCurrencyId).toBe(1);
    expect(state.foreignCents).toBe(100);
    expect(state.bsCents).toBe(89754);
    expect(state.lastEdited).toBe("foreign");
  });

  it("applies cents-first digit typing and recalculates the paired field", () => {
    let state = createCalculatorState(sampleRates, 1);
    state = resetOnFocus(state);
    expect(state.bsCents).toBe(0);
    expect(state.foreignCents).toBe(0);

    // Type "2", "3", "5", "0" in foreign ($) -> 23.50 USD * 897.54 = 21092.19 Bs
    state = inputDigitsForField(state, "foreign", "2");
    expect(state.foreignCents).toBe(2);
    state = inputDigitsForField(state, "foreign", "2350");
    expect(state.foreignCents).toBe(2350);
    expect(state.bsCents).toBe(Math.round(23.5 * 897.54 * 100));
    expect(state.lastEdited).toBe("foreign");

    // Now type in bs -> recalculates foreign
    state = inputDigitsForField(state, "bs", "100000"); // 1000.00 Bs
    expect(state.bsCents).toBe(100000);
    expect(state.lastEdited).toBe("bs");
    expect(state.foreignCents).toBe(Math.round((1000 / 897.54) * 100));
  });

  it("handles switching source and toggling BCV next-rate preview while preserving lastEdited", () => {
    let state = createCalculatorState(sampleRates, 1);
    state = inputDigitsForField(state, "foreign", "1000"); // $10.00

    // Toggle BCV next rate preview -> 899.27 Bs
    state = setBcvDisplayMode(state, "next");
    expect(getActiveRateValue(state)).toBe(899.27);
    expect(state.bsCents).toBe(899270);

    // Switch to USDT Venta (1050.60 Bs) -> resets BCV mode to current and recalculates bs for $10.00
    state = selectSource(state, 3);
    expect(state.selectedCurrencyId).toBe(3);
    expect(state.bcvMode).toBe("current");
    expect(state.bsCents).toBe(1050600);
  });

  it("applies pasted values cleanly and ignores invalid pastes", () => {
    let state = createCalculatorState(sampleRates, 1);
    state = applyClipboardValue(state, "bs", "1.795,08 Bs");
    expect(state.bsCents).toBe(179508);
    expect(state.foreignCents).toBe(200);

    const unchanged = applyClipboardValue(state, "bs", "no numeric amount");
    expect(unchanged).toEqual(state);
  });
});

describe("chart series model builder", () => {
  it("computes min, max, percentage change and SVG paths for multi-source data", () => {
    const model = buildChartSeriesModel({
      selectedSources: [1, 3],
      rates: sampleRates,
      historyByCurrency: {
        1: [
          { date: "2026-11-08", rate: 890 },
          { date: "2026-11-09", rate: 897.54 },
        ],
        3: [
          { date: "2026-11-08", rate: 1040 },
          { date: "2026-11-09", rate: 1050.6 },
        ],
      },
      days: 7,
    });

    expect(model.globalMin).toBe(890);
    expect(model.globalMax).toBe(1050.6);
    expect(model.series).toHaveLength(2);
    expect(model.series[0].color).toBe(getSourceChartColor(1, "BCV Dólar"));
    expect(model.series[0].linePath).toMatch(/^M \d+\.\d+ \d+\.\d+ L /);
    expect(model.series[0].fillPath).toMatch(/150 Z$/);
    expect(model.series[1].changePercent).toBeCloseTo(((1050.6 - 1040) / 1040) * 100, 2);
  });
});
