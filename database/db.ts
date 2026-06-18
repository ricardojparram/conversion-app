import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'cambio_rapido_v3.db';

const migrations: string[] = [
  `CREATE TABLE IF NOT EXISTS rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    currency_id INTEGER NOT NULL,
    currency_name TEXT NOT NULL,
    source TEXT NOT NULL,
    rate REAL NOT NULL,
    date TEXT NOT NULL,
    rate_old REAL,
    date_old TEXT,
    symbol TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(currency_id, date)
  );`,
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite not supported on Web in this app, using localStorage instead.');
  }
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');

  for (const migration of migrations) {
    await db.execAsync(migration);
  }

  dbInstance = db;
  return db;
}
