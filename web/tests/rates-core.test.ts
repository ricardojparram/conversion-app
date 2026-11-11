import { describe, expect, it } from "vitest";
import {
  getCaracasDayKey,
  getCaracasDayStartMs,
  formatCaracasTimestamp,
  formatSimpleCaracasDate,
  hasExplicitCaracasTime,
  shouldIncludeTimeForRate,
  toCaracasIsoString,
  formatNaturalCaracasDateTime,
  formatNaturalFutureCaracasDate,
} from "@/lib/rates/caracas-date";
import { resolveEffectiveRate } from "@/lib/rates/bcv-validity";
import {
  formatNumber,
  formatCurrency,
  getCurrencyDisplaySuffix,
  getCurrencyTargetLabel,
} from "@/lib/rates/format";
import {
  toCents,
  centsToNumber,
  parseDigitsToCents,
  parseClipboardAmount,
  convertAmount,
} from "@/lib/rates/calculator";
import { calculateBrecha } from "@/lib/rates/brecha";
import type { RawRateRow } from "@/lib/rates/types";

describe("caracas-date", () => {
  it("converts UTC instant late at night to the matching Caracas calendar day", () => {
    // 2026-11-10 02:30 UTC === 2026-11-09 22:30 in America/Caracas (-04:00)
    expect(getCaracasDayKey("2026-11-10T02:30:00Z")).toBe("2026-11-09");
    expect(formatCaracasTimestamp("2026-11-10T02:30:00Z")).toBe(
      "09/11/26 10:30 PM",
    );
  });

  it("interprets Postgres timestamps without offset as Caracas local time regardless of host TZ", () => {
    expect(getCaracasDayKey("2026-11-09T22:15:04.246255")).toBe("2026-11-09");
    expect(getCaracasDayKey("2026-11-10T00:00:00")).toBe("2026-11-10");
    expect(formatCaracasTimestamp("2026-11-09T22:15:04.246255")).toBe(
      "09/11/26 10:15 PM",
    );
    expect(formatSimpleCaracasDate("2026-11-09T00:00:00")).toBe("09/11/26");
  });

  it("computes Caracas midnight epochs consistently for validity comparison", () => {
    const caracasNight = new Date("2026-11-10T02:30:00Z"); // 2026-11-09 22:30 Caracas
    const oldValidity = getCaracasDayStartMs("2026-11-09T00:00:00");
    const nextValidity = getCaracasDayStartMs("2026-11-10T00:00:00");

    expect(getCaracasDayStartMs(caracasNight)).toBe(oldValidity);
    expect(oldValidity).toBeLessThan(nextValidity);
  });

  it("distinguishes date-only BCV fecha valor from intraday Binance timestamps", () => {
    expect(hasExplicitCaracasTime("2026-11-11")).toBe(false);
    expect(hasExplicitCaracasTime("2026-11-11T00:00:00")).toBe(false);
    expect(hasExplicitCaracasTime("2026-11-11T04:00:00Z")).toBe(false);
    expect(hasExplicitCaracasTime("2026-11-11T00:00:01")).toBe(true);
    expect(hasExplicitCaracasTime("2026-11-11T10:30:00")).toBe(true);

    expect(
      shouldIncludeTimeForRate({
        source: "BCV",
        effectiveDate: "2026-11-11T00:00:00",
      }),
    ).toBe(false);
    expect(
      shouldIncludeTimeForRate({
        source: "Binance",
        effectiveDate: "2026-11-11T14:25:00",
      }),
    ).toBe(true);
    expect(
      shouldIncludeTimeForRate({
        source: "Binance",
        effectiveDate: "2026-11-11",
      }),
    ).toBe(false);

    expect(toCaracasIsoString("2026-11-11T00:00:00", false)).toBe("2026-11-11");
    expect(toCaracasIsoString("2026-11-11T10:30:00", true)).toBe(
      "2026-11-11T14:30:00.000Z",
    );
  });

  it("formats intraday timestamps naturally in Spanish across minutes, hours, today, yesterday, week, and older dates", () => {
    const now = "2026-11-11T15:30:00"; // Miércoles 11/11 3:30 p.m. Caracas

    expect(formatNaturalCaracasDateTime("2026-11-11T15:29:15", now)).toBe("ahora mismo");
    expect(formatNaturalCaracasDateTime("2026-11-11T15:30:40", now)).toBe("ahora mismo");
    expect(formatNaturalCaracasDateTime("2026-11-11T15:25:00", now)).toBe("hace 5 min");
    expect(formatNaturalCaracasDateTime("2026-11-11T14:30:00", now)).toBe("hace 1 h");
    expect(formatNaturalCaracasDateTime("2026-11-11T10:30:00", now)).toBe("hace 5 h");

    // 6+ hours earlier on the same day switches to "Hoy a la/las ..."
    expect(formatNaturalCaracasDateTime("2026-11-11T08:30:00", now)).toBe(
      "Hoy a las 8:30 a.m.",
    );
    expect(
      formatNaturalCaracasDateTime("2026-11-11T13:05:00", "2026-11-11T20:00:00"),
    ).toBe("Hoy a la 1:05 p.m.");
    expect(
      formatNaturalCaracasDateTime("2026-11-11T00:05:00", "2026-11-11T08:00:00"),
    ).toBe("Hoy a las 12:05 a.m.");

    // Cross-midnight within 60 min stays "hace X min"
    expect(
      formatNaturalCaracasDateTime("2026-11-10T23:55:00", "2026-11-11T00:05:00"),
    ).toBe("hace 10 min");

    // Yesterday, 2-6 days ago, and 7+ days ago
    expect(formatNaturalCaracasDateTime("2026-11-10T22:30:00", now)).toBe(
      "Ayer a las 10:30 p.m.",
    );
    expect(formatNaturalCaracasDateTime("2026-11-10T13:15:00", now)).toBe(
      "Ayer a la 1:15 p.m.",
    );
    expect(formatNaturalCaracasDateTime("2026-11-06T09:15:00", now)).toBe(
      "Viernes 6/11 a las 9:15 a.m.",
    );
    expect(formatNaturalCaracasDateTime("2026-11-02T16:30:00", now)).toBe(
      "02/11/26 4:30 p.m.",
    );
  });

  it("formats BCV date-only values without fake 12:00 a.m. clocks and formats upcoming BCV dates", () => {
    const now = "2026-11-11T15:30:00";

    expect(
      formatNaturalCaracasDateTime("2026-11-11T00:00:00", now, { includeTime: false }),
    ).toBe("Hoy");
    expect(formatNaturalCaracasDateTime("2026-11-10", now)).toBe("Ayer");
    expect(formatNaturalCaracasDateTime("2026-11-06T00:00:00", now)).toBe(
      "Viernes 6/11",
    );
    expect(formatNaturalCaracasDateTime("2026-11-02T00:00:00", now)).toBe("02/11/26");

    expect(formatNaturalFutureCaracasDate("2026-11-11T00:00:00", now)).toBe("hoy");
    expect(formatNaturalFutureCaracasDate("2026-11-12T00:00:00", now)).toBe(
      "mañana (12/11)",
    );
    expect(formatNaturalFutureCaracasDate("2026-11-16T00:00:00", now)).toBe(
      "el lunes 16/11",
    );
    expect(formatNaturalFutureCaracasDate("2026-11-20T00:00:00", now)).toBe(
      "el 20/11/26",
    );
  });
});

