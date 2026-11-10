import type { ResolvedRate } from "./types";

export interface FormatNumberOptions {
  suffix?: string;
  delimiter?: string;
  separator?: string;
  precision?: number;
}

/**
 * Formats numbers identically to utils/formatCurrency.ts in the mobile app.
 */
export function formatNumber(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const {
    suffix = "",
    delimiter = ".",
    separator = ",",
    precision = 2,
  } = options;

  const fixed = Math.abs(safeValue).toFixed(precision);
  const [intPart, decPart] = fixed.split(".");

  const withDelimiter = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, delimiter);

  const sign = safeValue < 0 ? "-" : "";
  const formatted =
    precision > 0
      ? `${sign}${withDelimiter}${separator}${decPart}`
      : `${sign}${withDelimiter}`;

  return `${formatted}${suffix}`;
}

export function formatCurrency(
  value: number,
  suffix: string,
  delimiter: string = ".",
  separator: string = ",",
  precision: number = 2,
): string {
  return formatNumber(value, {
    suffix: ` ${suffix}`,
    delimiter,
    separator,
    precision,
  });
}

export function getCurrencyDisplaySuffix(
  rate: Pick<ResolvedRate, "code" | "symbol" | "currencyName">,
): string {
  const code = rate.code.toUpperCase();
  if (code === "EUR" || rate.currencyName.toLowerCase().includes("euro")) return "€";
  if (code === "USDT" || rate.currencyName.toLowerCase().includes("usdt")) return "USDT";
  return rate.symbol || "$";
}

export function getCurrencyTargetLabel(
  rate: Pick<ResolvedRate, "code" | "currencyName">,
): string {
  const code = rate.code.toUpperCase();
  if (code === "EUR" || rate.currencyName.toLowerCase().includes("euro")) return "Euros";
  if (code === "USDT" || rate.currencyName.toLowerCase().includes("usdt")) return "USDT";
  return "Dólares";
}
