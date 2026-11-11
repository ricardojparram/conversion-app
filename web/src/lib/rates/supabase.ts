import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveEffectiveRate } from "./bcv-validity";
import { parseCaracasInput } from "./caracas-date";
import type { RawRateRow, ResolvedRate } from "./types";

export interface RpcInvoker {
  rpc(fnName: string): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export interface RatesSnapshotResult {
  ok: boolean;
  rates: ResolvedRate[];
  updatedAtIso: string | null;
  error?: string;
}

let cachedDotenvVars: Record<string, string> | null = null;

function readMonorepoDotenvFallback(): Record<string, string> {
  if (cachedDotenvVars) return cachedDotenvVars;
  const loaded: Record<string, string> = {};
  try {
    if (
      typeof process === "undefined" ||
      typeof process.versions?.node !== "string" ||
      process.env.VITEST
    ) {
      cachedDotenvVars = loaded;
      return loaded;
    }

    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
      path.resolve(cwd, "..", ".env.local"),
      path.resolve(cwd, "..", ".env"),
    ];
    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, "utf-8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx <= 0) continue;
        const k = trimmed.slice(0, eqIdx).trim();
        let v = trimmed.slice(eqIdx + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!loaded[k] && v.length > 0) {
          loaded[k] = v;
        }
      }
    }
  } catch {
    // Non-Node or restricted FS environment: rely strictly on runtime env vars
  }
  cachedDotenvVars = loaded;
  return loaded;
}

function readEnvVar(keys: string[]): string | undefined {
  const metaEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  for (const key of keys) {
    const val = metaEnv?.[key] ?? process.env[key];
    if (val && val.trim().length > 0) return val.trim();
  }
  const fallback = readMonorepoDotenvFallback();
  for (const key of keys) {
    const val = fallback[key];
    if (val && val.trim().length > 0) return val.trim();
  }
  return undefined;
}

export function resolveSupabaseCredentials(): {
  url: string | undefined;
  key: string | undefined;
} {
  return {
    url: readEnvVar([
      "SUPABASE_URL",
      "PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_URL",
    ]),
    key: readEnvVar([
      "SUPABASE_KEY",
      "SUPABASE_ANON_KEY",
      "PUBLIC_SUPABASE_KEY",
      "EXPO_PUBLIC_SUPABASE_KEY",
    ]),
  };
}

export function getServerSupabaseClient(
  timeoutMs: number = 3000,
): SupabaseClient | null {
  const { url, key } = resolveSupabaseCredentials();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
        return fetch(input, { ...init, signal });
      },
    },
  });
}

export async function fetchLatestRatesSnapshot(
  client?: RpcInvoker | null,
  now: Date = new Date(),
): Promise<RatesSnapshotResult> {
  const rpcClient = client === undefined ? getServerSupabaseClient(3000) : client;
  if (!rpcClient) {
    return {
      ok: false,
      rates: [],
      updatedAtIso: null,
      error: "Supabase credentials are not configured",
    };
  }

  try {
    const { data, error } = await rpcClient.rpc("get_latest_exchange_rates");
    if (error) {
      console.warn("[fetchLatestRatesSnapshot] RPC error:", error.message);
      return { ok: false, rates: [], updatedAtIso: null, error: error.message };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        ok: false,
        rates: [],
        updatedAtIso: null,
        error: "Empty rates payload received",
      };
    }

    const rows = data as RawRateRow[];
    const resolved = rows
      .map((row) => resolveEffectiveRate(row, now))
      .sort((a, b) => a.currencyId - b.currencyId);

    const timestamps = rows
      .map((row) => parseCaracasInput(row.date).getTime())
      .filter((ms) => Number.isFinite(ms));

    const updatedAtIso =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toISOString()
        : null;

    return {
      ok: true,
      rates: resolved,
      updatedAtIso,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    console.warn("[fetchLatestRatesSnapshot] Request failed:", message);
    return {
      ok: false,
      rates: [],
      updatedAtIso: null,
      error: message,
    };
  }
}
