export type RateDisplayMode = "current" | "next";

export interface RawRateRow {
  currency_id: number;
  currency_name: string;
  code: string;
  symbol: string;
  source: string;
  rate: number;
  date: string;
  rate_old: number | null;
  date_old: string | null;
}

export interface ResolvedRate {
  currencyId: number;
  currencyName: string;
  code: string;
  symbol: string;
  source: string;
  effectiveRate: number;
  effectiveDate: string;
  nextRate: number | null;
  nextDate: string | null;
  hasNextRate: boolean;
}

export interface HistoryPoint {
  rate: number;
  date: string;
}

export type HistorySeries = Record<number, HistoryPoint[]>;

export interface BrechaResult {
  bcvRate: number;
  usdtRate: number;
  differenceBs: number;
  percentage: number;
  amountUsd: number;
  bcvTotalBs: number;
  usdtTotalBs: number;
  impactBs: number;
}
