import type { BrechaResult } from "./types";

export function calculateBrecha(
  bcvRate: number,
  usdtRate: number,
  amountUsd: number = 100,
): BrechaResult {
  const safeBcv = Number.isFinite(bcvRate) && bcvRate > 0 ? bcvRate : 0;
  const safeUsdt = Number.isFinite(usdtRate) && usdtRate > 0 ? usdtRate : 0;
  const safeAmount = Number.isFinite(amountUsd) && amountUsd >= 0 ? amountUsd : 0;

  const differenceBs = safeUsdt - safeBcv;
  const percentage = safeBcv > 0 ? (differenceBs / safeBcv) * 100 : 0;
  const bcvTotalBs = safeAmount * safeBcv;
  const usdtTotalBs = safeAmount * safeUsdt;
  const impactBs = usdtTotalBs - bcvTotalBs;
  const impactUsdAtUsdt = safeUsdt > 0 ? impactBs / safeUsdt : 0;
  const impactUsdAtBcv = safeBcv > 0 ? impactBs / safeBcv : 0;

  return {
    bcvRate: safeBcv,
    usdtRate: safeUsdt,
    differenceBs,
    percentage,
    amountUsd: safeAmount,
    bcvTotalBs,
    usdtTotalBs,
    impactBs,
    impactUsdAtUsdt,
    impactUsdAtBcv,
  };
}