describe("bcv-validity", () => {
  const bcvEuroRow: RawRateRow = {
    currency_id: 2,
    currency_name: "BCV Euro",
    code: "EUR",
    symbol: "€",
    source: "BCV",
    rate: 1006.61,
    date: "2026-11-10T00:00:00",
    rate_old: 1001.19,
    date_old: "2026-11-09T00:00:00",
  };

  it("uses rate_old while Caracas date is still on or before date_old and exposes nextRate", () => {
    // 2026-11-09 22:15 Caracas (2026-11-10 02:15 UTC)
    const nowCaracasEvening = new Date("2026-11-10T02:15:00Z");
    const resolved = resolveEffectiveRate(bcvEuroRow, nowCaracasEvening);

    expect(resolved.effectiveRate).toBe(1001.19);
    expect(resolved.effectiveDate).toBe("2026-11-09T00:00:00");
    expect(resolved.hasNextRate).toBe(true);
    expect(resolved.nextRate).toBe(1006.61);
    expect(resolved.nextDate).toBe("2026-11-10T00:00:00");
  });

  it("switches to next rate once Caracas date passes date_old", () => {
    // 2026-11-10 00:05 Caracas (2026-11-10 04:05 UTC)
    const nowNextDay = new Date("2026-11-10T04:05:00Z");
    const resolved = resolveEffectiveRate(bcvEuroRow, nowNextDay);

    expect(resolved.effectiveRate).toBe(1006.61);
    expect(resolved.effectiveDate).toBe("2026-11-10T00:00:00");
    expect(resolved.hasNextRate).toBe(false);
    expect(resolved.nextRate).toBeNull();
  });

  it("always uses rate directly for non-BCV sources such as Binance USDT", () => {
    const usdtRow: RawRateRow = {
      currency_id: 3,
      currency_name: "USDT Venta",
      code: "USDT",
      symbol: "$",
      source: "Binance",
      rate: 1050.6,
      date: "2026-11-09T22:15:04.246255",
      rate_old: null,
      date_old: null,
    };

    const resolved = resolveEffectiveRate(usdtRow, new Date("2026-11-10T02:20:00Z"));
    expect(resolved.effectiveRate).toBe(1050.6);
    expect(resolved.hasNextRate).toBe(false);
  });
});

