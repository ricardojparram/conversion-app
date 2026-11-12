import type { Convertion } from "@/types/convertions";

const CARACAS_TIMEZONE = "America/Caracas";
const CARACAS_OFFSET = "-04:00";
const CARACAS_OFFSET_MS = -4 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const HAS_EXPLICIT_TIMEZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAIVE_ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

const SPANISH_WEEKDAYS: Record<string, string> = {
  Sun: "Domingo",
  Mon: "Lunes",
  Tue: "Martes",
  Wed: "Miércoles",
  Thu: "Jueves",
  Fri: "Viernes",
  Sat: "Sábado",
};

const WEEKDAY_NAMES_BY_UTC_DAY = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function createFormatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: CARACAS_TIMEZONE,
      ...options,
    });
  } catch {
    return null;
  }
}

const dayKeyFormatter = createFormatter({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const wallClock24Formatter = createFormatter({
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const naturalPartsFormatter = createFormatter({
  weekday: "short",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

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

function getCaracasWallParts(date: Date) {
  if (naturalPartsFormatter) {
    try {
      const parts = naturalPartsFormatter.formatToParts(date);
      const weekdayShort = getPart(parts, "weekday");
      const dd = getPart(parts, "day");
      const mm = getPart(parts, "month");
      const yy = getPart(parts, "year");
      const hourStr = getPart(parts, "hour");
      const minuteStr = getPart(parts, "minute");
      const periodRaw = getPart(parts, "dayPeriod").toUpperCase();

      if (dd && mm && yy && hourStr && minuteStr) {
        const hour12 = Number.parseInt(hourStr, 10) || 12;
        return {
          weekday: SPANISH_WEEKDAYS[weekdayShort] ?? weekdayShort,
          dd,
          mm,
          yy,
          dayNum: Number.parseInt(dd, 10),
          monthNum: Number.parseInt(mm, 10),
          hour12,
          minuteStr,
          period: periodRaw.includes("PM") || periodRaw.includes("P.") ? "p.m." : "a.m.",
        };
      }
    } catch {
      // Fallback below
    }
  }

  const shifted = new Date(date.getTime() + CARACAS_OFFSET_MS);
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(shifted.getUTCFullYear()).slice(-2);
  const hours24 = shifted.getUTCHours();
  const minuteStr = String(shifted.getUTCMinutes()).padStart(2, "0");
  const period = hours24 >= 12 ? "p.m." : "a.m.";
  const hour12 = hours24 % 12 || 12;

  return {
    weekday: WEEKDAY_NAMES_BY_UTC_DAY[shifted.getUTCDay()] ?? "",
    dd,
    mm,
    yy,
    dayNum: shifted.getUTCDate(),
    monthNum: shifted.getUTCMonth() + 1,
    hour12,
    minuteStr,
    period,
  };
}

export function getCaracasDayKey(input?: Date | string | number): string {
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Caracas date input: ${String(input)}`);
  }

  if (dayKeyFormatter) {
    try {
      const parts = dayKeyFormatter.formatToParts(date);
      const year = getPart(parts, "year");
      const month = getPart(parts, "month");
      const day = getPart(parts, "day");
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fallback below
    }
  }

  const shifted = new Date(date.getTime() + CARACAS_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCaracasDayStartMs(input?: Date | string | number): number {
  const dayKey = getCaracasDayKey(input);
  return Date.parse(`${dayKey}T00:00:00${CARACAS_OFFSET}`);
}

export function hasExplicitCaracasTime(input: Date | string | number): boolean {
  if (typeof input === "string" && DATE_ONLY_RE.test(input.trim())) {
    return false;
  }
  const date = parseCaracasInput(input);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getUTCMilliseconds() !== 0) return true;

  if (wallClock24Formatter) {
    try {
      const parts = wallClock24Formatter.formatToParts(date);
      const hour = getPart(parts, "hour");
      const minute = getPart(parts, "minute");
      const second = getPart(parts, "second");
      if (hour && minute && second) {
        return !(hour === "00" && minute === "00" && second === "00");
      }
    } catch {
      // Fallback below
    }
  }

  const shifted = new Date(date.getTime() + CARACAS_OFFSET_MS);
  return !(
    shifted.getUTCHours() === 0 &&
    shifted.getUTCMinutes() === 0 &&
    shifted.getUTCSeconds() === 0
  );
}

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

export function formatNaturalCaracasDateTime(
  input: Date | string | number,
  now: Date | string | number = new Date(),
  options: { includeTime?: boolean } = {},
): string {
  const target = parseCaracasInput(input);
  const refNow = parseCaracasInput(now);
  if (Number.isNaN(target.getTime()) || Number.isNaN(refNow.getTime())) {
    return typeof input === "string" ? input : "";
  }

  const hasTime = options.includeTime ?? hasExplicitCaracasTime(input);
  const {
    weekday,
    dd,
    mm,
    yy,
    dayNum,
    monthNum,
    hour12,
    minuteStr,
    period,
  } = getCaracasWallParts(target);

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

export function resolveEffectiveConvertion(
  row: Convertion,
  now: Date = new Date(),
): { effectiveRate: number; effectiveDate: string } {
  const isBcv = (row.source ?? "").trim().toUpperCase() === "BCV";
  const parsedRate = Number(row.rate) || 0;
  const parsedOldRate =
    row.rate_old !== null && row.rate_old !== undefined
      ? Number(row.rate_old)
      : null;

  if (
    isBcv &&
    row.date_old &&
    parsedOldRate !== null &&
    Number.isFinite(parsedOldRate)
  ) {
    try {
      const todayStart = getCaracasDayStartMs(now);
      const oldStart = getCaracasDayStartMs(row.date_old);
      if (todayStart <= oldStart) {
        return {
          effectiveRate: parsedOldRate,
          effectiveDate: row.date_old,
        };
      }
    } catch {
      // Fallback to primary rate
    }
  }

  return {
    effectiveRate: parsedRate,
    effectiveDate: row.date,
  };
}

export function getForeignCurrencyMeta(
  row?: Pick<Convertion, "code" | "symbol" | "currency_name"> | null,
): { suffix: string; targetLabel: string } {
  if (!row) {
    return { suffix: "$", targetLabel: "Dólares" };
  }
  const code = (row.code ?? "").toUpperCase();
  const name = (row.currency_name ?? "").toLowerCase();
  if (code === "EUR" || name.includes("euro")) {
    return {
      suffix: row.symbol || "€",
      targetLabel: "Euros",
    };
  }
  return {
    suffix: row.symbol || "$",
    targetLabel: "Dólares",
  };
}

export function parseClipboardAmount(text: string): number | null {
  const match = text.match(/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/);
  if (!match) return null;

  const token = match[0];
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = token.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = token.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const commaCount = (token.match(/,/g) || []).length;
    normalized =
      commaCount > 1 ? token.replace(/,/g, "") : token.replace(",", ".");
  } else if (lastDot !== -1) {
    const dotCount = (token.match(/\./g) || []).length;
    normalized = dotCount > 1 ? token.replace(/\./g, "") : token;
  } else {
    normalized = token;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed);
}
