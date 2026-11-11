export const CARACAS_TIMEZONE = "America/Caracas";
const CARACAS_OFFSET = "-04:00";
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const HAS_EXPLICIT_TIMEZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

const SPANISH_WEEKDAYS: Record<string, string> = {
  Sun: "Domingo",
  Mon: "Lunes",
  Tue: "Martes",
  Wed: "Miércoles",
  Thu: "Jueves",
  Fri: "Viernes",
  Sat: "Sábado",
};

/**
 * Normalizes date inputs into a deterministic Date instant under America/Caracas (-04:00).
 *
 * Supabase stores `exchange_rates.date` as `timestamp without time zone` in Caracas wall time
 * (e.g. "2026-11-09T22:15:04.246255"). On UTC runtimes like Vercel SSR, naive strings would
 * otherwise be interpreted as UTC and shifted -4h again when formatting to America/Caracas.
 */
export function parseCaracasInput(input?: Date | string | number): Date {
  if (input === undefined) return new Date();
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === "number") return new Date(input);

  const trimmed = input.trim();
  if (DATE_ONLY_RE.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00${CARACAS_OFFSET}`);
  }
  if (!HAS_EXPLICIT_TIMEZONE_RE.test(trimmed) && NAIVE_ISO_DATETIME_RE.test(trimmed)) {
    const normalized = trimmed.replace(" ", "T");
    return new Date(`${normalized}${CARACAS_OFFSET}`);
  }
  return new Date(trimmed);
}

const dayKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CARACAS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CARACAS_TIMEZONE,
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const wallClock24Formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CARACAS_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const naturalPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CARACAS_TIMEZONE,
  weekday: "short",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDateFormatter = new Intl.DateTimeFormat("es-VE", {
  timeZone: CARACAS_TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * Returns YYYY-MM-DD in America/Caracas timezone.
 */
export function getCaracasDayKey(input?: Date | string | number): string {
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Caracas date input: ${String(input)}`);
  }
  const parts = dayKeyFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  return `${year}-${month}-${day}`;
}

/**
 * Returns Unix epoch milliseconds for 00:00:00-04:00 of the Caracas calendar day.
 */
export function getCaracasDayStartMs(input?: Date | string | number): number {
  const dayKey = getCaracasDayKey(input);
  return Date.parse(`${dayKey}T00:00:00${CARACAS_OFFSET}`);
}

/**
 * Formats timestamp as "dd/mm/aa h:mm AM/PM" in America/Caracas, matching utils/formatDate.ts.
 */
export function formatCaracasTimestamp(input: Date | string | number): string {
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("El timestamp debe ser una fecha válida.");
  }
  const parts = timestampFormatter.formatToParts(date);
  const day = getPart(parts, "day");
  const month = getPart(parts, "month");
  const year = getPart(parts, "year");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const dayPeriod = getPart(parts, "dayPeriod").toUpperCase();

  return `${day}/${month}/${year} ${hour}:${minute} ${dayPeriod}`;
}

/**
 * Formats date string as "dd/mm/aa" in America/Caracas.
 */
export function formatSimpleCaracasDate(dateStr: string): string {
  try {
    const dayKey = getCaracasDayKey(dateStr);
    const [year, month, day] = dayKey.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats human-readable Spanish date in America/Caracas (e.g. "9 de noviembre de 2026").
 */
export function formatLongCaracasDate(input?: Date | string | number): string {
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) return "";
  return longDateFormatter.format(date);
}

/**
 * Detects whether an input represents a real intraday timestamp rather than a midnight/date-only value.
 */
export function hasExplicitCaracasTime(input: Date | string | number): boolean {
  if (typeof input === "string" && DATE_ONLY_RE.test(input.trim())) {
    return false;
  }
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getUTCMilliseconds() !== 0) return true;

  const parts = wallClock24Formatter.formatToParts(date);
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");
  return !(hour === "00" && minute === "00" && second === "00");
}

/**
 * Determines whether a resolved rate carries a live intraday clock vs a date-only BCV "fecha valor".
 */
export function shouldIncludeTimeForRate(
  rate: { source?: string; effectiveDate?: string } | null | undefined,
): boolean {
  if (!rate) return false;
  if ((rate.source ?? "").trim().toUpperCase() === "BCV") {
    return false;
  }
  const rawDate = (rate.effectiveDate ?? "").trim();
  if (!rawDate) return false;
  return !DATE_ONLY_RE.test(rawDate);
}

/**
 * Produces a valid HTML <time datetime="..."> attribute value in ISO-8601 or YYYY-MM-DD.
 */
