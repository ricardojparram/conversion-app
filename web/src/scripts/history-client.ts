import {
  formatNaturalCaracasDateTime,
  getCaracasDayKey,
  toCaracasIsoString,
} from "@/lib/rates/caracas-date";
import { formatCurrency, formatNumber } from "@/lib/rates/format";
import type { HistoryPoint, HistorySeries, ResolvedRate } from "@/lib/rates/types";
import {
  buildChartSeriesModel,
  getSourceChartColor,
  type ChartPointCoord,
  type ChartSeriesItem,
  type ChartSeriesModel,
} from "./calculator-state";
import { refreshAllLiveTimes } from "./live-time";

export type HistoryPanelVariant = "home" | "currency" | "compare";

const SHORT_MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatRateChipLabel(
  rate: Pick<ResolvedRate, "currencyId" | "currencyName" | "symbol">,
): string {
  if (rate.currencyId === 1) return "$ Dólar BCV";
  if (rate.currencyId === 2) return "€ Euro BCV";
  if (rate.currencyId === 3) return "₮ USDT Venta";
  if (rate.currencyId === 4) return "₮ USDT Compra";
  return `${rate.symbol || "$"} ${rate.currencyName}`.trim();
}

export function getVariationToneClass(
  changePercent: number,
): "is-positive" | "is-negative" | "is-flat" {
  if (!Number.isFinite(changePercent) || Math.abs(changePercent) < 0.005) {
    return "is-flat";
  }
  return changePercent > 0 ? "is-positive" : "is-negative";
}

export function formatVariationPill(changePercent: number, days: number): string {
  const safe = Number.isFinite(changePercent) ? changePercent : 0;
  const tone = getVariationToneClass(safe);
  const prefix = tone === "is-positive" ? "+" : tone === "is-negative" ? "-" : "";
  const formatted = formatNumber(Math.abs(safe), { precision: 2 });
  return `${prefix}${formatted}% · ${days}d`;
}

export function formatShortCaracasMonthDay(dateStr: string): string {
  try {
    const dayKey = getCaracasDayKey(dateStr);
    const [, monthStr, dayStr] = dayKey.split("-");
    const monthIdx = Number(monthStr) - 1;
    const monthAbbr = SHORT_MONTHS[monthIdx] ?? monthStr;
    return `${dayStr} ${monthAbbr}`;
  } catch {
    return dateStr;
  }
}

export function formatTodayBadgeText(
  series: Pick<ChartSeriesItem, "latestRate" | "lastPoint">,
  todayKey?: string,
): string {
  const rateText = formatCurrency(series.latestRate, "Bs");
  const lastDate = series.lastPoint?.date;
  if (!lastDate) return `Hoy: ${rateText}`;
  try {
    const currentKey = todayKey ?? getCaracasDayKey();
    const lastKey = getCaracasDayKey(lastDate);
    const prefix = lastKey === currentKey ? "Hoy" : formatShortCaracasMonthDay(lastKey);
    return `${prefix}: ${rateText}`;
  } catch {
    return `Hoy: ${rateText}`;
  }
}

