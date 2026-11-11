import { shouldIncludeTimeForRate } from "@/lib/rates/caracas-date";
import { centsToNumber } from "@/lib/rates/calculator";
import { formatCurrency, formatNumber } from "@/lib/rates/format";
import type { ResolvedRate } from "@/lib/rates/types";
import {
  applyClipboardValue,
  createCalculatorState,
  getActiveCurrencyMeta,
  getSelectedRate,
  inputDigitsForField,
  resetOnFocus,
  selectSource,
  updateRatesSnapshot,
  type CalculatorState,
} from "./calculator-state";
import { syncLiveTimeElement } from "./live-time";

const CACHED_RATES_KEY = "cached_rates";

function announce(message: string): void {
  const region = document.getElementById("app-live-region");
  if (!region) return;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 20);
}

type InvokerCommandEvent = Event & {
  command?: string;
  source?: Element | null;
};

function legacyCopy(text: string): boolean {
  try {
    const field = Object.assign(document.createElement("textarea"), { value: text });
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
    document.body.append(field);
    field.select();
    try {
      const legacyExec = (
        document as unknown as { execCommand?: (cmd: string) => boolean }
      ).execCommand;
      return typeof legacyExec === "function" ? legacyExec.call(document, "copy") : false;
    } finally {
      field.remove();
    }
  } catch {
    return false;
  }
}

function saveRatesCache(rates: ResolvedRate[]): void {
  try {
    window.localStorage.setItem(CACHED_RATES_KEY, JSON.stringify(rates));
  } catch {
    // Ignore private mode quota errors
  }
}

function loadRatesCache(): ResolvedRate[] {
  try {
    const raw = window.localStorage.getItem(CACHED_RATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    // Support both ResolvedRate[] and legacy Convertion[] stored by mobile/web PWA
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        if (typeof obj.currencyId === "number" && typeof obj.effectiveRate === "number") {
          return obj as unknown as ResolvedRate;
        }
        if (typeof obj.currency_id === "number" && typeof obj.rate === "number") {
          return {
            currencyId: obj.currency_id,
            currencyName: String(obj.currency_name ?? ""),
            code: String(obj.code ?? "USD"),
            symbol: String(obj.symbol ?? "$"),
            source: String(obj.source ?? ""),
            effectiveRate: Number(obj.rate),
            effectiveDate: String(obj.date ?? new Date().toISOString()),
            nextRate: null,
            nextDate: null,
            hasNextRate: false,
          } satisfies ResolvedRate;
        }
        return null;
      })
      .filter((x): x is ResolvedRate => x !== null);
  } catch {
    return [];
  }
}

export function initCalculator(): void {
  if (typeof document === "undefined") return;
  const roots = document.querySelectorAll<HTMLElement>("[data-calculator-root]");
  roots.forEach((root) => {
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";
    setupCalculatorRoot(root);
  });
}

