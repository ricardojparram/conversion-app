export interface Convertions {
  bcv: number;
  paralelo: number;
  dateBcv: string;
  dateParalelo: string;
}

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
  API_URL: string;
  convertions: Convertions;
  isFetching: boolean;

  // Setters
  setConvertions: (convertions: Convertions) => void;

  // Methods
  fetchConvertions: () => Promise<void>;
}