export function buildSmoothPaths(
  points: ChartPointCoord[],
  fallbackLine: string,
  fallbackFill: string,
): { linePath: string; fillPath: string } {
  if (points.length <= 2) {
    return { linePath: fallbackLine, fillPath: fallbackFill };
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const secants: number[] = [];

  for (let i = 0; i < n - 1; i += 1) {
    const dxi = points[i + 1].x - points[i].x;
    const dyi = points[i + 1].y - points[i].y;
    dx.push(dxi);
    dy.push(dyi);
    secants.push(dxi === 0 ? 0 : dyi / dxi);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = secants[0];
  tangents[n - 1] = secants[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    const s0 = secants[i - 1];
    const s1 = secants[i];
    if (s0 * s1 <= 0) {
      tangents[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangents[i] = (w1 + w2) / (w1 / s0 + w2 / s1);
    }
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const step = dx[i] / 3;
    const cp1x = p0.x + step;
    const cp1y = Math.max(8, Math.min(142, p0.y + tangents[i] * step));
    const cp2x = p1.x - step;
    const cp2y = Math.max(8, Math.min(142, p1.y - tangents[i + 1] * step));
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const last = points[n - 1];
  const first = points[0];
  const fillPath = `${d} L ${last.x.toFixed(1)} 150 L ${first.x.toFixed(1)} 150 Z`;
  return { linePath: d, fillPath };
}

function resolveCaracasTodayKey(todayKey?: string): string {
  if (todayKey) return todayKey;
  try {
    return getCaracasDayKey();
  } catch {
    return "";
  }
}

export function buildDateAxisLabels(
  series: ChartSeriesItem[],
  todayKey?: string,
  timeline?: string[],
): Array<{ label: string; isLatest: boolean }> {
  let dateKeys: string[] = [];
  if (timeline && timeline.length > 0) {
    dateKeys = timeline;
  } else {
    if (series.length === 0) return [];
    let baseSeries = series[0];
    for (const s of series) {
      if (s.points.length > baseSeries.points.length) {
        baseSeries = s;
      }
    }
    dateKeys = baseSeries.points.map((pt) => pt.date);
  }
  if (dateKeys.length === 0) return [];

  const resolvedTodayKey = resolveCaracasTodayKey(todayKey);

  let indices: number[];
  if (dateKeys.length <= 7) {
    indices = dateKeys.map((_, i) => i);
  } else {
    const targetCount = 7;
    const picked = new Set<number>();
    for (let i = 0; i < targetCount; i += 1) {
      picked.add(Math.round((i / (targetCount - 1)) * (dateKeys.length - 1)));
    }
    indices = Array.from(picked).sort((a, b) => a - b);
  }

  return indices.map((idx, pos) => {
    const dateVal = dateKeys[idx];
    const isLatest = pos === indices.length - 1;
    let label = formatShortCaracasMonthDay(dateVal);
    if (isLatest && resolvedTodayKey) {
      try {
        if (getCaracasDayKey(dateVal) === resolvedTodayKey) {
          label = "Hoy";
        }
      } catch {
        // Keep formatted short date
      }
    }
    return { label, isLatest };
  });
}

export interface ChartHoverColumnDot {
  seriesId: number;
  shortName: string;
  color: string;
  rate: number;
  xPct: number;
  yPct: number;
}

export interface ChartHoverColumnValue {
  seriesId: number;
  shortName: string;
  color: string;
  rate: number | null;
  formattedRate: string;
}

export interface ChartHoverColumn {
  index: number;
  dayKey: string;
  shortDate: string;
  dateLabel: string;
  badgePrefix: string;
  isToday: boolean;
  xPct: number;
  leftPct: number;
  widthPct: number;
  dots: ChartHoverColumnDot[];
  values: ChartHoverColumnValue[];
  ariaLabel: string;
}

export function buildChartHoverColumns(
  model: ChartSeriesModel,
  todayKey?: string,
): ChartHoverColumn[] {
  if (model.series.length === 0) return [];

  let timeline = model.timeline;
  if (!timeline || timeline.length === 0) {
    const fallbackSet = new Set<string>();
    for (const s of model.series) {
      for (const pt of s.points) {
        fallbackSet.add(pt.dayKey || pt.date.slice(0, 10));
      }
    }
    timeline = Array.from(fallbackSet).sort((a, b) => a.localeCompare(b));
  }
  if (timeline.length === 0) return [];

  const resolvedTodayKey = resolveCaracasTodayKey(todayKey);
  const len = timeline.length;
  const xPcts = timeline.map((_, i) => {
    const xSvg = len > 1 ? 6 + (i / (len - 1)) * 288 : 150;
    return (xSvg / 300) * 100;
  });

  const pointBySeriesAndDay = model.series.map((s) => {
    const map = new Map<string, ChartPointCoord>();
    for (const pt of s.points) {
      const key = pt.dayKey || pt.date.slice(0, 10);
      map.set(key, pt);
    }
    return map;
  });

  return timeline.map((dayKey, i) => {
    const xPct = xPcts[i];
    const leftEdge = i === 0 ? 0 : (xPcts[i - 1] + xPct) / 2;
    const rightEdge = i === len - 1 ? 100 : (xPct + xPcts[i + 1]) / 2;
    const widthPct = Math.max(0, rightEdge - leftEdge);

    const shortDate = formatShortCaracasMonthDay(dayKey);
    const isToday = Boolean(resolvedTodayKey && dayKey === resolvedTodayKey);
    const dateLabel = isToday ? `Hoy · ${shortDate}` : shortDate;
    const badgePrefix = isToday ? "Hoy" : shortDate;

    const dots: ChartHoverColumnDot[] = [];
    const values: ChartHoverColumnValue[] = [];

    model.series.forEach((s, sIdx) => {
      const pt = pointBySeriesAndDay[sIdx].get(dayKey);
      const formattedRate = pt ? formatCurrency(pt.rate, "Bs") : "—";
      values.push({
        seriesId: s.id,
        shortName: s.shortName,
        color: s.color,
        rate: pt ? pt.rate : null,
        formattedRate,
      });
      if (pt) {
        dots.push({
          seriesId: s.id,
          shortName: s.shortName,
          color: s.color,
          rate: pt.rate,
          xPct: (pt.x / 300) * 100,
          yPct: (pt.y / 150) * 100,
        });
      }
    });

    const ariaLabel =
      values.length === 1
        ? `${dateLabel}: ${values[0].formattedRate}`
        : `${dateLabel} — ${values.map((v) => `${v.shortName}: ${v.formattedRate}`).join(", ")}`;

    return {
      index: i,
      dayKey,
      shortDate,
      dateLabel,
      badgePrefix,
      isToday,
      xPct,
      leftPct: leftEdge,
      widthPct,
      dots,
      values,
      ariaLabel,
    };
  });
}

function loadCachedHistory(currencyId: number, days: number): HistoryPoint[] {
  try {
    const raw = window.localStorage.getItem(`cached_history_${currencyId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryPoint[];
    return Array.isArray(parsed) ? parsed.slice(-days) : [];
  } catch {
    return [];
  }
}

function saveCachedHistory(currencyId: number, points: HistoryPoint[]): void {
  if (points.length === 0) return;
  try {
    const existing = loadCachedHistory(currencyId, 60);
    if (existing.length > points.length) {
      return;
    }
    window.localStorage.setItem(`cached_history_${currencyId}`, JSON.stringify(points));
  } catch {
    // Ignore storage errors
  }
}

export interface HistoryController {
  loadForCurrency(currencyId: number, updatedRates?: ResolvedRate[]): Promise<void>;
}

const controllers = new WeakMap<HTMLElement, HistoryController>();

export function initStandaloneHistoryPanels(): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>('[data-history-panel][data-auto-init="true"]')
    .forEach((panel) => {
      initHistoryPanel(panel);
    });
}

export function initHistoryPanel(panel: HTMLElement): HistoryController {
  const existing = controllers.get(panel);
  if (existing) return existing;

  let rates: ResolvedRate[] = [];
  try {
    rates = JSON.parse(panel.dataset.ratesJson ?? "[]") as ResolvedRate[];
  } catch {
    rates = [];
  }

  let historyByCurrency: HistorySeries = {};
  try {
    historyByCurrency = JSON.parse(panel.dataset.initialHistoryJson ?? "{}") as HistorySeries;
  } catch {
    historyByCurrency = {};
  }

  const rawVariant = panel.dataset.variant;
  const variant: HistoryPanelVariant =
    rawVariant === "home" || rawVariant === "currency" || rawVariant === "compare"
      ? rawVariant
      : "currency";

  const scopedSources: number[] = panel.dataset.scopedSources
    ? panel.dataset.scopedSources
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => n > 0)
    : [];

  const rawDefaultDays = Number(panel.dataset.defaultDays ?? "7");
  let days: 7 | 15 | 30 =
    rawDefaultDays === 30 ? 30 : rawDefaultDays === 15 ? 15 : 7;
  const initialCurrencyId = Number(panel.dataset.initialCurrencyId ?? "1") || 1;

  let selectedSources: number[] = panel.dataset.defaultSources
    ? panel.dataset.defaultSources
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => n > 0)
    : [initialCurrencyId];

  if (selectedSources.length === 0) selectedSources = [1];
  if (variant === "home" && selectedSources.length > 1) {
    selectedSources = [selectedSources[0]];
  }

  let isExpanded = false;
  let isLoading = false;
  let currentModel: ChartSeriesModel = {
    series: [],
    timeline: [],
    globalMin: 0,
    globalMax: 0,
  };
  let currentColumns: ChartHoverColumn[] = [];
  let activeColIdx: number | null = null;
  let lastPointerType = "mouse";

  const homeTabs = Array.from(
    panel.querySelectorAll<HTMLButtonElement>("[data-home-tab-id]"),
  );
  const titleEl = panel.querySelector<HTMLElement>("[data-history-mode-title]");
  const inlineStatsEl = panel.querySelector<HTMLElement>("[data-inline-stats]");
  const latestRateEl = panel.querySelector<HTMLElement>("[data-latest-rate]");
  const variationPillEl = panel.querySelector<HTMLElement>("[data-variation-pill]");
  const rangeBtns = panel.querySelectorAll<HTMLButtonElement>("[data-range-days]");
  const filtersWrap = panel.querySelector<HTMLElement>("[data-source-filters]");
  const loadingEl = panel.querySelector<HTMLElement>("[data-history-loading]");
  const emptyEl = panel.querySelector<HTMLElement>("[data-history-empty]");
  const contentEl = panel.querySelector<HTMLElement>("[data-history-content]");
  const singleMetricsEl = panel.querySelector<HTMLElement>("[data-single-metrics]");
  const minValEl = panel.querySelector<HTMLElement>("[data-metric-min]");
  const maxValEl = panel.querySelector<HTMLElement>("[data-metric-max]");
  const changeValEl = panel.querySelector<HTMLElement>("[data-metric-change]");
  const chartWrapperEl = panel.querySelector<HTMLElement>("[data-chart-wrapper]");
  const hoverBandEl = panel.querySelector<HTMLElement>("[data-chart-hover-band]");
  const crosshairEl = panel.querySelector<HTMLElement>("[data-chart-crosshair]");
  const columnsEl = panel.querySelector<HTMLElement>("[data-chart-columns]");
  const tooltipEl = panel.querySelector<HTMLElement>("[data-chart-tooltip]");
  const todayBadgeEl = panel.querySelector<HTMLElement>("[data-today-badge]");
  const todayDotEl = panel.querySelector<HTMLElement>("[data-today-dot]");
  const todayTextEl = panel.querySelector<HTMLElement>("[data-today-text]");
  const svgEl = panel.querySelector<SVGSVGElement>("[data-chart-svg]");
  const dotsEl = panel.querySelector<HTMLElement>("[data-chart-dots]");
  const datesEl = panel.querySelector<HTMLElement>("[data-chart-dates]");
  const multiListEl = panel.querySelector<HTMLElement>("[data-multi-summary]");
  const detailToggleWrap = panel.querySelector<HTMLElement>("[data-detail-wrap]");
  const detailToggleBtn = panel.querySelector<HTMLButtonElement>("[data-detail-toggle]");
  const detailListEl = panel.querySelector<HTMLElement>("[data-detail-list]");

  const renderDotsForColumn = (col: ChartHoverColumn | null) => {
    if (!dotsEl) return;
    dotsEl.replaceChildren();
    if (col) {
      for (const dot of col.dots) {
        const span = document.createElement("span");
        span.className = "chart-dot-marker";
        span.style.setProperty("--dot-x", `${dot.xPct.toFixed(2)}%`);
        span.style.setProperty("--dot-y", `${dot.yPct.toFixed(2)}%`);
        span.style.setProperty("--dot-color", dot.color);
        dotsEl.appendChild(span);
      }
      return;
    }

    for (const s of currentModel.series) {
      if (!s.lastPoint) continue;
      const span = document.createElement("span");
      span.className = "chart-dot-marker";
      span.style.setProperty("--dot-x", `${((s.lastPoint.x / 300) * 100).toFixed(2)}%`);
      span.style.setProperty("--dot-y", `${((s.lastPoint.y / 150) * 100).toFixed(2)}%`);
      span.style.setProperty("--dot-color", s.color);
      dotsEl.appendChild(span);
    }
  };

  const syncMultiTooltipContent = (col: ChartHoverColumn) => {
    if (!tooltipEl) return;
    tooltipEl.replaceChildren();

    const dateHeader = document.createElement("div");
    dateHeader.className = "chart-tooltip-date";
    dateHeader.textContent = col.dateLabel;
    tooltipEl.appendChild(dateHeader);

    const rowsWrap = document.createElement("div");
    rowsWrap.className = "chart-tooltip-rows";
    for (const item of col.values) {
      const row = document.createElement("div");
      row.className = "chart-tooltip-row";

      const labelWrap = document.createElement("span");
      labelWrap.className = "chart-tooltip-label";

      const keyDash = document.createElement("span");
      keyDash.className = "chart-tooltip-key";
      keyDash.style.setProperty("--line-color", item.color);
      keyDash.setAttribute("aria-hidden", "true");

      const nameEl = document.createElement("span");
      nameEl.className = "chart-tooltip-name";
      nameEl.textContent = item.shortName;

      labelWrap.append(keyDash, nameEl);

      const valEl = document.createElement("strong");
      valEl.className =
        item.rate === null ? "chart-tooltip-val is-missing" : "chart-tooltip-val";
      valEl.textContent = item.formattedRate;

      row.append(labelWrap, valEl);
      rowsWrap.appendChild(row);
    }
    tooltipEl.appendChild(rowsWrap);
  };

  const positionMultiTooltip = (col: ChartHoverColumn) => {
    if (!tooltipEl) return;
    tooltipEl.hidden = false;

    const wrapperW = chartWrapperEl?.clientWidth || 320;
    const wrapperH = chartWrapperEl?.clientHeight || 192;
    const tipW = tooltipEl.offsetWidth || 180;
    const tipH = tooltipEl.offsetHeight || 72;
    const colXpx = (col.xPct / 100) * wrapperW;
    const margin = 8;
    const gap = 12;

    let leftPx = colXpx + gap;
    if (leftPx + tipW > wrapperW - margin) {
      leftPx = colXpx - tipW - gap;
    }
    leftPx = Math.max(margin, Math.min(wrapperW - tipW - margin, leftPx));
    const topPx = Math.max(margin, Math.min(wrapperH - tipH - margin, margin));

    tooltipEl.style.left = `${leftPx.toFixed(1)}px`;
    tooltipEl.style.right = "auto";
    tooltipEl.style.top = `${topPx.toFixed(1)}px`;
  };

  const positionSingleTrackingBadge = (col: ChartHoverColumn) => {
    if (!todayBadgeEl) return;
    todayBadgeEl.hidden = false;
    todayBadgeEl.classList.add("is-tracking");

    const wrapperW = chartWrapperEl?.clientWidth || 320;
    const wrapperH = chartWrapperEl?.clientHeight || 180;
    const badgeW = todayBadgeEl.offsetWidth || 124;
    const badgeH = todayBadgeEl.offsetHeight || 28;
    const colXpx = (col.xPct / 100) * wrapperW;
    const dotYpct = col.dots[0]?.yPct ?? 50;
    const dotYpx = (dotYpct / 100) * wrapperH;
    const margin = 8;

    const leftPx = Math.max(
      margin,
      Math.min(wrapperW - badgeW - margin, colXpx - badgeW / 2),
    );
    let topPx = dotYpx - badgeH - 14;
    if (topPx < 6) {
      topPx = Math.min(wrapperH - badgeH - 6, dotYpx + 14);
    }

    todayBadgeEl.style.left = `${leftPx.toFixed(1)}px`;
    todayBadgeEl.style.right = "auto";
    todayBadgeEl.style.top = `${topPx.toFixed(1)}px`;
  };

  const applyHoverColumn = (colIdx: number | null) => {
    const validIdx =
      colIdx !== null && colIdx >= 0 && colIdx < currentColumns.length
        ? colIdx
        : null;
    activeColIdx = validIdx;

    if (columnsEl) {
      const buttons = columnsEl.querySelectorAll<HTMLButtonElement>("[data-col-index]");
      const defaultTabIdx = Math.max(0, buttons.length - 1);
      const focusTargetIdx = validIdx ?? defaultTabIdx;
      buttons.forEach((btn, i) => {
        const isCurrent = validIdx === i;
        btn.classList.toggle("is-active", isCurrent);
        btn.tabIndex = i === focusTargetIdx ? 0 : -1;
      });
    }

    const isSingleMode = selectedSources.length === 1;
    const singleSeries = currentModel.series[0];

    if (validIdx === null) {
      if (hoverBandEl) hoverBandEl.hidden = true;
      if (crosshairEl) crosshairEl.hidden = true;
      if (tooltipEl) tooltipEl.hidden = true;
      renderDotsForColumn(null);

      if (todayBadgeEl) {
        todayBadgeEl.classList.remove("is-tracking");
        todayBadgeEl.style.left = "";
        todayBadgeEl.style.right = "";
        todayBadgeEl.style.top = "";

        const showIdleBadge = isSingleMode && Boolean(singleSeries);
        todayBadgeEl.hidden = !showIdleBadge;
        if (showIdleBadge && singleSeries) {
          if (todayDotEl) {
            todayDotEl.style.backgroundColor = singleSeries.color;
          }
          if (todayTextEl) {
            todayTextEl.textContent = formatTodayBadgeText(singleSeries);
          }
        }
      }
      return;
    }

    const col = currentColumns[validIdx];
    if (hoverBandEl) {
      hoverBandEl.hidden = false;
      hoverBandEl.style.left = `${col.leftPct.toFixed(3)}%`;
      hoverBandEl.style.width = `${col.widthPct.toFixed(3)}%`;
    }
    if (crosshairEl) {
      crosshairEl.hidden = false;
      crosshairEl.style.left = `${col.xPct.toFixed(3)}%`;
    }
    renderDotsForColumn(col);

    if (currentModel.series.length === 1 && singleSeries) {
      if (tooltipEl) tooltipEl.hidden = true;
      if (todayBadgeEl) {
        const val = col.values[0];
        if (todayDotEl) {
          todayDotEl.style.backgroundColor = val?.color ?? singleSeries.color;
        }
        if (todayTextEl) {
          todayTextEl.textContent = `${col.badgePrefix}: ${val?.formattedRate ?? "—"}`;
        }
        positionSingleTrackingBadge(col);
      }
    } else if (currentModel.series.length > 1) {
      if (todayBadgeEl) todayBadgeEl.hidden = true;
      if (tooltipEl) {
        syncMultiTooltipContent(col);
        positionMultiTooltip(col);
      }
    }
  };

  const renderColumnTriggers = (columns: ChartHoverColumn[]) => {
    if (!columnsEl) return;
    columnsEl.replaceChildren();
    const lastIdx = Math.max(0, columns.length - 1);
    for (const col of columns) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chart-column-trigger";
      btn.dataset.colIndex = String(col.index);
      btn.dataset.dayKey = col.dayKey;
      btn.setAttribute("aria-label", col.ariaLabel);
      btn.tabIndex = col.index === lastIdx ? 0 : -1;
      btn.style.left = `${col.leftPct.toFixed(3)}%`;
      btn.style.width = `${col.widthPct.toFixed(3)}%`;
      columnsEl.appendChild(btn);
    }
  };

  const resolveColumnIndexFromClientX = (clientX: number): number | null => {
    if (!chartWrapperEl || currentColumns.length === 0) return null;
    const rect = chartWrapperEl.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const relPct = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
    for (const col of currentColumns) {
      if (relPct >= col.leftPct && relPct <= col.leftPct + col.widthPct) {
        return col.index;
      }
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    for (const col of currentColumns) {
      const d = Math.abs(relPct - col.xPct);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = col.index;
      }
    }
    return bestIdx;
  };

  const getFilterableRates = (): ResolvedRate[] => {
    if (variant === "currency" && scopedSources.length > 0) {
      return rates.filter((r) => scopedSources.includes(r.currencyId));
    }
    return rates;
  };

  const renderHomeTabs = () => {
    if (variant !== "home") return;
    const activeId = selectedSources[0];
    homeTabs.forEach((tab) => {
      const tabId = Number(tab.dataset.homeTabId);
      const isSelected = tabId === activeId;
      tab.classList.toggle("is-active", isSelected);
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
      tab.tabIndex = isSelected ? 0 : -1;
    });
  };

  const renderFilters = () => {
    if (!filtersWrap) return;
    const filterable = getFilterableRates();
    if (filterable.length === 0 || (variant === "currency" && filterable.length <= 1)) {
      filtersWrap.innerHTML = "";
      filtersWrap.hidden = true;
      return;
    }

    filtersWrap.hidden = false;
    filtersWrap.innerHTML = filterable
      .map((r) => {
        const selected = selectedSources.includes(r.currencyId);
        const label = escapeHtml(formatRateChipLabel(r));
        const dotColor = getSourceChartColor(r.currencyId, r.currencyName);
        return `<button type="button" data-filter-id="${r.currencyId}" aria-pressed="${selected}" class="source-chip${selected ? " is-selected" : ""}" style="--chip-color: ${dotColor}"><span class="chip-dot" aria-hidden="true"></span><span>${label}</span></button>`;
      })
      .join("");

    filtersWrap
      .querySelectorAll<HTMLButtonElement>("[data-filter-id]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = Number(btn.dataset.filterId);
          if (selectedSources.includes(id)) {
            if (selectedSources.length > 1) {
              selectedSources = selectedSources.filter((s) => s !== id);
            }
          } else {
            selectedSources = [...selectedSources, id];
          }
          void syncAndRender();
        });
      });
  };

  const renderChartAndMetrics = () => {
    renderHomeTabs();

    rangeBtns.forEach((btn) => {
      const btnDays = Number(btn.dataset.rangeDays);
      const isSelected = btnDays === days;
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    const model = buildChartSeriesModel({
      selectedSources,
      rates,
      historyByCurrency,
      days,
    });
    currentModel = model;
    currentColumns = buildChartHoverColumns(model);

    const isSingleMode = selectedSources.length === 1;
    const singleSeries = model.series[0];

    if (titleEl) {
      titleEl.textContent =
        isSingleMode && singleSeries ? singleSeries.shortName : "Comparar";
    }

    if (inlineStatsEl) {
      inlineStatsEl.hidden = !(isSingleMode && singleSeries);
    }

    if (latestRateEl) {
      if (singleSeries) {
        latestRateEl.textContent = formatCurrency(singleSeries.latestRate, "Bs");
      } else {
        const activeMeta = rates.find((r) => r.currencyId === selectedSources[0]);
        latestRateEl.textContent = activeMeta
          ? formatCurrency(activeMeta.effectiveRate, "Bs")
          : "—";
      }
    }

    if (variationPillEl) {
      if (isSingleMode && singleSeries) {
        variationPillEl.hidden = false;
        variationPillEl.textContent = formatVariationPill(
          singleSeries.changePercent,
          days,
        );
        variationPillEl.classList.remove("is-positive", "is-negative", "is-flat");
        variationPillEl.classList.add(
          getVariationToneClass(singleSeries.changePercent),
        );
      } else {
        variationPillEl.hidden = true;
      }
    }

    if (loadingEl) loadingEl.hidden = !(isLoading && model.series.length === 0);
    if (emptyEl) emptyEl.hidden = isLoading || model.series.length > 0;
    if (contentEl) contentEl.hidden = model.series.length === 0;

    if (model.series.length === 0) {
      currentColumns = [];
      applyHoverColumn(null);
      if (columnsEl) columnsEl.replaceChildren();
      if (dotsEl) dotsEl.replaceChildren();
      if (datesEl) {
        datesEl.innerHTML = "";
        datesEl.hidden = true;
      }
      if (todayBadgeEl) todayBadgeEl.hidden = true;
      return;
    }

    if (singleMetricsEl) singleMetricsEl.hidden = !isSingleMode || !singleSeries;
    if (isSingleMode && singleSeries) {
      if (minValEl) minValEl.textContent = formatCurrency(model.globalMin, "Bs");
      if (maxValEl) maxValEl.textContent = formatCurrency(model.globalMax, "Bs");
      if (changeValEl) {
        const arrow = singleSeries.isPositive ? "▲" : "▼";
        changeValEl.textContent = `${arrow} ${formatNumber(Math.abs(singleSeries.changePercent), { precision: 2 })}%`;
        changeValEl.style.color = "";
        changeValEl.classList.remove("is-positive", "is-negative");
        changeValEl.classList.add(
          singleSeries.isPositive ? "is-positive" : "is-negative",
        );
      }
    }

    if (svgEl) {
      const uid = panel.id || "cr-hist";
      const isMulti = model.series.length > 1;
      const topOpacity = isMulti ? "0.16" : "0.24";
      const defs = model.series
        .map(
          (s) =>
            `<linearGradient id="${uid}-grad-${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity="${topOpacity}"/><stop offset="100%" stop-color="${s.color}" stop-opacity="0.00"/></linearGradient>`,
        )
        .join("");

      const gridlines = [38, 75, 112]
        .map(
          (y) =>
            `<line x1="0" y1="${y}" x2="300" y2="${y}" stroke="var(--cr-chart-grid)" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />`,
        )
        .join("");

      const smoothModel = model.series.map((s) => ({
        ...s,
        ...buildSmoothPaths(s.points, s.linePath, s.fillPath),
      }));

      const fills = smoothModel
        .map((s) =>
          s.fillPath
            ? `<path d="${s.fillPath}" fill="url(#${uid}-grad-${s.id})" />`
            : "",
        )
        .join("");

      const strokes = smoothModel
        .map((s) =>
          s.linePath
            ? `<path d="${s.linePath}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`
            : "",
        )
        .join("");

      svgEl.setAttribute(
        "aria-label",
        `Gráfico de tendencia de tasas últimos ${days} días`,
      );
      svgEl.innerHTML = `<title>Tendencia de tasa últimos ${days} días</title><defs>${defs}</defs>${gridlines}${fills}${strokes}`;
    }

    renderColumnTriggers(currentColumns);
    applyHoverColumn(null);

    if (datesEl) {
      const dateLabels = buildDateAxisLabels(model.series, undefined, model.timeline);
      datesEl.hidden = dateLabels.length === 0;
      datesEl.dataset.dense = dateLabels.length >= 6 ? "true" : "false";
      datesEl.innerHTML = dateLabels
        .map(
          (item) =>
            `<span class="chart-date-label${item.isLatest ? " is-latest" : ""}">${escapeHtml(item.label)}</span>`,
        )
        .join("");
    }

    if (multiListEl) {
      multiListEl.hidden = isSingleMode;
      if (!isSingleMode) {
        multiListEl.innerHTML = model.series
          .map((s) => {
            const arrow = s.isPositive ? "▲" : "▼";
            const toneClass = s.isPositive ? "is-positive" : "is-negative";
            const pctStr = formatNumber(Math.abs(s.changePercent), { precision: 2 });
            return `<div class="compare-row"><div class="compare-info"><div class="compare-name"><span class="compare-dot" style="background:${s.color}"></span><span>${escapeHtml(s.shortName)}</span></div><div class="compare-range">Mín: ${formatCurrency(s.minRate, "Bs")} • Máx: ${formatCurrency(s.maxRate, "Bs")}</div></div><div class="compare-values"><span class="compare-latest">${formatCurrency(s.latestRate, "Bs")}</span><span class="compare-pct ${toneClass}">${arrow} ${pctStr}%</span></div></div>`;
          })
          .join("");
      }
    }

    if (detailToggleWrap && detailToggleBtn && detailListEl) {
      detailToggleWrap.hidden = !(isSingleMode && singleSeries);
      if (isSingleMode && singleSeries) {
        const rawPoints = [...singleSeries.points].reverse();
        detailToggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        const labelSpan = detailToggleBtn.querySelector("[data-detail-label]");
        if (labelSpan) {
          labelSpan.textContent = isExpanded
            ? "Ocultar historial detallado"
            : "Ver historial detallado";
        }
        detailToggleBtn.classList.toggle("is-open", isExpanded);
        detailListEl.hidden = !isExpanded;
        detailListEl.innerHTML = rawPoints
          .map((pt) => {
            const iso = toCaracasIsoString(pt.dayKey, false);
            const label = formatNaturalCaracasDateTime(pt.dayKey, undefined, {
              includeTime: false,
            });
            return `<div class="detail-row"><time data-live-time data-raw-date="${escapeHtml(pt.dayKey)}" data-include-time="false" datetime="${escapeHtml(iso)}">${escapeHtml(label)}</time><strong>${formatCurrency(pt.rate, "Bs")}</strong></div>`;
          })
          .join("");
        refreshAllLiveTimes(detailListEl);
      }
    }
  };

  if (chartWrapperEl && columnsEl) {
    let colActiveBeforePointerDown: number | null = null;

    columnsEl.addEventListener("click", (event) => {
      const target = event.target;
      const btn =
        target instanceof HTMLElement
          ? target.closest<HTMLButtonElement>("[data-col-index]")
          : null;
      if (!btn) return;
      const idx = Number(btn.dataset.colIndex);
      if (!Number.isFinite(idx)) return;
      if (lastPointerType === "touch" && colActiveBeforePointerDown === idx) {
        applyHoverColumn(null);
        colActiveBeforePointerDown = null;
      } else {
        applyHoverColumn(idx);
      }
    });

    columnsEl.addEventListener("focusin", (event) => {
      const target = event.target;
      const btn =
        target instanceof HTMLElement
          ? target.closest<HTMLButtonElement>("[data-col-index]")
          : null;
      if (!btn) return;
      const idx = Number(btn.dataset.colIndex);
      if (Number.isFinite(idx)) {
        applyHoverColumn(idx);
      }
    });

    chartWrapperEl.addEventListener("pointerdown", (event) => {
      lastPointerType = event.pointerType || "mouse";
      colActiveBeforePointerDown = activeColIdx;
    });

    chartWrapperEl.addEventListener("pointermove", (event) => {
      lastPointerType = event.pointerType || "mouse";
      if (lastPointerType === "touch") return;
      const target = event.target;
      if (
        target instanceof Node &&
        (tooltipEl?.contains(target) || todayBadgeEl?.contains(target))
      ) {
        return;
      }
      const nextIdx = resolveColumnIndexFromClientX(event.clientX);
      if (nextIdx !== null && nextIdx !== activeColIdx) {
        applyHoverColumn(nextIdx);
      }
    });

    chartWrapperEl.addEventListener("pointerleave", () => {
      const hasVisibleFocus = columnsEl.querySelector(":focus-visible") !== null;
      if (!hasVisibleFocus) {
        applyHoverColumn(null);
      }
    });

    chartWrapperEl.addEventListener("focusout", (event) => {
      if (
        event.relatedTarget instanceof Node &&
        chartWrapperEl.contains(event.relatedTarget)
      ) {
        return;
      }
      if (!chartWrapperEl.matches(":hover")) {
        applyHoverColumn(null);
      }
    });

    chartWrapperEl.addEventListener("keydown", (event) => {
      if (currentColumns.length === 0) return;
      let nextIdx: number | null = null;
      if (event.key === "ArrowLeft") {
        nextIdx =
          activeColIdx === null
            ? currentColumns.length - 1
            : Math.max(0, activeColIdx - 1);
      } else if (event.key === "ArrowRight") {
        nextIdx =
          activeColIdx === null
            ? 0
            : Math.min(currentColumns.length - 1, activeColIdx + 1);
      } else if (event.key === "Home") {
        nextIdx = 0;
      } else if (event.key === "End") {
        nextIdx = currentColumns.length - 1;
      } else if (event.key === "Escape") {
        if (activeColIdx !== null) {
          event.preventDefault();
          applyHoverColumn(null);
        }
        return;
      }

      if (nextIdx !== null) {
        event.preventDefault();
        applyHoverColumn(nextIdx);
        const nextBtn = columnsEl.querySelector<HTMLButtonElement>(
          `[data-col-index="${nextIdx}"]`,
        );
        nextBtn?.focus({ preventScroll: true });
      }
    });

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeColIdx !== null) {
          applyHoverColumn(null);
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (
          activeColIdx !== null &&
          event.target instanceof Node &&
          !chartWrapperEl.contains(event.target)
        ) {
          applyHoverColumn(null);
        }
      });
    }
  }

  const fetchedMaxDays: Record<number, number> = {};
  for (const [k, v] of Object.entries(historyByCurrency)) {
    if (Array.isArray(v) && v.length > 0) {
      const id = Number(k);
      fetchedMaxDays[id] = days;
      saveCachedHistory(id, v);
    }
  }

  const ensureData = async () => {
    const missingOrShort: number[] = [];
    for (const id of selectedSources) {
      const current = historyByCurrency[id];
      const alreadyFetchedDays = fetchedMaxDays[id] ?? 0;
      if (!current || current.length === 0) {
        const cached = loadCachedHistory(id, days);
        if (cached.length > 0) {
          historyByCurrency[id] = cached;
        }
        missingOrShort.push(id);
      } else if (days > alreadyFetchedDays && current.length <= alreadyFetchedDays) {
        missingOrShort.push(id);
      }
    }

    if (missingOrShort.length === 0) return;

    isLoading = true;
    renderChartAndMetrics();

    try {
      const url = `/api/history.json?days=${days}&currencyIds=${missingOrShort.join(",")}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = (await resp.json()) as {
        ok?: boolean;
        series?: Record<string, HistoryPoint[]>;
      };
      if (payload.ok && payload.series) {
        for (const [key, pts] of Object.entries(payload.series)) {
          const numId = Number(key);
          fetchedMaxDays[numId] = Math.max(fetchedMaxDays[numId] ?? 0, days);
          if (Array.isArray(pts) && pts.length > 0) {
            historyByCurrency[numId] = pts;
            saveCachedHistory(numId, pts);
          }
        }
      }
    } catch {
      // Keeps whatever SSR / cached data we have without crashing UI
    } finally {
      isLoading = false;
    }
  };

  const syncAndRender = async () => {
    renderFilters();
    renderChartAndMetrics();
    await ensureData();
    renderFilters();
    renderChartAndMetrics();
  };

  homeTabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      const id = Number(tab.dataset.homeTabId);
      if (id > 0 && (selectedSources[0] !== id || !historyByCurrency[id]?.length)) {
        selectedSources = [id];
        void syncAndRender();
      }
    });

    tab.addEventListener("keydown", (event) => {
      if (homeTabs.length === 0) return;
      let nextIdx: number | null = null;
      if (event.key === "ArrowRight") nextIdx = (idx + 1) % homeTabs.length;
      else if (event.key === "ArrowLeft")
        nextIdx = (idx - 1 + homeTabs.length) % homeTabs.length;
      else if (event.key === "Home") nextIdx = 0;
      else if (event.key === "End") nextIdx = homeTabs.length - 1;

      if (nextIdx !== null) {
        event.preventDefault();
        const nextTab = homeTabs[nextIdx];
        nextTab.focus();
        const id = Number(nextTab.dataset.homeTabId);
        if (id > 0) {
          selectedSources = [id];
          void syncAndRender();
        }
      }
    });
  });

  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextDays = Number(btn.dataset.rangeDays);
      if (nextDays === 7 || nextDays === 15 || nextDays === 30) {
        days = nextDays;
        void syncAndRender();
      }
    });
  });

  if (detailToggleBtn) {
    detailToggleBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      renderChartAndMetrics();
    });
  }

  if (panel.dataset.autoInit === "true") {
    void syncAndRender();
  }

  const controller: HistoryController = {
    loadForCurrency: async (currencyId: number, updatedRates?: ResolvedRate[]) => {
      if (updatedRates && updatedRates.length > 0) {
        rates = updatedRates;
      }
      selectedSources = [currencyId];
      isExpanded = false;
      await syncAndRender();
    },
  };

  controllers.set(panel, controller);
  return controller;
}
