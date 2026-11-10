const DEFAULT_MAX_VALUE = 999999999999;

export function toCents(value: number | null, precision: number = 2): number {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 10 ** precision);
}

export function centsToNumber(cents: number, precision: number = 2): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / 10 ** precision;
}

/**
 * Cents-first right-to-left parser matching components/Currency.tsx.
 * Returns null if the resulting amount exceeds maxValue.
 */
export function parseDigitsToCents(
  rawText: string,
  maxValue: number = DEFAULT_MAX_VALUE,
  precision: number = 2,
): number | null {
  const digits = rawText.replace(/\D/g, "");
  const newCents = parseInt(digits, 10) || 0;
  const numericValue = centsToNumber(newCents, precision);
  if (numericValue > maxValue) return null;
  return newCents;
}

/**
 * Parses clipboard strings supporting Venezuelan ("1.001,19 Bs"), US ("1,250.75", "$ 25.50"),
 * and plain numbers ("100,5").
 */
export function parseClipboardAmount(text: string): number | null {
  const match = text.match(/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/);
  if (!match) return null;

  const token = match[0];
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");

  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator appears last acts as the decimal separator
    if (lastComma > lastDot) {
      normalized = token.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = token.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const commaCount = (token.match(/,/g) || []).length;
    normalized = commaCount > 1 ? token.replace(/,/g, "") : token.replace(",", ".");
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

export function convertAmount(
  amount: number,
  rate: number,
  direction: "bsToForeign" | "foreignToBs",
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0 || amount === 0) {
    return 0;
  }
  return direction === "bsToForeign" ? amount / rate : amount * rate;
}
