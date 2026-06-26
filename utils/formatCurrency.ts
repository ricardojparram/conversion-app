/**
 * Lightweight currency formatting utilities.
 *
 * Uses plain string manipulation instead of Intl.NumberFormat to guarantee
 * consistent locale-agnostic formatting across all RN engines (Hermes, JSC, V8)
 * and web.  The helpers honour the same `delimiter` / `separator` / `precision`
 * contract that the old react-native-currency-input library exposed.
 */

interface FormatNumberOptions {
  suffix?: string;
  delimiter?: string;
  separator?: string;
  precision?: number;
}

/**
 * Format a numeric value into a human-readable currency string.
 *
 * @example
 * formatNumber(1234.5, { suffix: ' Bs', delimiter: '.', separator: ',', precision: 2 })
 * // → "1.234,50 Bs"
 */
export function formatNumber(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const {
    suffix = "",
    delimiter = ".",
    separator = ",",
    precision = 2,
  } = options;

  const fixed = Math.abs(value).toFixed(precision);
  const [intPart, decPart] = fixed.split(".");

  // Add thousands delimiter
  const withDelimiter = intPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    delimiter,
  );

  const sign = value < 0 ? "-" : "";
  const formatted =
    precision > 0
      ? `${sign}${withDelimiter}${separator}${decPart}`
      : `${sign}${withDelimiter}`;

  return `${formatted}${suffix}`;
}

/**
 * Convenience wrapper that matches the old `formatCurrency` call-site API.
 */
export const formatCurrency = (
  val: number,
  suffix: string,
  delimiter: string = ".",
  separator: string = ",",
  precision: number = 2,
): string =>
  formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
  });