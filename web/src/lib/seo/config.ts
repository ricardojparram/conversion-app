export type RouteKey =
  | "home"
  | "dolar-bcv"
  | "euro-bcv"
  | "usdt-binance"
  | "brecha-cambiaria"
  | "tendencias"
  | "preguntas-frecuentes"
  | "privacidad";

export interface PublicRouteConfig {
  key: RouteKey;
  path: string;
  label: string;
  changefreq: "hourly" | "daily" | "weekly" | "monthly";
  priority: string;
}

export const SITE_NAME = "Cambio rápido";
export const DEFAULT_SITE_URL = "https://cambiorapido.app";

export const NAV_ROUTES: Array<{ key: RouteKey; path: string; label: string }> = [
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

export function getSiteUrl(envSiteUrl?: string): string {
  const metaEnv = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env;
  const raw =
    envSiteUrl ??
    metaEnv?.PUBLIC_SITE_URL ??
    (typeof process !== "undefined" ? process.env.PUBLIC_SITE_URL : undefined) ??
    DEFAULT_SITE_URL;

  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : DEFAULT_SITE_URL;
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