export function toCaracasIsoString(
  input: Date | string | number,
  includeTime?: boolean,
): string {
  const resolveTime = includeTime ?? hasExplicitCaracasTime(input);
  if (!resolveTime) {
    try {
      return getCaracasDayKey(input);
    } catch {
      return typeof input === "string" ? input : "";
    }
  }
  const date = parseCaracasInput(input);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export interface NaturalCaracasDateOptions {
  includeTime?: boolean;
}

/**
 * Formats a Caracas timestamp or date-only value in concise natural Spanish:
 * - Intraday (< 1 min): "ahora mismo"
 * - Intraday (1-59 min): "hace X min"
 * - Intraday (1-5 h, same Caracas day): "hace X h"
 * - Intraday (6+ h, same Caracas day): "Hoy a la 1:05 p.m." / "Hoy a las 8:30 a.m."
 * - Yesterday: "Ayer a la/las ..." (or "Ayer" when date-only)
 * - 2-6 days ago: "Viernes 6/11 a las ..." (or "Viernes 6/11" when date-only)
 * - 7+ days ago: "02/11/26 4:30 p.m." (or "02/11/26" when date-only)
 */
export function formatNaturalCaracasDateTime(
  input: Date | string | number,
  now: Date | string | number = new Date(),
  options: NaturalCaracasDateOptions = {},
): string {
  const target = parseCaracasInput(input);
  const refNow = parseCaracasInput(now);
  if (Number.isNaN(target.getTime()) || Number.isNaN(refNow.getTime())) {
    return typeof input === "string" ? input : "";
  }

  const hasTime = options.includeTime ?? hasExplicitCaracasTime(input);
  const parts = naturalPartsFormatter.formatToParts(target);
  const weekdayShort = getPart(parts, "weekday");
  const weekday = SPANISH_WEEKDAYS[weekdayShort] ?? weekdayShort;
  const dd = getPart(parts, "day");
  const mm = getPart(parts, "month");
  const yy = getPart(parts, "year");
  const dayNum = Number.parseInt(dd, 10);
  const monthNum = Number.parseInt(mm, 10);

  const hourStr = getPart(parts, "hour");
  const minuteStr = getPart(parts, "minute");
  const hour12 = Number.parseInt(hourStr, 10);
  const periodRaw = getPart(parts, "dayPeriod").toUpperCase();
  const period = periodRaw === "PM" ? "p.m." : "a.m.";
  const timeStr = `${hour12}:${minuteStr} ${period}`;
  const preposition = hour12 === 1 ? "a la" : "a las";

  const dayDiff = Math.round(
    (getCaracasDayStartMs(refNow) - getCaracasDayStartMs(target)) / DAY_MS,
  );

  if (!hasTime) {
    if (dayDiff === 0) return "Hoy";
    if (dayDiff === 1) return "Ayer";
    if (dayDiff >= 2 && dayDiff <= 6) return `${weekday} ${dayNum}/${monthNum}`;
    return `${dd}/${mm}/${yy}`;
  }

  const elapsedMs = refNow.getTime() - target.getTime();
  if (elapsedMs >= -MINUTE_MS && elapsedMs < MINUTE_MS) {
    return "ahora mismo";
  }

  if (elapsedMs >= MINUTE_MS && elapsedMs < HOUR_MS) {
    const mins = Math.floor(elapsedMs / MINUTE_MS);
    return `hace ${mins} min`;
  }

  if (dayDiff === 0) {
    if (elapsedMs >= HOUR_MS) {
      const hours = Math.floor(elapsedMs / HOUR_MS);
      if (hours < 6) {
        return `hace ${hours} h`;
      }
    }
    return `Hoy ${preposition} ${timeStr}`;
  }

  if (dayDiff === 1) {
    return `Ayer ${preposition} ${timeStr}`;
  }

  if (dayDiff >= 2 && dayDiff <= 6) {
    return `${weekday} ${dayNum}/${monthNum} ${preposition} ${timeStr}`;
  }

  return `${dd}/${mm}/${yy} ${timeStr}`;
}

/**
 * Formats an upcoming Caracas date (e.g. next BCV "fecha valor") for prose such as
 * "entra en vigencia {result} automáticamente".
 */
export function formatNaturalFutureCaracasDate(
  input: Date | string | number,
  now: Date | string | number = new Date(),
): string {
  const target = parseCaracasInput(input);
  const refNow = parseCaracasInput(now);
  if (Number.isNaN(target.getTime()) || Number.isNaN(refNow.getTime())) {
    return typeof input === "string" ? input : "";
  }

  const parts = naturalPartsFormatter.formatToParts(target);
  const weekdayShort = getPart(parts, "weekday");
  const weekday = (SPANISH_WEEKDAYS[weekdayShort] ?? weekdayShort).toLowerCase();
  const dd = getPart(parts, "day");
  const mm = getPart(parts, "month");
  const yy = getPart(parts, "year");
  const dayNum = Number.parseInt(dd, 10);
  const monthNum = Number.parseInt(mm, 10);

  const dayDiff = Math.round(
    (getCaracasDayStartMs(target) - getCaracasDayStartMs(refNow)) / DAY_MS,
  );

  if (dayDiff === 0) return "hoy";
  if (dayDiff === 1) return `mañana (${dayNum}/${monthNum})`;
  if (dayDiff >= 2 && dayDiff <= 6) return `el ${weekday} ${dayNum}/${monthNum}`;
  return `el ${dd}/${mm}/${yy}`;
}
