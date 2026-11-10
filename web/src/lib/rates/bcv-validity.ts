import { getCaracasDayStartMs } from "./caracas-date";
import type { RawRateRow, ResolvedRate } from "./types";

/**
 * Resolves the active effective rate and optional next "fecha valor" rate
 * following Cambio Rápido's BCV validity rule strictly in America/Caracas.
 */
export function resolveEffectiveRate(
  row: RawRateRow,
  now: Date = new Date(),
): ResolvedRate {
  const isBcv = row.source.trim().toUpperCase() === "BCV";
  const parsedRate = Number(row.rate) || 0;
  const parsedOldRate =
    row.rate_old !== null && row.rate_old !== undefined ? Number(row.rate_old) : null;

  if (isBcv && row.date_old && parsedOldRate !== null && Number.isFinite(parsedOldRate)) {
    const todayStart = getCaracasDayStartMs(now);
    const oldStart = getCaracasDayStartMs(row.date_old);

    if (todayStart <= oldStart) {
      const differsFromCurrent = parsedRate !== parsedOldRate;
      return {
        currencyId: row.currency_id,
        currencyName: row.currency_name,
        code: row.code,
        symbol: row.symbol,
        source: row.source,
        effectiveRate: parsedOldRate,
        effectiveDate: row.date_old,
        nextRate: differsFromCurrent ? parsedRate : null,
        nextDate: differsFromCurrent ? row.date : null,
        hasNextRate: differsFromCurrent,
      };
    }
  }

  return {
    currencyId: row.currency_id,
    currencyName: row.currency_name,
    code: row.code,
    symbol: row.symbol,
    source: row.source,
    effectiveRate: parsedRate,
    effectiveDate: row.date,
    nextRate: null,
    nextDate: null,
    hasNextRate: false,
  };
}
