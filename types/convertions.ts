export interface Convertion {
  code: string;
  currency_id: number;
  currency_name: string;
  source: string;
  rate: number;
  date: string;
  rate_old: number;
  date_old: string;
  symbol: string;
}

export type Convertions = Convertion[];

export interface ConvertionList {
  bcv: number;
  paralelo: number;
  promedio: number;
}
export interface CalculatedConvertions {
  calculatedUSD: ConvertionList;
  calculatedBs: ConvertionList;
}

export interface ConversionStore {
  convertions: Convertions;
  isFetching: boolean;

  // Setters
  setConvertions: (convertions: Convertions) => void;

  // Methods
  fetchConvertions: () => Promise<void>;
}
