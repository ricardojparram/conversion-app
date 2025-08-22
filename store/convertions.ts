import { create } from "zustand";
import { persist, createJSONStorage, devtools } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatDate } from "@/utils/formatDate";
import { ApiResponse } from "@/types/apiTypes";
import { Convertions, ConversionStore } from "@/types/convertions";
import { supabase } from "@/utils/supabase";

export const convertionStore = create<ConversionStore>()(
  devtools(
    persist(
      (set, get) => ({
        convertions: [] as Convertions,
        isFetching: false,

        // Setters
        setConvertions: (convertions) => {
          set({ convertions });
        },

        // Methods
        fetchConvertions: async () => {
          set({ isFetching: true });
          let { data, error } = await supabase
            .rpc('get_latest_exchange_rates')

          if (error) {
            console.error(error)
            set({ isFetching: false });
            throw new Error("Error fetching convertions");
          }
          set({ isFetching: false, convertions: data as Convertions });

        },
      }),
      {
        name: "convertions",
        storage: createJSONStorage(() => AsyncStorage),
      },
    ),
  ),
);
