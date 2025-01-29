import { Convertions, ConvertionList } from "@/types/convertions";
export const calculateConversions = (
  bs: number,
  usd: number,
  convertions: Convertions,
) => {
  let calculatedUSD: ConvertionList,
    calculatedBs: ConvertionList,
    bcv: number,
    paralelo: number;
  if (usd === 0 && bs === 0) usd = 1;
  if (usd > 0) {
    calculatedUSD = {
      bcv: usd,
      paralelo: usd,
      promedio: usd,
    };
    bcv = usd * convertions.bcv;
    paralelo = usd * convertions.paralelo;
    calculatedBs = {
      bcv,
      paralelo,
      promedio: (bcv + paralelo) / 2,
    };
  } else {
    calculatedBs = {
      bcv: bs,
      paralelo: bs,
      promedio: bs,
    };
    bcv = bs / convertions.bcv;
    paralelo = bs / convertions.paralelo;
    calculatedUSD = {
      bcv,
      paralelo,
      promedio: (bcv + paralelo) / 2,
    };
  }
  return { calculatedUSD, calculatedBs };
};
