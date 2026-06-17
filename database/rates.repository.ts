import type { Convertion } from '@/types/convertions';
import { getDatabase } from './db';

export async function upsertRates(rates: Convertion[]): Promise<void> {
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
  const db = await getDatabase();

  return db.getAllAsync<Convertion>(
    `SELECT code, currency_id, currency_name, source, rate, date, rate_old, date_old, symbol
     FROM rates
     WHERE (source, date) IN (
       SELECT source, MAX(date) FROM rates GROUP BY source
     )`
  );
}

export async function getRateHistory(
  source: string,
  days: number
): Promise<{ rate: number; date: string }[]> {
  const db = await getDatabase();

  return db.getAllAsync<{ rate: number; date: string }>(
    `SELECT rate, date FROM rates
     WHERE source = $source AND date >= date('now', $daysOffset)
     ORDER BY date ASC`,
    { $source: source, $daysOffset: `-${days} days` }
  );
}