function setupCalculatorRoot(root: HTMLElement): void {
  const initialRatesRaw = root.dataset.ratesJson ?? "[]";
  let parsedRates: ResolvedRate[] = [];
  try {
    parsedRates = JSON.parse(initialRatesRaw) as ResolvedRate[];
  } catch {
    parsedRates = [];
  }

  const initialCurrencyId = Number(root.dataset.initialCurrencyId ?? "0") || undefined;
  const hadSsrRates = parsedRates.length > 0;

  if (hadSsrRates) {
    saveRatesCache(parsedRates);
  } else {
    parsedRates = loadRatesCache();
  }

  let isSilentRecoveryPending = !hadSsrRates && parsedRates.length === 0 && (typeof navigator === "undefined" || navigator.onLine !== false);
  let state: CalculatorState = createCalculatorState(parsedRates, initialCurrencyId);

  const bsInput = root.querySelector<HTMLInputElement>("#calc-bs-input");
  const foreignInput = root.querySelector<HTMLInputElement>("#calc-foreign-input");
  const bsDisplay = root.querySelector<HTMLElement>('[data-display="bs"]');
  const foreignDisplay = root.querySelector<HTMLElement>('[data-display="foreign"]');
  const foreignLabel = root.querySelector<HTMLElement>("[data-foreign-label]");
  const foreignPrefix = root.querySelector<HTMLElement>("[data-foreign-prefix]");
  const inputsStack = root.querySelector<HTMLElement>("[data-inputs-stack]");
  const swapBtn = root.querySelector<HTMLButtonElement>("[data-swap-btn]");
  const dirLeftEl = root.querySelector<HTMLElement>("[data-calc-dir-left]");
  const targetLabelEl = root.querySelector<HTMLElement>("[data-calc-target-label]");
  const updatedAtEl = root.querySelector<HTMLElement>("[data-updated-at]");
  const sourcesGrid = root.querySelector<HTMLElement>("[data-sources-grid]");
  const refreshBtn = root.querySelector<HTMLButtonElement>("[data-refresh-rates]");
  const openHistoryBtn = root.querySelector<HTMLButtonElement>("[data-open-history]");
  const toastEl = root.querySelector<HTMLElement>("[data-calc-toast]");
  const offlineBanner = root.querySelector<HTMLElement>("[data-offline-banner]");

  if (!bsInput || !foreignInput || !bsDisplay || !foreignDisplay) return;

  let isSwapped = inputsStack?.dataset.swapped === "true";

  let toastTimer: number | undefined;
  const showToast = (variant: "success" | "error", text: string) => {
    if (!toastEl) return;
    window.clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.className = `calc-toast is-${variant}`;
    toastEl.hidden = false;
    announce(text);
    toastTimer = window.setTimeout(() => {
      toastEl.hidden = true;
    }, 2000);
  };

  const renderSources = () => {
    if (!sourcesGrid) return;
    const total = state.rates.length;
    if (total === 0) return;

    const existingCards = sourcesGrid.querySelectorAll<HTMLButtonElement>("[data-source-card]");
    if (existingCards.length !== total) {
      // Render source buttons when hydrated asynchronously after degraded SSR
      sourcesGrid.innerHTML = state.rates
        .map((r, i) => {
          const isOddLast = (i + 1) % 2 === 1 && i + 1 === total;
          const isActive = r.currencyId === state.selectedCurrencyId;
          return `<button type="button" data-source-card data-currency-id="${r.currencyId}" aria-pressed="${isActive}" class="source-card${isActive ? " is-active" : ""}${isOddLast ? " is-full-span" : ""}"><span class="source-card-top"><span class="source-name"></span><span class="source-check" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffffff"/><path d="m8.5 12.2 2.3 2.3 4.7-4.8" stroke="var(--cr-primary, #16a249)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span><span class="source-rate"></span></button>`;
        })
        .join("");

      sourcesGrid.querySelectorAll<HTMLButtonElement>("[data-source-card]").forEach((btn, idx) => {
        const rate = state.rates[idx];
        const nameEl = btn.querySelector(".source-name");
        const rateEl = btn.querySelector(".source-rate");
        if (nameEl) nameEl.textContent = rate.currencyName;
        if (rateEl) rateEl.textContent = formatCurrency(rate.effectiveRate, "Bs");
        attachSourceHandler(btn);
      });
      return;
    }

    existingCards.forEach((btn) => {
      const id = Number(btn.dataset.currencyId);
      const isActive = id === state.selectedCurrencyId;
      const rate = state.rates.find((r) => r.currencyId === id);
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (rate) {
        const rateEl = btn.querySelector(".source-rate");
        if (rateEl) rateEl.textContent = formatCurrency(rate.effectiveRate, "Bs");
      }
    });
  };

  const render = () => {
    const { suffix, targetLabel } = getActiveCurrencyMeta(state);
    const bsFormatted = formatNumber(centsToNumber(state.bsCents));
    const foreignFormatted = formatNumber(centsToNumber(state.foreignCents));

    bsDisplay.textContent = bsFormatted;
    foreignDisplay.textContent = foreignFormatted;

    bsInput.value = String(state.bsCents);
    foreignInput.value = String(state.foreignCents);
    bsInput.setAttribute("aria-valuetext", `${bsFormatted} Bolívares`);
    foreignInput.setAttribute("aria-valuetext", `${foreignFormatted} ${targetLabel}`);

    if (foreignLabel) foreignLabel.textContent = targetLabel;
    if (foreignPrefix) foreignPrefix.textContent = suffix;

    if (inputsStack) {
      inputsStack.dataset.swapped = isSwapped ? "true" : "false";
    }
    if (swapBtn) {
      swapBtn.setAttribute("aria-pressed", isSwapped ? "true" : "false");
    }
    if (dirLeftEl && targetLabelEl) {
      if (isSwapped) {
        dirLeftEl.textContent = "Bolívares";
        targetLabelEl.textContent = targetLabel;
      } else {
        dirLeftEl.textContent = targetLabel;
        targetLabelEl.textContent = "Bolívares";
      }
    } else if (dirLeftEl) {
      dirLeftEl.textContent = targetLabel;
    }

    if (updatedAtEl) {
      const selectedRate = getSelectedRate(state);
      syncLiveTimeElement(
        updatedAtEl,
        selectedRate ? selectedRate.effectiveDate : null,
        {
          includeTime: selectedRate
            ? shouldIncludeTimeForRate(selectedRate)
            : undefined,
          emptyText: "Sin conexión",
        },
      );
    }

    if (offlineBanner) {
      offlineBanner.hidden = state.rates.length > 0 || isSilentRecoveryPending;
    }

    if (openHistoryBtn) {
      openHistoryBtn.hidden = state.selectedCurrencyId <= 0;
    }

    renderSources();
  };

  const keepCaretAtEnd = (input: HTMLInputElement) => {
    const len = input.value.length;
    try {
      input.setSelectionRange(len, len);
    } catch {
      // Ignore if element type doesn't support selection range
    }
  };

  const copyTimers = new WeakMap<HTMLButtonElement, number>();
  let lastCopyAnnouncement = "";

  const reportCopyFeedback = (button: HTMLButtonElement, ok: boolean) => {
    const tip = button.nextElementSibling as HTMLElement | null;
    window.clearTimeout(copyTimers.get(button));
    button.removeAttribute("data-copied");
    button.removeAttribute("data-failed");
    button.classList.remove("is-copied");

    let message = ok ? "Copiado" : "No se pudo copiar";
    if (message === lastCopyAnnouncement) {
      message += "\u00A0";
    }
    lastCopyAnnouncement = message;

    if (tip) tip.textContent = "";
    void button.offsetWidth;
    button.setAttribute(ok ? "data-copied" : "data-failed", "");
    if (ok) {
      button.classList.add("is-copied");
    }

    if (tip) {
      window.requestAnimationFrame(() => {
        if (button.hasAttribute(ok ? "data-copied" : "data-failed")) {
          tip.textContent = message;
        }
      });
    }

    const timer = window.setTimeout(() => {
      button.removeAttribute("data-copied");
      button.removeAttribute("data-failed");
      button.classList.remove("is-copied");
      if (tip) tip.textContent = "";
    }, 1500);
    copyTimers.set(button, timer);
  };

  const performCopy = async (button: HTMLButtonElement, field: "bs" | "foreign") => {
    const { suffix } = getActiveCurrencyMeta(state);
    const rawNumber =
      field === "bs"
        ? centsToNumber(state.bsCents)
        : centsToNumber(state.foreignCents);
    const formatted = formatCurrency(rawNumber, field === "bs" ? "Bs" : suffix);

    let writePromise: Promise<boolean>;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        writePromise = navigator.clipboard.writeText(formatted).then(
          () => true,
          () => legacyCopy(formatted),
        );
      } else {
        writePromise = Promise.resolve(legacyCopy(formatted));
      }
    } catch {
      writePromise = Promise.resolve(legacyCopy(formatted));
    }

    // Immediate optimistic feedback at 0ms while clipboard promise settles
    reportCopyFeedback(button, true);

    const copied = await writePromise;
    if (!copied) {
      reportCopyFeedback(button, false);
      showToast("error", "No se pudo copiar");
    }
  };

  const supportsInvokerCommands =
    typeof window !== "undefined" && "CommandEvent" in window;

  if (supportsInvokerCommands) {
    root.addEventListener(
      "command",
      (rawEvent) => {
        const event = rawEvent as InvokerCommandEvent;
        if (!event.command?.startsWith("--copy")) return;
        const button =
          event.source instanceof HTMLButtonElement ? event.source : null;
        if (!button || !root.contains(button)) return;
        const field =
          event.target === bsInput
            ? "bs"
            : event.target === foreignInput
              ? "foreign"
              : null;
        if (!field) return;
        void performCopy(button, field);
      },
      true,
    );
  }

  const attachInputBehavior = (input: HTMLInputElement, field: "bs" | "foreign") => {
    const wrapper = input.closest<HTMLElement>("[data-currency-field]");
    const pasteTooltip = wrapper?.querySelector<HTMLElement>("[data-paste-tooltip]");
    const pasteBtn = wrapper?.querySelector<HTMLButtonElement>("[data-paste-btn]");
    const copyBtn = wrapper?.querySelector<HTMLButtonElement>("[data-copy-btn]");

    const hidePasteTooltip = () => {
      if (pasteTooltip) pasteTooltip.hidden = true;
    };

    const showPasteTooltip = () => {
      document.querySelectorAll<HTMLElement>("[data-paste-tooltip]").forEach((el) => {
        if (el !== pasteTooltip) el.hidden = true;
      });
      if (pasteTooltip) pasteTooltip.hidden = false;
    };

    input.addEventListener("focus", () => {
      state = resetOnFocus(state);
      render();
      keepCaretAtEnd(input);
    });

    input.addEventListener("click", () => {
      keepCaretAtEnd(input);
    });

    input.addEventListener("input", () => {
      state = inputDigitsForField(state, field, input.value);
      render();
      keepCaretAtEnd(input);
    });

    input.addEventListener("paste", (event) => {
      const pasted = event.clipboardData?.getData("text");
      if (!pasted) return;
      event.preventDefault();
      state = applyClipboardValue(state, field, pasted);
      render();
      keepCaretAtEnd(input);
    });

    if (wrapper) {
      wrapper.addEventListener("contextmenu", (event) => {
        if ((event.target as HTMLElement)?.closest("[data-copy-btn]")) return;
        event.preventDefault();
        showPasteTooltip();
      });

      let pressTimer: number | undefined;
      wrapper.addEventListener("pointerdown", (event) => {
        if ((event.target as HTMLElement)?.closest("[data-copy-btn]")) return;
        pressTimer = window.setTimeout(() => {
          showPasteTooltip();
        }, 450);
      });
      wrapper.addEventListener("pointerup", () => window.clearTimeout(pressTimer));
      wrapper.addEventListener("pointercancel", () => window.clearTimeout(pressTimer));
      wrapper.addEventListener("pointerleave", () => window.clearTimeout(pressTimer));
    }

    if (pasteBtn) {
      pasteBtn.addEventListener("click", async () => {
        hidePasteTooltip();
        try {
          if (navigator.clipboard?.readText) {
            const clip = await navigator.clipboard.readText();
            state = applyClipboardValue(state, field, clip);
            render();
            announce("Monto pegado");
          }
        } catch {
          showToast("error", "Usa Ctrl+V para pegar el monto");
        }
      });
    }

    if (copyBtn && !supportsInvokerCommands) {
      copyBtn.addEventListener("click", () => {
        void performCopy(copyBtn, field);
      });
    }

    document.addEventListener("click", (event) => {
      if (pasteTooltip && !pasteTooltip.hidden && !wrapper?.contains(event.target as Node)) {
        hidePasteTooltip();
      }
    });
  };

  const attachSourceHandler = (btn: HTMLButtonElement) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.currencyId);
      state = selectSource(state, id);
      render();
      window.dispatchEvent(
        new CustomEvent("cr:source-changed", { detail: { currencyId: id } }),
      );
    });
  };

  attachInputBehavior(bsInput, "bs");
  attachInputBehavior(foreignInput, "foreign");

  sourcesGrid
    ?.querySelectorAll<HTMLButtonElement>("[data-source-card]")
    .forEach(attachSourceHandler);

  const refreshRatesFromApi = async (notifyUser: boolean) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      if (notifyUser) {
        showToast("error", "Sin conexión");
      } else {
        isSilentRecoveryPending = false;
        render();
      }
      return;
    }
    if (refreshBtn) refreshBtn.setAttribute("data-loading", "true");
    try {
      const resp = await fetch("/api/rates.json", { cache: "no-cache" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = (await resp.json()) as { ok?: boolean; rates?: ResolvedRate[] };
      if (!payload.ok || !Array.isArray(payload.rates) || payload.rates.length === 0) {
        throw new Error("Empty payload");
      }
      isSilentRecoveryPending = false;
      saveRatesCache(payload.rates);
      state = updateRatesSnapshot(state, payload.rates);
      render();
      if (notifyUser) showToast("success", "Actualizado");
    } catch {
      isSilentRecoveryPending = false;
      render();
      if (notifyUser) showToast("error", "Error al actualizar");
    } finally {
      isSilentRecoveryPending = false;
      if (refreshBtn) refreshBtn.removeAttribute("data-loading");
    }
  };

  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      isSwapped = !isSwapped;
      render();
      const { targetLabel } = getActiveCurrencyMeta(state);
      announce(
        isSwapped
          ? `Orden invertido: Bolívares a ${targetLabel}`
          : `Orden restaurado: ${targetLabel} a Bolívares`,
      );
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      void refreshRatesFromApi(true);
    });
  }

  if (openHistoryBtn) {
    openHistoryBtn.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("cr:open-history", {
          detail: {
            currencyId: state.selectedCurrencyId,
            rates: state.rates,
          },
        }),
      );
    });
  }

  render();

  // If SSR degraded with empty rates, quietly sync latest rates in background
  if (!hadSsrRates) {
    void refreshRatesFromApi(false);
  }
}
