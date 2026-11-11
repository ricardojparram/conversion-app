export type RouteKey =
  | "home"
  | "dolar-bcv"
  | "euro-bcv"
  | "usdt-binance"
  | "brecha-cambiaria"
  | "tendencias"
  | "preguntas-frecuentes"
  | "privacidad"
  | "not-found";

export interface PublicRouteConfig {
  key: Exclude<RouteKey, "not-found">;
  path: string;
  label: string;
  changefreq: "hourly" | "daily" | "weekly" | "monthly";
  priority: string;
}

export const SITE_NAME = "Cambio rápido";
export const DEFAULT_SITE_URL = "https://cambiorapido.app";

export const NAV_ROUTES: Array<{ key: PublicRouteConfig["key"]; path: string; label: string }> = [
  { key: "home", path: "/", label: "Calculadora" },
  { key: "dolar-bcv", path: "/dolar-bcv", label: "Dólar BCV" },
  { key: "euro-bcv", path: "/euro-bcv", label: "Euro BCV" },
  { key: "usdt-binance", path: "/usdt-binance", label: "USDT Binance" },
  { key: "brecha-cambiaria", path: "/brecha-cambiaria", label: "Brecha" },
  { key: "tendencias", path: "/tendencias", label: "Tendencias" },
];

export const PUBLIC_ROUTES: PublicRouteConfig[] = [
  { key: "home", path: "/", label: "Calculadora", changefreq: "hourly", priority: "1.0" },
  { key: "dolar-bcv", path: "/dolar-bcv", label: "Dólar BCV", changefreq: "hourly", priority: "0.9" },
  { key: "euro-bcv", path: "/euro-bcv", label: "Euro BCV", changefreq: "hourly", priority: "0.9" },
  { key: "usdt-binance", path: "/usdt-binance", label: "USDT Binance", changefreq: "hourly", priority: "0.9" },
  {
    key: "brecha-cambiaria",
    path: "/brecha-cambiaria",
    label: "Brecha cambiaria",
    changefreq: "hourly",
    priority: "0.8",
  },
  {
    key: "tendencias",
    path: "/tendencias",
    label: "Tendencias",
    changefreq: "daily",
    priority: "0.8",
  },
  {
    key: "preguntas-frecuentes",
    path: "/preguntas-frecuentes",
    label: "Preguntas Frecuentes",
    changefreq: "weekly",
    priority: "0.6",
  },
  {
    key: "privacidad",
    path: "/privacidad",
    label: "Aviso Legal y Privacidad",
    changefreq: "monthly",
    priority: "0.3",
  },
];

function readRuntimeEnv(key: string): string | undefined {
  const procVal = typeof process !== "undefined" ? process.env[key] : undefined;
  if (procVal && procVal.trim().length > 0) return procVal.trim();
  const metaEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  const metaVal = metaEnv?.[key];
  if (metaVal && metaVal.trim().length > 0) return metaVal.trim();
  return undefined;
}

function normalizeOrigin(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSiteUrl(envSiteUrl?: string): string {
  const explicit = normalizeOrigin(envSiteUrl);
  if (explicit) return explicit;

  const publicSiteUrl = normalizeOrigin(readRuntimeEnv("PUBLIC_SITE_URL"));
  if (publicSiteUrl) return publicSiteUrl;

  const vercelEnv = readRuntimeEnv("VERCEL_ENV");
  const vercelProdUrl = normalizeOrigin(readRuntimeEnv("VERCEL_PROJECT_PRODUCTION_URL"));
  const vercelUrl = normalizeOrigin(readRuntimeEnv("VERCEL_URL"));

  if (vercelEnv === "preview" && vercelUrl) {
    return vercelUrl;
  }
  if (vercelProdUrl) {
    return vercelProdUrl;
  }
  if (vercelUrl) {
    return vercelUrl;
  }

  return DEFAULT_SITE_URL;
}

export function getSiteHostname(siteUrl?: string): string {
  try {
    return new URL(getSiteUrl(siteUrl)).hostname.toLowerCase();
  } catch {
    return "cambiorapido.app";
  }
}

export function isIndexableDeployment(options?: {
  siteUrl?: string;
  indexableEnv?: string;
  vercelEnv?: string;
}): boolean {
  const rawOverride = (options?.indexableEnv ?? readRuntimeEnv("PUBLIC_INDEXABLE"))?.toLowerCase();
  if (rawOverride === "true" || rawOverride === "1") return true;
  if (rawOverride === "false" || rawOverride === "0") return false;

  const vercelEnv = (options?.vercelEnv ?? readRuntimeEnv("VERCEL_ENV"))?.toLowerCase();
  if (vercelEnv === "preview" || vercelEnv === "development") {
    return false;
  }

  const host = getSiteHostname(options?.siteUrl);
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".local")
  ) {
    return false;
  }

  return true;
}

export function getGoogleSiteVerification(): string | null {
  return readRuntimeEnv("PUBLIC_GOOGLE_SITE_VERIFICATION") ?? null;
}

export function getContactEmail(): string | null {
  return readRuntimeEnv("PUBLIC_CONTACT_EMAIL") ?? null;
}

export function buildCanonicalUrl(pathname: string, siteUrl?: string): string {
  const base = getSiteUrl(siteUrl);
  const rawPath = pathname.trim();
  if (rawPath === "" || rawPath === "/") {
    return `${base}/`;
  }
  const normalized = `/${rawPath.replace(/^\/+|\/+$/g, "")}`;
  return `${base}${normalized}`;
}
