import { supabase } from '@/utils/supabase';
import type { Convertion } from '@/types/convertions';
import { getDatabase } from './db';
import { upsertRates, getLatestRates } from './rates.repository';

import { Platform } from 'react-native';

export async function getLastSyncTime(): Promise<number | null> {
  if (Platform.OS === 'web') {
    try {
      const syncStr = localStorage.getItem('last_sync');
      return syncStr ? Number(syncStr) : null;
    } catch { return null; }
  }

  const db = await getDatabase();

  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = 'last_sync'`
  );

  return row ? Number(row.value) : null;
}

async function setLastSyncTime(timestamp: number): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem('last_sync', String(timestamp));
    } catch {}
    return;
  }

  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync', $timestamp)`,
    { $timestamp: String(timestamp) }
  );
}

export interface SyncResult {
  success: boolean;
  rates: Convertion[];
  error?: string;
}

export async function syncRates(): Promise<SyncResult> {
  try {
    const { data, error } = await supabase.rpc('get_latest_exchange_rates');

    if (error) {
      console.error('[syncRates] Supabase error:', error.message);

      const cached = await getLatestRates();
      return { success: false, rates: cached, error: error.message };
    }

    const rates = data as Convertion[];
    await upsertRates(rates);
    await setLastSyncTime(Date.now());

    const updatedRates = await getLatestRates();
    return { success: true, rates: updatedRates };
  } catch (e) {
    console.error('[syncRates] Network error:', e);

    const cached = await getLatestRates();
    const message = e instanceof Error ? e.message : 'Error de red desconocido';
    return { success: false, rates: cached, error: message };
  }
}