describe("format", () => {
  it("formats Venezuelan thousands dots, comma decimals and suffix", () => {
    expect(formatCurrency(1001.186, "Bs")).toBe("1.001,19 Bs");
    expect(formatCurrency(897.538, "Bs")).toBe("897,54 Bs");
    expect(formatNumber(12345.5)).toBe("12.345,50");
  });

  it("returns app-consistent prefix suffixes and target labels per currency code", () => {
    expect(
      getCurrencyDisplaySuffix({ code: "USD", symbol: "$", currencyName: "BCV Dólar" }),
    ).toBe("$");
    expect(
      getCurrencyDisplaySuffix({ code: "EUR", symbol: "€", currencyName: "BCV Euro" }),
    ).toBe("€");
    expect(
      getCurrencyDisplaySuffix({ code: "USDT", symbol: "$", currencyName: "USDT Venta" }),
    ).toBe("$");

    expect(getCurrencyTargetLabel({ code: "USD", currencyName: "BCV Dólar" })).toBe("Dólares");
    expect(getCurrencyTargetLabel({ code: "EUR", currencyName: "BCV Euro" })).toBe("Euros");
    expect(getCurrencyTargetLabel({ code: "USDT", currencyName: "USDT Venta" })).toBe("Dólares");
  });
});

describe("calculator", () => {
  it("handles cents-first conversion and digit parsing", () => {
    expect(toCents(23.5)).toBe(2350);
    expect(centsToNumber(2)).toBe(0.02);
    expect(parseDigitsToCents("2")).toBe(2);
    expect(parseDigitsToCents("2350")).toBe(2350);
    expect(parseDigitsToCents("abc")).toBe(0);
    expect(parseDigitsToCents("999999999999999", 999999999999)).toBeNull();
  });

  it("parses clipboard strings in both Venezuelan comma and dot decimal formats", () => {
    expect(parseClipboardAmount("1.001,19 Bs")).toBe(1001.19);
    expect(parseClipboardAmount("$ 25.50")).toBe(25.5);
    expect(parseClipboardAmount("100,5")).toBe(100.5);
    expect(parseClipboardAmount("1,250.75 USDT")).toBe(1250.75);
    expect(parseClipboardAmount("texto sin monto")).toBeNull();
  });

  it("converts amounts safely including zero-rate guard", () => {
    expect(convertAmount(10, 897.54, "foreignToBs")).toBeCloseTo(8975.4, 4);
    expect(convertAmount(897.54, 897.54, "bsToForeign")).toBeCloseTo(1, 6);
    expect(convertAmount(100, 0, "bsToForeign")).toBe(0);
    expect(convertAmount(100, 0, "foreignToBs")).toBe(0);
  });
});

describe("brecha", () => {
  it("calculates difference in Bs, percentage spread, and impact in Bs and $ for a reference amount", () => {
    const result = calculateBrecha(899.27, 1074.76, 100);
    expect(result.differenceBs).toBeCloseTo(175.49, 2);
    expect(result.percentage).toBeCloseTo(19.5147, 2);
    expect(result.bcvTotalBs).toBeCloseTo(89927, 2);
    expect(result.usdtTotalBs).toBeCloseTo(107476, 2);
    expect(result.impactBs).toBeCloseTo(17549, 2);
    expect(result.impactUsdAtUsdt).toBeCloseTo(17549 / 1074.76, 4);
    expect(result.impactUsdAtBcv).toBeCloseTo(17549 / 899.27, 4);

    const zeroResult = calculateBrecha(0, 0, 100);
    expect(zeroResult.impactUsdAtUsdt).toBe(0);
    expect(zeroResult.impactUsdAtBcv).toBe(0);
  });
});
