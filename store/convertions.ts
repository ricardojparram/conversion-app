import { create } from "zustand";
import { persist, createJSONStorage, devtools } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/.env";
import { formatDate } from "@/utils/formatDate";
import { ApiResponse } from "@/types/apiTypes";
import { Convertions, ConversionStore } from "@/types/convertions";

export const convertionStore = create<ConversionStore>()(
  devtools(
    persist(
      (set, get) => ({
        API_URL: API_URL,
        convertions: {} as Convertions,
        isFetching: false,

        // Setters
        setConvertions: (convertions) => {
          set({ convertions });
        },

        // Methods
        fetchConvertions: async () => {
          if (!API_URL) {
            console.error("API_URL no está definido.");
            return;
          }
          const body = JSON.stringify({
            query: `
              query ($countryCode: String!) {
                getCountryConversions(payload: {countryCode: $countryCode}) {
                  conversionRates {
                    baseValue
                    official
                    principal
                    rateCurrency {
                      name
                      symbol
                    }
                  }
                  dateParalelo
                  dateBcv
                }
              }
            `,
            variables: {
              countryCode: "VE",
            },
          });
          set({ isFetching: true });
          const res: ApiResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Host: "api.alcambio.app",
            },
            body,
          })
            .then((response) => response.json())
            .catch((error) => console.error("Error:", error))
            .finally(() => set({ isFetching: false }));

          const { conversionRates, dateBcv, dateParalelo } =
            res.data.getCountryConversions;

          const allDollars = conversionRates.filter(
            (e) => e.rateCurrency.symbol === "$",
          );
          const currencies = allDollars.reduce(
            (acc, el) => {
              if (el.official) {
                acc.bcv = el.baseValue;
              } else {
                acc.paralelo = el.baseValue;
              }
              return acc;
            },
            { paralelo: 0, bcv: 0 } as Omit<
              Convertions,
              "dateBcv" | "dateParalelo"
            >,
          );

          set({
            convertions: {
              ...currencies,
              dateBcv: formatDate(dateBcv),
              dateParalelo: formatDate(dateParalelo),
            },
          });
        },
      }),
      {
        name: "authStore",
        storage: createJSONStorage(() => AsyncStorage),
      },
    ),
  ),
);
