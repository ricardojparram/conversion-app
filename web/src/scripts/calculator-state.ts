import {
  centsToNumber,
  convertAmount,
  parseClipboardAmount,
  parseDigitsToCents,
  toCents,
} from "@/lib/rates/calculator";
import { getCurrencyDisplaySuffix, getCurrencyTargetLabel } from "@/lib/rates/format";
import type { HistoryPoint, HistorySeries, RateDisplayMode, ResolvedRate } from "@/lib/rates/types";

export interface CalculatorState {
  rates: ResolvedRate[];
  selectedCurrencyId: number;
  bcvMode: RateDisplayMode;
  bsCents: number;
  foreignCents: number;
  lastEdited: "bs" | "foreign";
}

export function getSelectedRate(state: CalculatorState): ResolvedRate | null {
  return (
    state.rates.find((r) => r.currencyId === state.selectedCurrencyId) ??
    state.rates[0] ??
    null
  );
}

export function getActiveRateValue(state: CalculatorState): number {
  const rate = getSelectedRate(state);
  if (!rate) return 0;
  if (state.bcvMode === "next" && rate.hasNextRate && rate.nextRate !== null) {
    return rate.nextRate;
  }
  return rate.effectiveRate;
}

export function getActiveRateDate(state: CalculatorState): string | null {
  const rate = getSelectedRate(state);
  if (!rate) return null;
  if (state.bcvMode === "next" && rate.hasNextRate && rate.nextDate) {
    return rate.nextDate;
  }
  return rate.effectiveDate;
}

export function getActiveCurrencyMeta(state: CalculatorState): {
  suffix: string;
  targetLabel: string;
} {
  const rate = getSelectedRate(state);
  if (!rate) {
    return { suffix: "$", targetLabel: "Dólares" };
  }
  return {
    suffix: getCurrencyDisplaySuffix(rate),
    targetLabel: getCurrencyTargetLabel(rate),
  };
}

function recalculateFromLastEdited(state: CalculatorState): CalculatorState {
  const rateVal = getActiveRateValue(state);
  if (state.bsCents === 0 && state.foreignCents === 0 && rateVal > 0) {
    return {
      ...state,
      foreignCents: 100,
      bsCents: toCents(convertAmount(1, rateVal, "foreignToBs")),
      lastEdited: "foreign",
    };
  }

  if (state.lastEdited === "bs") {
    const bsNum = centsToNumber(state.bsCents);
    const foreignNum = convertAmount(bsNum, rateVal, "bsToForeign");
    return {
      ...state,
      foreignCents: toCents(foreignNum),
    };
  }

  const foreignNum = centsToNumber(state.foreignCents);
  const bsNum = convertAmount(foreignNum, rateVal, "foreignToBs");
  return {
    ...state,
    bsCents: toCents(bsNum),
  };
}

export function createCalculatorState(
  rates: ResolvedRate[],
  initialCurrencyId?: number,
): CalculatorState {
  const matched =
    rates.find((r) => r.currencyId === initialCurrencyId) ?? rates[0] ?? null;
  const selectedId = matched ? matched.currencyId : 0;
  const activeRate = matched ? matched.effectiveRate : 0;

  return {
    rates,
    selectedCurrencyId: selectedId,
    bcvMode: "current",
    foreignCents: activeRate > 0 ? 100 : 0,
    bsCents: activeRate > 0 ? toCents(convertAmount(1, activeRate, "foreignToBs")) : 0,
    lastEdited: "foreign",
  };
}

export function resetOnFocus(state: CalculatorState): CalculatorState {
  return {
    ...state,
    bsCents: 0,
    foreignCents: 0,
  };
}

export function inputDigitsForField(
  state: CalculatorState,
  field: "bs" | "foreign",
  rawText: string,
): CalculatorState {
  const parsedCents = parseDigitsToCents(rawText);
  if (parsedCents === null) return state;

  const rateVal = getActiveRateValue(state);
  const amountNum = centsToNumber(parsedCents);

  if (field === "bs") {
    return {
      ...state,
      lastEdited: "bs",
      bsCents: parsedCents,
      foreignCents: toCents(convertAmount(amountNum, rateVal, "bsToForeign")),
    };
  }

  return {
    ...state,
    lastEdited: "foreign",
    foreignCents: parsedCents,
    bsCents: toCents(convertAmount(amountNum, rateVal, "foreignToBs")),
  };
}

export function applyClipboardValue(
  state: CalculatorState,
  field: "bs" | "foreign",
  clipboardText: string,
): CalculatorState {
  const parsedValue = parseClipboardAmount(clipboardText);
  if (parsedValue === null) return state;

  const pastedCents = toCents(parsedValue);
  const rateVal = getActiveRateValue(state);
  const numeric = centsToNumber(pastedCents);

  if (field === "bs") {
    return {
      ...state,
      lastEdited: "bs",
      bsCents: pastedCents,
      foreignCents: toCents(convertAmount(numeric, rateVal, "bsToForeign")),
    };
  }

  return {
    ...state,
    lastEdited: "foreign",
    foreignCents: pastedCents,
    bsCents: toCents(convertAmount(numeric, rateVal, "foreignToBs")),
  };
}

