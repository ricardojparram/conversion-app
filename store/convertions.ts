import { create } from "zustand";
import { Convertions, ConversionStore } from "@/types/convertions";
import { syncRates } from "@/database/sync.service";
import { getLatestRates, syncAndCacheHistory, getLocalRateHistory } from "@/database/rates.repository";

export const convertionStore = create<ConversionStore>()((set, get) => ({
  convertions: [] as Convertions,
  isFetching: false,
  rateHistory: {},
  isFetchingHistory: false,

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

    // 2. Sync with Supabase (try directly, fallback on error)
    try {
      const syncResult = await syncRates();
      if (syncResult.success && syncResult.rates) {
        set({ convertions: syncResult.rates });
      } else {
        throw new Error(syncResult.error || "Failed to sync rates");
      }
    } catch (e) {
      console.error("Error syncing rates:", e);
      throw e;
    } finally {
      set({ isFetching: false });
    }
  },

  fetchHistory: async (currencyId: number, days: number) => {
    set({ isFetchingHistory: true });

    // 1. First attempt loading from local SQLite immediately for instant UI response
    try {
      const localHistory = await getLocalRateHistory(currencyId, days);
      if (localHistory && localHistory.length > 0) {
        set((state) => ({
          rateHistory: {
            ...state.rateHistory,
            [currencyId]: localHistory,
          },
        }));
      }
    } catch (e) {
      console.error("Error loading local rate history:", e);
    }

    // 2. Sync fresh history from Supabase directly
    try {
      const freshHistory = await syncAndCacheHistory(currencyId, 30);
      // Take last "days" points to fit filters
      const filteredHistory = freshHistory.slice(-days);
      set((state) => ({
        rateHistory: {
          ...state.rateHistory,
          [currencyId]: filteredHistory,
        },
      }));
    } catch (e) {
      console.warn("Could not sync fresh history, using cached data:", e);
    } finally {
      set({ isFetchingHistory: false });
    }
  },
}));
