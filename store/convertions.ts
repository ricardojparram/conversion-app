import { create } from "zustand";
import { Convertions, ConversionStore } from "@/types/convertions";
import { syncRates } from "@/database/sync.service";
import { getLatestRates } from "@/database/rates.repository";
import * as Network from 'expo-network';

export const convertionStore = create<ConversionStore>()((set, get) => ({
  convertions: [] as Convertions,
  isFetching: false,

  setConvertions: (convertions) => {
    set({ convertions });
  },

  fetchConvertions: async () => {
    set({ isFetching: true });

    // 1. Load from local database immediately (offline-first)
    try {
      const localRates = await getLatestRates();
      if (localRates && localRates.length > 0) {
        set({ convertions: localRates });
      }
    } catch (e) {
      console.error("Error loading local rates:", e);
    }

    // 2. Check network connection
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      // 3. If online, sync with Supabase
      if (networkState.isConnected) {
        const syncResult = await syncRates();
        if (syncResult.success && syncResult.rates) {
          set({ convertions: syncResult.rates });
        }
      }
    } catch (e) {
      console.error("Error syncing rates:", e);
    } finally {
      set({ isFetching: false });
    }
  },
}));
