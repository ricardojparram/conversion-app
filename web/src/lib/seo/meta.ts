import { calculateBrecha } from "@/lib/rates/brecha";
import { formatNumber } from "@/lib/rates/format";
import type { ResolvedRate } from "@/lib/rates/types";
import {
  buildCanonicalUrl,
  getSiteUrl,
  isIndexableDeployment,
  PUBLIC_ROUTES,
  SITE_NAME,
  type RouteKey,
} from "./config";

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
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
  const indexable = isIndexableDeployment({ siteUrl: base });
  const route =
    routeKey === "not-found"
      ? null
      : PUBLIC_ROUTES.find((r) => r.key === routeKey) ?? PUBLIC_ROUTES[0];
  const canonical =
    routeKey === "not-found"
      ? buildCanonicalUrl("/404", base)
      : buildCanonicalUrl(route!.path, base);
  const ogImage =
    routeKey === "not-found" ? `${base}/og-image.png` : `${base}/og/${routeKey}.png`;

  const usdBcv = findRate(rates, 1);
  const eurBcv = findRate(rates, 2);
  const usdtSell = findRate(rates, 3);
  const usdtBuy = findRate(rates, 4);

  let title: string;
  let description: string;
  let ogImageAlt: string;
  let ogType: "website" | "article" = "website";

  switch (routeKey) {
    case "dolar-bcv": {
      const rateText = usdBcv !== null ? `${formatNumber(usdBcv)} Bs` : null;
      title = rateText
        ? `Dólar BCV hoy: ${rateText} — Calculadora | ${SITE_NAME}`
        : `Dólar BCV hoy y Calculadora USD a Bs | ${SITE_NAME}`;
      description = rateText
        ? `Tasa oficial Dólar BCV hoy: ${rateText}. Convierte dólares a bolívares al instante, revisa próxima fecha valor, equivalencias y tendencia.`
        : `Consulta el precio oficial del Dólar BCV hoy en Venezuela, calcula dólares a bolívares al instante, revisa fecha valor y tendencia.`;
      ogImageAlt = rateText
        ? `Tasa oficial Dólar BCV hoy en Venezuela: ${rateText} — ${SITE_NAME}`
        : `Calculadora y tasa oficial del Dólar BCV hoy en ${SITE_NAME}`;
      break;
    }
    case "euro-bcv": {
      const rateText = eurBcv !== null ? `${formatNumber(eurBcv)} Bs` : null;
      title = rateText
        ? `Euro BCV hoy: ${rateText} — Calculadora | ${SITE_NAME}`
        : `Euro BCV hoy y Calculadora EUR a Bs | ${SITE_NAME}`;
      description = rateText
        ? `Tipo de cambio Euro BCV hoy: ${rateText}. Calcula euros (€) a bolívares exactos, tabla de montos frecuentes y variación de los últimos 7 días.`
        : `Consulta la tasa oficial del Euro BCV hoy en Venezuela y convierte euros a bolívares al instante con tabla de montos y gráfico de 7 días.`;
      ogImageAlt = rateText
        ? `Tasa oficial Euro BCV hoy en Venezuela: ${rateText} — ${SITE_NAME}`
        : `Calculadora y tasa oficial del Euro BCV hoy en ${SITE_NAME}`;
      break;
    }
    case "usdt-binance": {
      const rateText = usdtSell !== null ? `${formatNumber(usdtSell)} Bs` : null;
      const buyText = usdtBuy !== null ? `${formatNumber(usdtBuy)} Bs` : null;
      title = rateText
        ? `USDT Binance hoy: ${rateText} — P2P | ${SITE_NAME}`
        : `USDT Binance P2P hoy: Venta y Compra | ${SITE_NAME}`;
      description =
        rateText && buyText
          ? `Referencia Binance P2P Venezuela: USDT Venta ${rateText} y Compra ${buyText}. Calcula bolívares a USDT al instante y compara con BCV.`
          : rateText
            ? `Referencia Binance P2P en Venezuela hoy: USDT Venta ${rateText}. Calcula bolívares a USDT al instante y compara con BCV.`
            : `Calcula USDT a bolívares al instante con tasas promedio Binance P2P (Compra y Venta) actualizadas constantemente en hora de Caracas.`;
      ogImageAlt = rateText
        ? `Precio USDT Binance P2P hoy en Venezuela: ${rateText} — ${SITE_NAME}`
        : `Calculadora USDT Binance P2P a Bolívares en ${SITE_NAME}`;
      break;
    }
    case "brecha-cambiaria": {
      if (usdBcv !== null && usdtSell !== null) {
        const brecha = calculateBrecha(usdBcv, usdtSell, 100);
        const pct = formatNumber(brecha.percentage);
        const diff = formatNumber(brecha.differenceBs);
        title = `Brecha cambiaria hoy: ${pct}% (BCV vs USDT) | ${SITE_NAME}`;
        description = `Brecha hoy entre Dólar BCV (${formatNumber(usdBcv)} Bs) y USDT (${formatNumber(usdtSell)} Bs): ${diff} Bs (${pct}%). Simula impacto en \$ y Bs.`;
        ogImageAlt = `Brecha cambiaria hoy entre Dólar BCV y USDT Binance: ${pct}% — ${SITE_NAME}`;
      } else {
        title = `Brecha cambiaria BCV vs USDT hoy | ${SITE_NAME}`;
        description = `Compara al instante la diferencia porcentual y en bolívares entre el Dólar oficial del BCV y el USDT en Binance P2P en Venezuela.`;
        ogImageAlt = `Comparador y simulador de brecha cambiaria BCV vs USDT en ${SITE_NAME}`;
      }
      break;
    }
    case "tendencias": {
      title = `Historial Dólar BCV y USDT (7-30D) | ${SITE_NAME}`;
      description = `Gráfico interactivo y tabla de promedios diarios de cierre (VET) del Dólar BCV, Euro BCV y USDT Binance de los últimos 7, 15 y 30 días.`;
      ogImageAlt = `Historial y gráficos de 30 días del Dólar BCV, Euro y USDT en ${SITE_NAME}`;
      break;
    }
    case "preguntas-frecuentes": {
      title = `Preguntas sobre Dólar BCV y USDT | ${SITE_NAME}`;
      description = `Resuelve tus dudas sobre la tasa oficial BCV, próxima fecha valor, cálculo USDT Binance P2P, brecha cambiaria y uso offline.`;
      ogImageAlt = `Preguntas frecuentes sobre tasas BCV y USDT en ${SITE_NAME}`;
      break;
    }
    case "privacidad": {
      title = `Aviso Legal y Privacidad | ${SITE_NAME}`;
      description = `Descargo informativo, almacenamiento local privado sin cookies de rastreo ni recopilación de datos personales y fuentes públicas en Cambio rápido.`;
      ogImageAlt = `Aviso legal y política de privacidad de ${SITE_NAME}`;
      ogType = "article";
      break;
    }
    case "not-found": {
      title = `Página no encontrada (404) | ${SITE_NAME}`;
      description = `La ruta solicitada no existe. Accede a la calculadora de Dólar BCV, Euro BCV, USDT Binance P2P o brecha cambiaria en Venezuela.`;
      ogImageAlt = `${SITE_NAME} — Calculadora Dólar BCV, Euro y USDT`;
      break;
    }
    case "home":
    default: {
      const rateBits: string[] = [];
      if (usdBcv !== null) rateBits.push(`BCV ${formatNumber(usdBcv)} Bs`);
      if (eurBcv !== null) rateBits.push(`EUR ${formatNumber(eurBcv)} Bs`);
      if (usdtSell !== null) rateBits.push(`USDT ${formatNumber(usdtSell)} Bs`);

      title = `Calculadora Dólar BCV, Euro y USDT hoy | ${SITE_NAME}`;
      description =
        rateBits.length > 0
          ? `Calculadora cambiaria sin anuncios. Hoy: ${rateBits.join(" · ")}. Convierte bolívares, ve brecha y tendencias.`
          : `Calculadora rápida para convertir bolívares a Dólar BCV, Euro BCV y USDT Binance en Venezuela con brecha cambiaria, gráficos y modo offline.`;
      ogImageAlt =
        rateBits.length > 0
          ? `Tasas de cambio hoy en Venezuela (${rateBits.join(" · ")}) — ${SITE_NAME}`
          : `${SITE_NAME}: Calculadora Dólar BCV, Euro BCV y USDT Binance`;
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
    ogImageAlt,
    ogType,
    robots: routeKey === "not-found" || !indexable ? "noindex, nofollow" : "index, follow",
    routeKey,
  };
}
