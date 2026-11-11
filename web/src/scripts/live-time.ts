import {
  formatNaturalCaracasDateTime,
  formatNaturalFutureCaracasDate,
  toCaracasIsoString,
} from "@/lib/rates/caracas-date";

const TICK_INTERVAL_MS = 15_000;

export function updateLiveTimeElement(
  el: Element,
  now: Date = new Date(),
): void {
  const rawDate =
    el.getAttribute("data-raw-date") ?? el.getAttribute("datetime") ?? "";
  if (!rawDate) return;

  const isFuture = el.getAttribute("data-live-future") === "true";
  const includeTimeAttr = el.getAttribute("data-include-time");
  const includeTime =
    includeTimeAttr === "true"
      ? true
      : includeTimeAttr === "false"
        ? false
        : undefined;

  const nextText = isFuture
    ? formatNaturalFutureCaracasDate(rawDate, now)
    : formatNaturalCaracasDateTime(rawDate, now, { includeTime });

  if (nextText && el.textContent !== nextText) {
    el.textContent = nextText;
  }
}

export function syncLiveTimeElement(
  el: Element,
  rawDate: string | null,
  options: { includeTime?: boolean; future?: boolean; emptyText?: string; now?: Date } = {},
): void {
  const { includeTime, future = false, emptyText = "Sin conexión", now = new Date() } = options;

  if (!rawDate) {
    el.removeAttribute("data-raw-date");
    el.removeAttribute("data-include-time");
    el.removeAttribute("data-live-future");
    el.removeAttribute("datetime");
    if (el.textContent !== emptyText) {
      el.textContent = emptyText;
    }
    return;
  }

  el.setAttribute("data-raw-date", rawDate);
  if (includeTime !== undefined) {
    el.setAttribute("data-include-time", includeTime ? "true" : "false");
  } else {
    el.removeAttribute("data-include-time");
  }
  if (future) {
    el.setAttribute("data-live-future", "true");
  } else {
    el.removeAttribute("data-live-future");
  }

  const iso = toCaracasIsoString(rawDate, includeTime);
  if (iso) {
    el.setAttribute("datetime", iso);
  }

  updateLiveTimeElement(el, now);
}

export function refreshAllLiveTimes(
  root: Document | ParentNode = typeof document !== "undefined"
    ? document
    : (undefined as unknown as ParentNode),
  now: Date = new Date(),
): void {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll("[data-live-time]").forEach((el) => {
    updateLiveTimeElement(el, now);
  });
}

let activeIntervalId: number | undefined;
let activeVisibilityHandler: (() => void) | undefined;

export function initLiveTimestamps(): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  refreshAllLiveTimes(document);

  if (activeIntervalId !== undefined) {
    window.clearInterval(activeIntervalId);
  }
  if (activeVisibilityHandler) {
    document.removeEventListener("visibilitychange", activeVisibilityHandler);
  }

  activeIntervalId = window.setInterval(() => {
    if (document.visibilityState !== "hidden") {
      refreshAllLiveTimes(document);
    }
  }, TICK_INTERVAL_MS);

  activeVisibilityHandler = () => {
    if (document.visibilityState === "visible") {
      refreshAllLiveTimes(document);
    }
  };
  document.addEventListener("visibilitychange", activeVisibilityHandler);

  return () => {
    if (activeIntervalId !== undefined) {
      window.clearInterval(activeIntervalId);
      activeIntervalId = undefined;
    }
    if (activeVisibilityHandler) {
      document.removeEventListener("visibilitychange", activeVisibilityHandler);
      activeVisibilityHandler = undefined;
    }
  };
}
