export const calculateConversions = (
  bs: number,
  usd: number,
  convertions: Record<string, any>,
): { calcUSD: Record<string, number>; calcBs: Record<string, number> } => {
  let calcUSD, calcBs, bcv, paralelo;
  if (usd === 0 && bs === 0) usd = 1;
  console.log(usd);
  if (usd > 0) {
    calcUSD = {
      bcv: usd,
      paralelo: usd,
      promedio: usd,
    };
    bcv = usd * convertions.bcv;
    paralelo = usd * convertions.paralelo;
    calcBs = {
      bcv,
      paralelo,
      promedio: (bcv + paralelo) / 2,
    };
  } else {
    calcBs = {
      bcv: bs,
      paralelo: bs,
      promedio: bs,
    };
    bcv = bs / convertions.bcv;
    paralelo = bs / convertions.paralelo;
    calcUSD = {
      bcv,
      paralelo,
      promedio: (bcv + paralelo) / 2,
    };
  }
  return { calcUSD, calcBs };
};
