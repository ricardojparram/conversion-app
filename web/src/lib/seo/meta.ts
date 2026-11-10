import { calculateBrecha } from "@/lib/rates/brecha";
import { formatNumber } from "@/lib/rates/format";
import type { ResolvedRate } from "@/lib/rates/types";
import { buildCanonicalUrl, getSiteUrl, PUBLIC_ROUTES, SITE_NAME, type RouteKey } from "./config";

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: "website" | "article";
  robots: string;
  routeKey: RouteKey;
}

function findRate(rates: ResolvedRate[], currencyId: number): number | null {
  const match = rates.find((r) => r.currencyId === currencyId);
  return match && match.effectiveRate > 0 ? match.effectiveRate : null;
}

export function buildPageMeta(
  routeKey: RouteKey,
  rates: ResolvedRate[] = [],
  siteUrl?: string,
): PageMeta {
  const base = getSiteUrl(siteUrl);
  const route = PUBLIC_ROUTES.find((r) => r.key === routeKey) ?? PUBLIC_ROUTES[0];
  const canonical = buildCanonicalUrl(route.path, base);
  const ogImage = `${base}/og-image.png`;

  const usdBcv = findRate(rates, 1);
  const eurBcv = findRate(rates, 2);
  const usdtSell = findRate(rates, 3);
  const usdtBuy = findRate(rates, 4);

  let title: string;
  let description: string;
  let ogType: "website" | "article" = "website";

  switch (routeKey) {
    case "dolar-bcv": {
      const rateText = usdBcv !== null ? `${formatNumber(usdBcv)} Bs` : null;
      title = rateText
        ? `Dólar BCV hoy: ${rateText} — Calculadora | ${SITE_NAME}`
        : `Dólar BCV hoy y Calculadora USD a Bolívares | ${SITE_NAME}`;
      description = rateText
        ? `Tasa oficial Dólar BCV vigente hoy: ${rateText}. Convierte dólares a bolívares al instante, revisa próxima fecha valor, tabla de equivalencias y tendencia.`
        : `Consulta el precio oficial del Dólar BCV hoy en Venezuela, calcula montos de dólares a bolívares, revisa fecha valor e historial reciente.`;
      break;
    }
    case "euro-bcv": {
      const rateText = eurBcv !== null ? `${formatNumber(eurBcv)} Bs` : null;
      title = rateText
        ? `Euro BCV hoy: ${rateText} — Calculadora EUR a Bs | ${SITE_NAME}`
        : `Euro BCV hoy y Calculadora de Euros a Bolívares | ${SITE_NAME}`;
      description = rateText
        ? `Tipo de cambio Euro BCV vigente hoy: ${rateText}. Calcula euros (€) a bolívares (Bs) exactos, consulta tabla de montos y variación de los últimos 7 días.`
        : `Consulta la tasa oficial del Euro BCV hoy en Venezuela y convierte euros a bolívares con nuestra calculadora rápida y tabla de montos.`;
      break;
    }
    case "usdt-binance": {
      const rateText = usdtSell !== null ? `${formatNumber(usdtSell)} Bs` : null;
      const buyText = usdtBuy !== null ? `${formatNumber(usdtBuy)} Bs` : null;
      title = rateText
        ? `USDT Binance hoy: ${rateText} — Calculadora P2P | ${SITE_NAME}`
        : `USDT Binance hoy y Calculadora USDT a Bolívares | ${SITE_NAME}`;
      description =
        rateText && buyText
          ? `Referencia Binance P2P en Venezuela hoy: USDT Venta ${rateText} y Compra ${buyText}. Calcula bolívares a USDT al instante y compara con BCV.`
          : `Calcula USDT a bolívares al instante con tasas promedio Binance P2P (Compra y Venta) actualizadas constantemente en hora de Caracas.`;
      break;
    }
    case "brecha-cambiaria": {
      if (usdBcv !== null && usdtSell !== null) {
        const brecha = calculateBrecha(usdBcv, usdtSell, 100);
        const pct = formatNumber(brecha.percentage);
        const diff = formatNumber(brecha.differenceBs);
        title = `Brecha cambiaria hoy: ${pct}% (BCV vs USDT) | ${SITE_NAME}`;
        description = `Brecha cambiaria actual entre Dólar BCV (${formatNumber(usdBcv)} Bs) y USDT Binance (${formatNumber(usdtSell)} Bs): ${diff} Bs (${pct}%). Simula el impacto en bolívares y dólares.`;
      } else {
        title = `Brecha cambiaria hoy en Venezuela (BCV vs USDT) | ${SITE_NAME}`;
        description = `Compara al instante la diferencia porcentual y en bolívares entre el Dólar oficial del BCV y el USDT en Binance P2P.`;
      }
      break;
    }
    case "tendencias": {
      title = `Historial Dólar BCV y USDT (7D, 15D, 30D) | ${SITE_NAME}`;
      description = `Gráfico interactivo y tabla de promedios diarios del Dólar BCV, Euro BCV y USDT Binance en Venezuela durante los últimos 7, 15 y 30 días.`;
      break;
    }
    case "preguntas-frecuentes": {
      title = `Preguntas Frecuentes sobre BCV, Fecha Valor y USDT | ${SITE_NAME}`;
      description = `Resuelve tus dudas sobre la tasa oficial BCV, qué es la fecha valor, cómo se promedia USDT Binance P2P y cómo usar la calculadora sin conexión.`;
      break;
    }
    case "privacidad": {
      title = `Aviso Legal y Política de Privacidad | ${SITE_NAME}`;
      description = `Conoce nuestro descargo informativo, manejo de almacenamiento local sin recopilación de datos personales y fuentes públicas de tasas en Cambio rápido.`;
      ogType = "article";
      break;
    }
    case "home":
    default: {
      const rateBits: string[] = [];
      if (usdBcv !== null) rateBits.push(`Dólar BCV ${formatNumber(usdBcv)} Bs`);
      if (eurBcv !== null) rateBits.push(`Euro ${formatNumber(eurBcv)} Bs`);
      if (usdtSell !== null) rateBits.push(`USDT ${formatNumber(usdtSell)} Bs`);

      title = `${SITE_NAME}: Calculadora Dólar BCV, Euro y USDT en Venezuela`;
      description =
        rateBits.length > 0
          ? `Calculadora cambiaria rápida y sin anuncios invasivos. Hoy: ${rateBits.join(" · ")}. Convierte bolívares, revisa brecha y tendencias.`
          : `Calculadora rápida para convertir entre Bolívares, Dólar BCV, Euro BCV y USDT Binance en Venezuela con tendencias históricas y soporte offline.`;
      break;
    }
  }

  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType,
    robots: "index, follow",
    routeKey,
  };
}
