import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { calculateBrecha } from "@/lib/rates/brecha";
import {
  formatNaturalCaracasDateTime,
  formatNaturalFutureCaracasDate,
  shouldIncludeTimeForRate,
} from "@/lib/rates/caracas-date";
import { formatCurrency, formatNumber } from "@/lib/rates/format";
import type { ResolvedRate } from "@/lib/rates/types";
import { getSiteHostname, PUBLIC_ROUTES, type PublicRouteConfig } from "./config";

export type OgRouteKey = PublicRouteConfig["key"];

const VALID_OG_ROUTES = new Set<string>(PUBLIC_ROUTES.map((r) => r.key));

let wasmInitPromise: Promise<void> | null = null;
let cachedFontBuffers: Uint8Array[] | null = null;

function resolveExistingFile(candidates: string[], label: string): string {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Unable to locate ${label}. Checked: ${candidates.join(", ")}`);
}

function getWasmBuffer(): Uint8Array {
  const cwd = process.cwd();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const wasmPath = resolveExistingFile(
    [
      path.join(cwd, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
      path.join(cwd, "web", "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
      path.resolve(here, "../../../node_modules/@resvg/resvg-wasm/index_bg.wasm"),
      path.resolve(here, "../../node_modules/@resvg/resvg-wasm/index_bg.wasm"),
    ],
    "resvg index_bg.wasm",
  );
  return fs.readFileSync(wasmPath);
}

function getFontBuffers(): Uint8Array[] {
  if (cachedFontBuffers) return cachedFontBuffers;
  const cwd = process.cwd();
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fontFiles = [
    "Poppins_400Regular.ttf",
    "Poppins_600SemiBold.ttf",
    "Poppins_700Bold.ttf",
  ];
  cachedFontBuffers = fontFiles.map((fileName) => {
    const resolved = resolveExistingFile(
      [
        path.join(cwd, "src", "assets", "fonts", fileName),
        path.join(cwd, "web", "src", "assets", "fonts", fileName),
        path.resolve(here, "../../assets/fonts", fileName),
        path.resolve(here, "../assets/fonts", fileName),
      ],
      fileName,
    );
    return fs.readFileSync(resolved);
  });
  return cachedFontBuffers;
}

async function ensureResvgInitialized(): Promise<void> {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      try {
        await initWasm(getWasmBuffer());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.toLowerCase().includes("already initialized")) {
          wasmInitPromise = null;
          throw err;
        }
      }
    })();
  }
  await wasmInitPromise;
}

export function isValidOgRoute(route: string | undefined): route is OgRouteKey {
  return Boolean(route && VALID_OG_ROUTES.has(route));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function findRate(rates: ResolvedRate[], id: number): ResolvedRate | null {
  return rates.find((r) => r.currencyId === id && r.effectiveRate > 0) ?? null;
}

function renderBrandHeader(hostname: string): string {
  const displayHost =
    hostname.length > 44 ? `${hostname.slice(0, 41)}...` : hostname;
  const fontSize = displayHost.length > 26 ? 15 : 17;
  const approxTextW = Math.ceil(displayHost.length * (fontSize * 0.58));
  const pillWidth = Math.min(540, Math.max(210, approxTextW + 66));
  const pillX = 1136 - pillWidth;
  return `
    <g transform="translate(64, 44)">
      <rect width="50" height="50" rx="14" fill="#16a249" />
      <g transform="translate(10 10) scale(1.25)" fill="none" stroke="#095625" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </g>
      <text x="66" y="34" fill="#f8fafc" font-family="Poppins" font-size="28" font-weight="700" letter-spacing="-0.6">Cambio rápido</text>
    </g>
    <g transform="translate(${pillX}, 48)">
      <rect width="${pillWidth}" height="42" rx="21" fill="#0e2133" stroke="#1e3a56" stroke-width="1.2" />
      <circle cx="24" cy="21" r="5" fill="#34d399" />
      <text x="40" y="${fontSize === 15 ? 26 : 27}" fill="#cbd5e1" font-family="Poppins" font-size="${fontSize}" font-weight="600">${escapeXml(displayHost)}</text>
    </g>
  `;
}

function renderFooterBar(leftText: string, rightText: string): string {
  return `
    <line x1="64" y1="546" x2="1136" y2="546" stroke="rgba(255,255,255,0.09)" stroke-width="1.5" />
    <text x="64" y="586" fill="#94a3b8" font-family="Poppins" font-size="18" font-weight="400">${escapeXml(leftText)}</text>
    <text x="1136" y="586" text-anchor="end" fill="#cbd5e1" font-family="Poppins" font-size="18" font-weight="600">${escapeXml(rightText)}</text>
  `;
}

function fitRateFontSize(text: string, base: number, shrinkAt: number, min: number): number {
  if (text.length <= shrinkAt) return base;
  return Math.max(min, base - (text.length - shrinkAt) * 3);
}

function renderHomeCard(
  x: number,
  label: string,
  valueText: string,
  subText: string,
  highlight: boolean,
  accentHex: string,
): string {
  const fill = highlight ? "#0f2924" : "#0c1b29";
  const stroke = highlight ? "#16a249" : "rgba(255,255,255,0.1)";
  const fontSize = fitRateFontSize(valueText, 40, 10, 31);
  return `
    <g transform="translate(${x}, 258)">
      <rect width="340" height="226" rx="24" fill="${fill}" stroke="${stroke}" stroke-width="${highlight ? "2" : "1.2"}" />
      <circle cx="32" cy="40" r="6" fill="${accentHex}" />
      <text x="48" y="46" fill="#cbd5e1" font-family="Poppins" font-size="16" font-weight="700" letter-spacing="0.8">${escapeXml(label)}</text>
      <text x="28" y="132" fill="#f8fafc" font-family="Poppins" font-size="${fontSize}" font-weight="700" letter-spacing="-1">${escapeXml(valueText)}</text>
      <text x="28" y="186" fill="${highlight ? "#34d399" : "#94a3b8"}" font-family="Poppins" font-size="17" font-weight="600">${escapeXml(subText)}</text>
    </g>
  `;
}

function renderCurrencyHeroBody(
  badgeText: string,
  badgeFill: string,
  badgeTextColor: string,
  title: string,
  rateText: string,
  primarySubLabel: string,
  secondaryTile?: { label: string; value: string; note: string; accent: string },
): string {
  const valueSize = fitRateFontSize(rateText, 82, 11, 58);
  const badgeWidth = Math.min(460, Math.max(220, badgeText.length * 10 + 44));
  return `
    <g transform="translate(64, 134)">
      <rect width="1072" height="378" rx="28" fill="#0c1b29" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
      <rect x="44" y="38" width="${badgeWidth}" height="36" rx="18" fill="${badgeFill}" />
      <text x="64" y="62" fill="${badgeTextColor}" font-family="Poppins" font-size="15" font-weight="700" letter-spacing="0.8">${escapeXml(badgeText)}</text>
      <text x="44" y="126" fill="#cbd5e1" font-family="Poppins" font-size="36" font-weight="700" letter-spacing="-0.8">${escapeXml(title)}</text>
      <text x="44" y="232" fill="#f8fafc" font-family="Poppins" font-size="${valueSize}" font-weight="700" letter-spacing="-2.2">${escapeXml(rateText)}</text>
      <rect x="44" y="282" width="${secondaryTile ? 610 : 984}" height="60" rx="16" fill="#0e2133" />
      <circle cx="70" cy="312" r="5.5" fill="#16a249" />
      <text x="88" y="319" fill="#cbd5e1" font-family="Poppins" font-size="19" font-weight="600">${escapeXml(primarySubLabel)}</text>
      ${
        secondaryTile
          ? `
            <g transform="translate(682, 38)">
              <rect width="346" height="304" rx="22" fill="#080f17" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" />
              <text x="28" y="54" fill="#94a3b8" font-family="Poppins" font-size="15" font-weight="700" letter-spacing="0.8">${escapeXml(secondaryTile.label)}</text>
              <text x="28" y="148" fill="${secondaryTile.accent}" font-family="Poppins" font-size="${fitRateFontSize(secondaryTile.value, 44, 10, 32)}" font-weight="700" letter-spacing="-1">${escapeXml(secondaryTile.value)}</text>
              <text x="28" y="216" fill="#cbd5e1" font-family="Poppins" font-size="18" font-weight="600">${escapeXml(secondaryTile.note)}</text>
            </g>
          `
          : ""
      }
    </g>
  `;
}

export function buildOgSvg(
  routeKey: OgRouteKey,
  rates: ResolvedRate[] = [],
  siteUrl?: string,
): string {
  const hostname = getSiteHostname(siteUrl);
  const usdBcv = findRate(rates, 1);
  const eurBcv = findRate(rates, 2);
  const usdtSell = findRate(rates, 3);
  const usdtBuy = findRate(rates, 4);

  const primaryRef = usdBcv ?? usdtSell ?? eurBcv;
  const updatedStr = primaryRef
    ? `Actualizado: ${formatNaturalCaracasDateTime(primaryRef.effectiveDate, undefined, {
        includeTime: shouldIncludeTimeForRate(primaryRef),
      })}`
    : "Hora oficial de Caracas (VET)";

  let bodySvg = "";
  let footerLeft = "Calculadora rápida · Bolívares, USD, EUR y USDT";
  let footerRight = updatedStr;

  switch (routeKey) {
    case "dolar-bcv": {
      const rateText = usdBcv ? formatCurrency(usdBcv.effectiveRate, "Bs") : "Calculadora USD/Bs";
      const vigencia = usdBcv
        ? usdBcv.hasNextRate && usdBcv.nextRate !== null && usdBcv.nextDate
          ? `Próxima tasa BCV: ${formatCurrency(usdBcv.nextRate, "Bs")} (${formatNaturalFutureCaracasDate(usdBcv.nextDate)})`
          : `Fecha valor BCV vigente · ${formatNaturalCaracasDateTime(usdBcv.effectiveDate, undefined, { includeTime: false })}`
        : "Referencia oficial del Banco Central de Venezuela";
      const nextTile =
        usdBcv?.hasNextRate && usdBcv.nextRate !== null && usdBcv.nextDate
          ? {
              label: "PRÓXIMA FECHA VALOR",
              value: formatCurrency(usdBcv.nextRate, "Bs"),
              note: `Vigente ${formatNaturalFutureCaracasDate(usdBcv.nextDate)}`,
              accent: "#34d399",
            }
          : usdtSell && usdBcv
            ? {
                label: "DIFERENCIA VS USDT",
                value: `${formatNumber(calculateBrecha(usdBcv.effectiveRate, usdtSell.effectiveRate, 1).percentage)}%`,
                note: `USDT Venta: ${formatCurrency(usdtSell.effectiveRate, "Bs")}`,
                accent: "#fcd34d",
              }
            : undefined;
      bodySvg = renderCurrencyHeroBody(
        "TASA OFICIAL BCV · USD / VES",
        "rgba(22, 162, 73, 0.22)",
        "#34d399",
        "Dólar BCV hoy en Venezuela",
        rateText,
        vigencia,
        nextTile,
      );
      footerLeft = "Conversor USD BCV a Bolívares · Tabla de equivalencias y 7D";
      break;
    }

    case "euro-bcv": {
      const rateText = eurBcv ? formatCurrency(eurBcv.effectiveRate, "Bs") : "Calculadora EUR/Bs";
      const vigencia = eurBcv
        ? eurBcv.hasNextRate && eurBcv.nextRate !== null && eurBcv.nextDate
          ? `Próxima tasa Euro BCV: ${formatCurrency(eurBcv.nextRate, "Bs")} (${formatNaturalFutureCaracasDate(eurBcv.nextDate)})`
          : `Fecha valor Euro BCV · ${formatNaturalCaracasDateTime(eurBcv.effectiveDate, undefined, { includeTime: false })}`
        : "Referencia oficial del Banco Central de Venezuela en Euros";
      const tile =
        eurBcv?.hasNextRate && eurBcv.nextRate !== null && eurBcv.nextDate
          ? {
              label: "PRÓXIMA FECHA VALOR",
              value: formatCurrency(eurBcv.nextRate, "Bs"),
              note: `Vigente ${formatNaturalFutureCaracasDate(eurBcv.nextDate)}`,
              accent: "#34d399",
            }
          : usdBcv
            ? {
                label: "DÓLAR BCV DE HOY",
                value: formatCurrency(usdBcv.effectiveRate, "Bs"),
                note: "Cruce oficial USD/VES",
                accent: "#34d399",
              }
            : undefined;
      bodySvg = renderCurrencyHeroBody(
        "TASA OFICIAL BCV · EUR / VES",
        "rgba(37, 99, 235, 0.24)",
        "#93c5fd",
        "Euro BCV hoy en Venezuela",
        rateText,
        vigencia,
        tile,
      );
      footerLeft = "Conversor Euros (€) BCV a Bolívares · Promedios 7 días";
      break;
    }

    case "usdt-binance": {
      const rateText = usdtSell ? formatCurrency(usdtSell.effectiveRate, "Bs") : "USDT Binance P2P";
      const subText = usdtSell
        ? `Promedio P2P Venta · Actualizado ${formatNaturalCaracasDateTime(usdtSell.effectiveDate, undefined, { includeTime: shouldIncludeTimeForRate(usdtSell) })}`
        : "Promedio de ofertas verificadas USDT/VES en Binance P2P";
      const buyTile = usdtBuy
        ? {
            label: "USDT COMPRA (P2P)",
            value: formatCurrency(usdtBuy.effectiveRate, "Bs"),
            note: usdBcv && usdtSell
              ? `Brecha vs BCV: +${formatNumber(calculateBrecha(usdBcv.effectiveRate, usdtSell.effectiveRate, 1).percentage)}%`
              : "Cotización P2P 24/7",
            accent: "#fcd34d",
          }
        : undefined;
      bodySvg = renderCurrencyHeroBody(
        "MERCADO P2P 24/7 · BINANCE VENEZUELA",
        "rgba(245, 158, 11, 0.18)",
        "#fcd34d",
        "USDT Binance P2P Venta hoy",
        rateText,
        subText,
        buyTile,
      );
      footerLeft = "Calculadora USDT a Bolívares · Venta, Compra y comparativa BCV";
      break;
    }

    case "brecha-cambiaria": {
      const hasBoth = Boolean(usdBcv && usdtSell);
      const b1 = hasBoth
        ? calculateBrecha(usdBcv!.effectiveRate, usdtSell!.effectiveRate, 1)
        : null;
      const b100 = hasBoth
        ? calculateBrecha(usdBcv!.effectiveRate, usdtSell!.effectiveRate, 100)
        : null;
      const pctText = b1
        ? `${b1.percentage > 0 ? "+" : ""}${formatNumber(b1.percentage)}%`
        : "Brecha BCV vs USDT";
      const bcvPct =
        b1 && b1.usdtRate > 0 ? Math.max(15, Math.min(92, (b1.bcvRate / b1.usdtRate) * 100)) : 75;
      const barTotalW = 984;
      const barBcvW = Math.round((barTotalW * bcvPct) / 100);
      bodySvg = `
        <g transform="translate(64, 134)">
          <rect width="1072" height="378" rx="28" fill="#0c1b29" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
          <rect x="44" y="38" width="320" height="36" rx="18" fill="rgba(245, 158, 11, 0.18)" />
          <text x="64" y="62" fill="#fcd34d" font-family="Poppins" font-size="15" font-weight="700" letter-spacing="0.8">BRECHA CAMBIARIA EN VIVO</text>
          <text x="44" y="124" fill="#cbd5e1" font-family="Poppins" font-size="34" font-weight="700" letter-spacing="-0.6">Diferencial Dólar BCV vs USDT Binance</text>
          <text x="44" y="218" fill="#fcd34d" font-family="Poppins" font-size="82" font-weight="700" letter-spacing="-2">${escapeXml(pctText)}</text>
          ${
            b1 && b100 && usdBcv && usdtSell
              ? `
                <text x="510" y="182" fill="#f8fafc" font-family="Poppins" font-size="34" font-weight="700">${escapeXml(
                  `${b1.differenceBs > 0 ? "+" : ""}${formatCurrency(b1.differenceBs, "Bs")} por dólar`,
                )}</text>
                <text x="510" y="220" fill="#94a3b8" font-family="Poppins" font-size="22" font-weight="600">${escapeXml(
                  `${formatCurrency(b100.impactUsdAtBcv, "$")} a tasa BCV por cada $100`,
                )}</text>
              `
              : ""
          }
          <rect x="44" y="264" width="${barTotalW}" height="18" rx="9" fill="#f59e0b" />
          <rect x="44" y="264" width="${barBcvW}" height="18" rx="9" fill="#16a249" />
          <text x="44" y="328" fill="#cbd5e1" font-family="Poppins" font-size="21" font-weight="600">${escapeXml(
            usdBcv
              ? `Dólar BCV: ${formatCurrency(usdBcv.effectiveRate, "Bs")}`
              : "Dólar Oficial BCV",
          )}</text>
          <text x="1028" y="328" text-anchor="end" fill="#fcd34d" font-family="Poppins" font-size="21" font-weight="700">${escapeXml(
            usdtSell
              ? `USDT Binance: ${formatCurrency(usdtSell.effectiveRate, "Bs")}`
              : "USDT Binance P2P",
          )}</text>
        </g>
      `;
      footerLeft = "Simulador de brecha porcentual, bolívares y equivalente en dólares";
      break;
    }

    case "tendencias": {
      const bcvText = usdBcv ? formatCurrency(usdBcv.effectiveRate, "Bs") : "—";
      const eurText = eurBcv ? formatCurrency(eurBcv.effectiveRate, "Bs") : "—";
      const usdtText = usdtSell ? formatCurrency(usdtSell.effectiveRate, "Bs") : "—";
      bodySvg = `
        <g transform="translate(64, 134)">
          <rect width="1072" height="378" rx="28" fill="#0c1b29" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
          <rect x="44" y="38" width="380" height="36" rx="18" fill="rgba(22, 162, 73, 0.22)" />
          <text x="64" y="62" fill="#34d399" font-family="Poppins" font-size="15" font-weight="700" letter-spacing="0.8">HISTORIAL CAMBIARIO · 7, 15 Y 30 DÍAS</text>
          <text x="44" y="132" fill="#f8fafc" font-family="Poppins" font-size="44" font-weight="700" letter-spacing="-1">Tendencias Dólar BCV y USDT</text>
          <text x="44" y="176" fill="#cbd5e1" font-family="Poppins" font-size="22" font-weight="400">Promedios diarios VET y tabla histórica de 30 días</text>
          <g transform="translate(760, 38)">
            <rect width="268" height="164" rx="18" fill="#080f17" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" />
            <path d="M 24 128 C 76 118, 132 108, 186 92 C 214 84, 232 74, 244 68" fill="none" stroke="#16a249" stroke-width="4.5" stroke-linecap="round" />
            <circle cx="244" cy="68" r="5.5" fill="#34d399" />
            <path d="M 24 102 C 76 92, 132 76, 186 58 C 214 48, 232 38, 244 30" fill="none" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round" />
            <circle cx="244" cy="30" r="5.5" fill="#fcd34d" />
          </g>
          <g transform="translate(44, 240)">
            <rect width="316" height="96" rx="18" fill="#0e2133" />
            <text x="22" y="34" fill="#94a3b8" font-family="Poppins" font-size="14" font-weight="700">DÓLAR BCV</text>
            <text x="22" y="72" fill="#34d399" font-family="Poppins" font-size="30" font-weight="700">${escapeXml(bcvText)}</text>
          </g>
          <g transform="translate(378, 240)">
            <rect width="316" height="96" rx="18" fill="#0e2133" />
            <text x="22" y="34" fill="#94a3b8" font-family="Poppins" font-size="14" font-weight="700">EURO BCV</text>
            <text x="22" y="72" fill="#f8fafc" font-family="Poppins" font-size="30" font-weight="700">${escapeXml(eurText)}</text>
          </g>
          <g transform="translate(712, 240)">
            <rect width="316" height="96" rx="18" fill="#0e2133" />
            <text x="22" y="34" fill="#94a3b8" font-family="Poppins" font-size="14" font-weight="700">USDT BINANCE</text>
            <text x="22" y="72" fill="#fcd34d" font-family="Poppins" font-size="30" font-weight="700">${escapeXml(usdtText)}</text>
          </g>
        </g>
      `;
      footerLeft = "Gráficos interactivos y promedios históricos en Bolívares";
      break;
    }

    case "preguntas-frecuentes":
    case "privacidad": {
      const isFaq = routeKey === "preguntas-frecuentes";
      bodySvg = renderCurrencyHeroBody(
        isFaq ? "GUÍA CAMBIARIA VENEZUELA" : "TRANSPARENCIA Y PRIVACIDAD",
        "rgba(22, 162, 73, 0.22)",
        "#34d399",
        isFaq
          ? "Preguntas frecuentes sobre BCV y USDT"
          : "Aviso Legal y Política de Privacidad",
        isFaq ? "Horarios BCV y uso offline" : "100% informativo · Sin rastreo",
        isFaq
          ? "Fecha valor bancaria, cálculo de brecha cambiaria y modo sin conexión"
          : "Datos guardados localmente en tu navegador · Sin cuentas ni rastreadores",
      );
      footerLeft = "Cambio rápido · Calculadora cambiaria gratuita";
      footerRight = hostname;
      break;
    }

    case "home":
    default: {
      const brechaSub =
        usdBcv && usdtSell
          ? `Brecha +${formatNumber(calculateBrecha(usdBcv.effectiveRate, usdtSell.effectiveRate, 1).percentage)}% vs BCV`
          : "Mercado P2P Binance 24/7";
      const bcvSub =
        usdBcv?.hasNextRate && usdBcv.nextRate !== null
          ? `Próxima: ${formatCurrency(usdBcv.nextRate, "Bs")}`
          : "Referencia oficial BCV";
      bodySvg = `
        <text x="64" y="168" fill="#f8fafc" font-family="Poppins" font-size="42" font-weight="700" letter-spacing="-1">Calculadora Dólar BCV, Euro y USDT hoy</text>
        <text x="64" y="210" fill="#cbd5e1" font-family="Poppins" font-size="22" font-weight="400">Conversión al instante en Venezuela con fecha valor, brecha y modo sin conexión</text>
        ${renderHomeCard(
          64,
          "DÓLAR BCV (USD)",
          usdBcv ? formatCurrency(usdBcv.effectiveRate, "Bs") : "—",
          bcvSub,
          true,
          "#34d399",
        )}
        ${renderHomeCard(
          430,
          "EURO BCV (EUR)",
          eurBcv ? formatCurrency(eurBcv.effectiveRate, "Bs") : "—",
          "Referencia oficial € / Bs",
          false,
          "#60a5fa",
        )}
        ${renderHomeCard(
          796,
          "USDT BINANCE P2P",
          usdtSell ? formatCurrency(usdtSell.effectiveRate, "Bs") : "—",
          brechaSub,
          false,
          "#fcd34d",
        )}
      `;
      break;
    }
  }

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowGreen" cx="0.88" cy="0.12" r="0.65">
      <stop offset="0%" stop-color="#16a249" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#080f17" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowSlate" cx="0.15" cy="0.85" r="0.65">
      <stop offset="0%" stop-color="#1d4ed8" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#080f17" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#080f17" />
  <rect width="1200" height="630" fill="url(#glowGreen)" />
  <rect width="1200" height="630" fill="url(#glowSlate)" />
  ${renderBrandHeader(hostname)}
  ${bodySvg}
  ${renderFooterBar(footerLeft, footerRight)}
</svg>
  `.trim();
}

export async function renderOgPng(
  routeKey: OgRouteKey,
  rates: ResolvedRate[] = [],
  siteUrl?: string,
): Promise<Uint8Array> {
  await ensureResvgInitialized();
  const svg = buildOgSvg(routeKey, rates, siteUrl);
  const fontBuffers = getFontBuffers();
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
    font: {
      fontBuffers,
      loadSystemFonts: false,
      defaultFontFamily: "Poppins",
      sansSerifFamily: "Poppins",
    },
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  rendered.free();
  return pngBuffer;
}
