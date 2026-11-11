import { getCaracasDayKey, getCaracasDayStartMs } from "@/lib/rates/caracas-date";
import {
  centsToNumber,
  convertAmount,
  parseClipboardAmount,
  parseDigitsToCents,
  toCents,
} from "@/lib/rates/calculator";
import { getCurrencyDisplaySuffix, getCurrencyTargetLabel } from "@/lib/rates/format";
import type { HistoryPoint, HistorySeries, ResolvedRate } from "@/lib/rates/types";

export interface CalculatorState {
  rates: ResolvedRate[];
  selectedCurrencyId: number;
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
  return rate ? rate.effectiveRate : 0;
}

export function getActiveRateDate(state: CalculatorState): string | null {
  const rate = getSelectedRate(state);
  return rate ? rate.effectiveDate : null;
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
  dayKey: string;
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
  timeline: string[];
  globalMin: number;
  globalMax: number;
}

const DAY_MS = 86_400_000;
const MAX_CALENDAR_SPAN_DAYS = 120;

function normalizeDayKey(dateStr: string): string {
  try {
    return getCaracasDayKey(dateStr);
  } catch {
    return dateStr.slice(0, 10);
  }
}

function buildContiguousCalendarTimeline(
  rawDayKeys: string[],
  days: number,
): string[] {
  if (rawDayKeys.length === 0) return [];
  const sorted = Array.from(new Set(rawDayKeys)).sort((a, b) => a.localeCompare(b));
  const firstKey = sorted[0];
  const lastKey = sorted[sorted.length - 1];

  try {
    const endMs = getCaracasDayStartMs(lastKey);
    const naturalStartMs = getCaracasDayStartMs(firstKey);
    const cappedStartMs = Math.max(
      naturalStartMs,
      endMs - (MAX_CALENDAR_SPAN_DAYS - 1) * DAY_MS,
    );
    const fullDays: string[] = [];
    for (let ms = cappedStartMs; ms <= endMs; ms += DAY_MS) {
      fullDays.push(getCaracasDayKey(ms));
    }
    return fullDays.slice(-days);
  } catch {
    return sorted.slice(-days);
  }
}

export function getSourceChartColor(
  currencyId: number,
  currencyName: string,
): string {
  // Validated against Light (#ffffff) and Dark (#0c1b29) chart surfaces
  if (currencyId === 1) return "#16a249";
  if (currencyId === 2) return "#2563eb";
  if (currencyId === 3) return "#d97706";
  if (currencyId === 4) return "#db2777";

  const lower = currencyName.toLowerCase();
  if (lower.includes("bcv")) return "#16a249";
  if (lower.includes("paralelo") || lower.includes("venta")) return "#d97706";
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
  const collectedDayKeys: string[] = [];
  const prepared = selectedSources.map((id) => {
    const raw: HistoryPoint[] = historyByCurrency[id] || [];
    const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, number>();
    for (const pt of sorted) {
      const rate = Number(pt.rate);
      if (!Number.isFinite(rate) || rate <= 0 || !pt.date) continue;
      const dayKey = normalizeDayKey(pt.date);
      map.set(dayKey, rate);
      collectedDayKeys.push(dayKey);
    }
    const meta = rates.find((r) => r.currencyId === id);
    const name = meta ? meta.currencyName : `Fuente ${id}`;
    return { id, map, name };
  });

  if (collectedDayKeys.length === 0) {
    return { series: [], timeline: [], globalMin: 0, globalMax: 0 };
  }

  const timeline = buildContiguousCalendarTimeline(collectedDayKeys, days);
  if (timeline.length === 0) {
    return { series: [], timeline: [], globalMin: 0, globalMax: 0 };
  }
  const firstTimelineKey = timeline[0];

  const filledSeries = prepared.map((item) => {
    let lastKnown: number | null = null;
    let bestSeedDay = "";
    for (const [dayKey, rate] of item.map.entries()) {
      if (dayKey < firstTimelineKey && dayKey >= bestSeedDay) {
        bestSeedDay = dayKey;
        lastKnown = rate;
      }
    }

    const points: Array<{ dayKey: string; rate: number; dayIdx: number }> = [];
    timeline.forEach((dayKey, dayIdx) => {
      const exact = item.map.get(dayKey);
      if (exact !== undefined) {
        lastKnown = exact;
      }
      if (lastKnown !== null) {
        points.push({ dayKey, rate: lastKnown, dayIdx });
      }
    });

    return {
      id: item.id,
      name: item.name,
      points,
    };
  });

  const allValues: number[] = [];
  for (const item of filledSeries) {
    for (const pt of item.points) {
      allValues.push(pt.rate);
    }
  }

  if (allValues.length === 0) {
    return { series: [], timeline: [], globalMin: 0, globalMax: 0 };
  }

  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const valRange = globalMax - globalMin === 0 ? 1 : globalMax - globalMin;

  const series: ChartSeriesItem[] = filledSeries
    .filter((item) => item.points.length > 0)
    .map((item) => {
      const coords: ChartPointCoord[] = item.points.map((pt) => {
        const x =
          timeline.length > 1
            ? 6 + (pt.dayIdx / (timeline.length - 1)) * 288
            : 150;
        const y = 150 - ((pt.rate - globalMin) / valRange) * 110 - 20;
        return { x, y, rate: pt.rate, date: pt.dayKey, dayKey: pt.dayKey };
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

  return { series, timeline, globalMin, globalMax };
}