export function selectSource(
  state: CalculatorState,
  currencyId: number,
): CalculatorState {
  if (!state.rates.some((r) => r.currencyId === currencyId)) return state;
  return recalculateFromLastEdited({
    ...state,
    selectedCurrencyId: currencyId,
    bcvMode: "current",
  });
}

export function setBcvDisplayMode(
  state: CalculatorState,
  mode: RateDisplayMode,
): CalculatorState {
  return recalculateFromLastEdited({
    ...state,
    bcvMode: mode,
  });
}

export function updateRatesSnapshot(
  state: CalculatorState,
  newRates: ResolvedRate[],
): CalculatorState {
  if (newRates.length === 0) return state;
  const hasSelected = newRates.some((r) => r.currencyId === state.selectedCurrencyId);
  return recalculateFromLastEdited({
    ...state,
    rates: newRates,
    selectedCurrencyId: hasSelected ? state.selectedCurrencyId : newRates[0].currencyId,
  });
}

// ── History SVG Geometry Model (shared by SSR /tendencias & Drawer client) ──

export interface ChartPointCoord {
  x: number;
  y: number;
  rate: number;
  date: string;
}

export interface ChartSeriesItem {
  id: number;
  currencyName: string;
  shortName: string;
  color: string;
  points: ChartPointCoord[];
  linePath: string;
  fillPath: string;
  lastPoint: ChartPointCoord | null;
  minRate: number;
  maxRate: number;
  initialRate: number;
  latestRate: number;
  changePercent: number;
  isPositive: boolean;
}

export interface ChartSeriesModel {
  series: ChartSeriesItem[];
  globalMin: number;
  globalMax: number;
}

export function getSourceChartColor(
  currencyId: number,
  currencyName: string,
): string {
  if (currencyId === 1) return "#16a249";
  if (currencyId === 2) return "#0d9488";
  if (currencyId === 3) return "#ea4335";
  if (currencyId === 4) return "#2563eb";

  const lower = currencyName.toLowerCase();
  if (lower.includes("bcv")) return "#16a249";
  if (lower.includes("paralelo") || lower.includes("venta")) return "#ea4335";
  return "#2563eb";
}

export function formatShortSourceName(currencyName: string): string {
  return currencyName.replace("Dólar ", "").trim();
}

export function buildChartSeriesModel({
  selectedSources,
  rates,
  historyByCurrency,
  days,
}: {
  selectedSources: number[];
  rates: ResolvedRate[];
  historyByCurrency: HistorySeries;
  days: 7 | 15 | 30;
}): ChartSeriesModel {
  const sliced = selectedSources.map((id) => {
    const raw: HistoryPoint[] = historyByCurrency[id] || [];
    const points = raw.slice(-days);
    const meta = rates.find((r) => r.currencyId === id);
    const name = meta ? meta.currencyName : `Fuente ${id}`;
    return { id, points, name };
  });

  const allValues: number[] = [];
  for (const item of sliced) {
    for (const pt of item.points) {
      if (Number.isFinite(pt.rate)) allValues.push(pt.rate);
    }
  }

  if (allValues.length === 0) {
    return { series: [], globalMin: 0, globalMax: 0 };
  }

  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const valRange = globalMax - globalMin === 0 ? 1 : globalMax - globalMin;

  const series: ChartSeriesItem[] = sliced
    .filter((item) => item.points.length > 0)
    .map((item) => {
      const coords: ChartPointCoord[] = item.points.map((pt, index) => {
        const x =
          item.points.length > 1
            ? 6 + (index / (item.points.length - 1)) * 288
            : 150;
        const y = 150 - ((pt.rate - globalMin) / valRange) * 110 - 20;
        return { x, y, rate: pt.rate, date: pt.date };
      });

      const linePath =
        coords.length > 0
          ? "M " +
            coords.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")
          : "";

      const fillPath =
        coords.length > 1
          ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} 150 L ${coords[0].x.toFixed(1)} 150 Z`
          : "";

      const ratesList = item.points.map((p) => p.rate);
      const minRate = Math.min(...ratesList);
      const maxRate = Math.max(...ratesList);
      const initialRate = ratesList[0] ?? 0;
      const latestRate = ratesList[ratesList.length - 1] ?? 0;
      const changePercent =
        initialRate === 0 ? 0 : ((latestRate - initialRate) / initialRate) * 100;

      return {
        id: item.id,
        currencyName: item.name,
        shortName: formatShortSourceName(item.name),
        color: getSourceChartColor(item.id, item.name),
        points: coords,
        linePath,
        fillPath,
        lastPoint: coords[coords.length - 1] ?? null,
        minRate,
        maxRate,
        initialRate,
        latestRate,
        changePercent,
        isPositive: latestRate >= initialRate,
      };
    });

  return { series, globalMin, globalMax };
}
