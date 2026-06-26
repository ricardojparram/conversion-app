import type { Convertion } from '@/types/convertions';
import { getDatabase } from './db';
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabase';

export async function upsertRates(rates: Convertion[]): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem('cached_rates', JSON.stringify(rates));
    } catch (e) {
      if (__DEV__) console.error("localStorage error:", e);
    }
    return;
  }

  const db = await getDatabase();

  const statement = await db.prepareAsync(
    `INSERT OR REPLACE INTO rates (code, currency_id, currency_name, source, rate, date, rate_old, date_old, symbol)
     VALUES ($code, $currencyId, $currencyName, $source, $rate, $date, $rateOld, $dateOld, $symbol)`
  );

  try {
    for (const r of rates) {
      await statement.executeAsync({
        $code: r.code,
        $currencyId: r.currency_id,
        $currencyName: r.currency_name,
        $source: r.source,
        $rate: r.rate,
        $date: r.date,
        $rateOld: r.rate_old ?? null,
        $dateOld: r.date_old ?? null,
        $symbol: r.symbol,
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
}

export async function getLatestRates(): Promise<Convertion[]> {
  if (Platform.OS === 'web') {
    try {
      const cached = localStorage.getItem('cached_rates');
      if (cached) return JSON.parse(cached) as Convertion[];
    } catch (e) {
      if (__DEV__) console.error("localStorage error:", e);
    }
    return [];
  }

  const db = await getDatabase();

  return db.getAllAsync<Convertion>(
    `SELECT code, currency_id, currency_name, source, rate, date, rate_old, date_old, symbol
     FROM rates
     WHERE (currency_id, date) IN (
       SELECT currency_id, MAX(date) FROM rates GROUP BY currency_id
     )
     ORDER BY currency_id ASC`
  );
}

export async function syncAndCacheHistory(currencyId: number): Promise<{ rate: number; date: string }[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, date, rate_old, date_old')
    .eq('currency_id', currencyId)
    .order('date', { ascending: true });

  if (error) {
    console.error('[syncAndCacheHistory] Supabase error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(`cached_history_${currencyId}`, JSON.stringify(data));
    } catch (e) {
      console.error('[syncAndCacheHistory] localStorage error:', e);
    }
  } else {
    const db = await getDatabase();
    const meta = await db.getFirstAsync<{ code: string; currency_name: string; source: string; symbol: string }>(
      `SELECT code, currency_name, source, symbol FROM rates WHERE currency_id = $id LIMIT 1`,
      { $id: currencyId }
    );

    if (meta) {
      const statement = await db.prepareAsync(
        `INSERT OR REPLACE INTO rates (code, currency_id, currency_name, source, rate, date, rate_old, date_old, symbol)
         VALUES ($code, $currencyId, $currencyName, $source, $rate, $date, $rateOld, $dateOld, $symbol)`
      );
      try {
        for (const row of data) {
          await statement.executeAsync({
            $code: meta.code,
            $currencyId: currencyId,
            $currencyName: meta.currency_name,
            $source: meta.source,
            $rate: row.rate,
            $date: row.date,
            $rateOld: row.rate_old ?? null,
            $dateOld: row.date_old ?? null,
            $symbol: meta.symbol,
          });
        }
      } finally {
        await statement.finalizeAsync();
      }
    }
  }

  return data.map(r => ({ rate: r.rate, date: r.date }));
}

export async function getLocalRateHistory(
  currencyId: number,
  days: number
): Promise<{ rate: number; date: string }[]> {
  if (Platform.OS === 'web') {
    try {
      const cached = localStorage.getItem(`cached_history_${currencyId}`);
      if (cached) {
        const list = JSON.parse(cached) as { rate: number; date: string }[];
        return list.slice(-days);
      }
    } catch (e) {
      console.error('[getLocalRateHistory] localStorage read error:', e);
    }
    return [];
  }

  const db = await getDatabase();
  return db.getAllAsync<{ rate: number; date: string }>(
    `SELECT rate, date FROM rates
     WHERE currency_id = $id AND date >= date('now', $daysOffset)
     ORDER BY date ASC`,
    { $id: currencyId, $daysOffset: `-${days} days` }
  );
}
