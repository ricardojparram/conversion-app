export interface RateCurrency {
  name: string;
  symbol: string;
}

export interface ConversionRate {
  baseValue: number;
  official: boolean;
  principal: boolean;
  rateCurrency: RateCurrency;
}

export interface GetCountryConversions {
  conversionRates: ConversionRate[];
  dateParalelo: number;
  dateBcv: number;
}

export interface Data {
  getCountryConversions: GetCountryConversions;
}

export interface ApiResponse {
  data: Data;
}
