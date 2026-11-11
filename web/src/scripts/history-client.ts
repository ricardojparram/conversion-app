import { formatSimpleCaracasDate } from "@/lib/rates/caracas-date";
import { formatCurrency } from "@/lib/rates/format";
import type { HistoryPoint, HistorySeries, ResolvedRate } from "@/lib/rates/types";
import { buildChartSeriesModel } from "./calculator-state";

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
  try {
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

  let isExpanded = false;
  let isLoading = false;

  const titleEl = panel.querySelector<HTMLElement>("[data-history-mode-title]");
  const rangeBtns = panel.querySelectorAll<HTMLButtonElement>("[data-range-days]");
  const filtersWrap = panel.querySelector<HTMLElement>("[data-source-filters]");
  const loadingEl = panel.querySelector<HTMLElement>("[data-history-loading]");
  const emptyEl = panel.querySelector<HTMLElement>("[data-history-empty]");
  const contentEl = panel.querySelector<HTMLElement>("[data-history-content]");
  const singleMetricsEl = panel.querySelector<HTMLElement>("[data-single-metrics]");
  const minValEl = panel.querySelector<HTMLElement>("[data-metric-min]");
  const maxValEl = panel.querySelector<HTMLElement>("[data-metric-max]");
  const changeValEl = panel.querySelector<HTMLElement>("[data-metric-change]");
  const svgEl = panel.querySelector<SVGSVGElement>("[data-chart-svg]");
  const dotsEl = panel.querySelector<HTMLElement>("[data-chart-dots]");
  const multiListEl = panel.querySelector<HTMLElement>("[data-multi-summary]");
  const detailToggleWrap = panel.querySelector<HTMLElement>("[data-detail-wrap]");
  const detailToggleBtn = panel.querySelector<HTMLButtonElement>("[data-detail-toggle]");
  const detailListEl = panel.querySelector<HTMLElement>("[data-detail-list]");

  const renderFilters = () => {
    if (!filtersWrap) return;
    if (rates.length === 0) {
      filtersWrap.innerHTML = "";
      return;
    }

    filtersWrap.innerHTML = rates
      .map((r) => {
        const selected = selectedSources.includes(r.currencyId);
        const shortName = r.currencyName.replace("Dólar ", "");
        const dotColor =
          r.currencyId === 1
            ? "#16a249"
            : r.currencyId === 2
              ? "#0d9488"
              : r.currencyId === 3
                ? "#ea4335"
                : "#2563eb";
        return `<button type="button" data-filter-id="${r.currencyId}" aria-pressed="${selected}" class="source-chip${selected ? " is-selected" : ""}" style="--chip-color: ${dotColor}"><span class="chip-dot" aria-hidden="true"></span><span>${shortName}</span></button>`;
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

    const isSingleMode = selectedSources.length === 1;
    const singleSeries = model.series[0];

    if (titleEl) {
      titleEl.textContent =
        isSingleMode && singleSeries ? singleSeries.shortName : "Comparar";
    }

    if (loadingEl) loadingEl.hidden = !(isLoading && model.series.length === 0);
    if (emptyEl) emptyEl.hidden = isLoading || model.series.length > 0;
    if (contentEl) contentEl.hidden = model.series.length === 0;

    if (model.series.length === 0) {
      if (dotsEl) dotsEl.innerHTML = "";
      return;
    }

    if (singleMetricsEl) singleMetricsEl.hidden = !isSingleMode || !singleSeries;
    if (isSingleMode && singleSeries) {
      if (minValEl) minValEl.textContent = formatCurrency(model.globalMin, "Bs");
      if (maxValEl) maxValEl.textContent = formatCurrency(model.globalMax, "Bs");
      if (changeValEl) {
        const arrow = singleSeries.isPositive ? "▲" : "▼";
        changeValEl.textContent = `${arrow} ${singleSeries.changePercent.toFixed(2)}%`;
        changeValEl.style.color = singleSeries.isPositive ? "#16a249" : "#ea4335";
      }
    }

    if (svgEl) {
      const uid = panel.id || "cr-hist";
      const defs = model.series
        .map(
          (s) =>
            `<linearGradient id="${uid}-grad-${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity="0.20"/><stop offset="100%" stop-color="${s.color}" stop-opacity="0.00"/></linearGradient>`,
        )
        .join("");

      const fills = model.series
        .map((s) =>
          s.fillPath
            ? `<path d="${s.fillPath}" fill="url(#${uid}-grad-${s.id})" />`
            : "",
        )
        .join("");

      const strokes = model.series
        .map((s) =>
          s.linePath
            ? `<path d="${s.linePath}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`
            : "",
        )
        .join("");

      svgEl.innerHTML = `<title>Tendencia de tasa últimos ${days} días</title><defs>${defs}</defs>${fills}${strokes}`;
    }

    if (dotsEl) {
      dotsEl.innerHTML = model.series
        .map((s) =>
          s.lastPoint
            ? `<span class="chart-dot-marker" style="--dot-x: ${((s.lastPoint.x / 300) * 100).toFixed(2)}%; --dot-y: ${((s.lastPoint.y / 150) * 100).toFixed(2)}%; --dot-color: ${s.color};"></span>`
            : "",
        )
        .join("");
    }

    if (multiListEl) {
      multiListEl.hidden = isSingleMode;
      if (!isSingleMode) {
        multiListEl.innerHTML = model.series
          .map((s) => {
            const arrow = s.isPositive ? "▲" : "▼";
            const trendCol = s.isPositive ? "#16a249" : "#ea4335";
            return `<div class="compare-row"><div class="compare-info"><div class="compare-name"><span class="compare-dot" style="background:${s.color}"></span><span>${s.shortName}</span></div><div class="compare-range">Mín: ${formatCurrency(s.minRate, "Bs")} • Máx: ${formatCurrency(s.maxRate, "Bs")}</div></div><div class="compare-values"><span class="compare-latest">${formatCurrency(s.latestRate, "Bs")}</span><span class="compare-pct" style="color:${trendCol}">${arrow} ${s.changePercent.toFixed(2)}%</span></div></div>`;
          })
          .join("");
      }
    }

    if (detailToggleWrap && detailToggleBtn && detailListEl) {
      detailToggleWrap.hidden = !(isSingleMode && singleSeries);
      if (isSingleMode && singleSeries) {
        const rawPoints = (historyByCurrency[singleSeries.id] || []).slice(-days).reverse();
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
          .map(
            (pt) =>
              `<div class="detail-row"><span>${formatSimpleCaracasDate(pt.date)}</span><strong>${formatCurrency(pt.rate, "Bs")}</strong></div>`,
          )
          .join("");
      }
    }
  };

  const fetchedMaxDays: Record<number, number> = {};
  for (const [k, v] of Object.entries(historyByCurrency)) {
    if (Array.isArray(v) && v.length > 0) {
      fetchedMaxDays[Number(k)] = days;
    }
  }

  const ensureData = async () => {
    // Hydrate cached offline history immediately for snappy UI
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
            if (days >= 30 || pts.length > 7) {
              saveCachedHistory(numId, pts);
            }
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
