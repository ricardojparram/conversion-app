export const CARACAS_TIMEZONE = "America/Caracas";
const CARACAS_OFFSET = "-04:00";

const HAS_EXPLICIT_TIMEZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

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
