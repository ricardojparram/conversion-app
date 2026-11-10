# Cambio Rápido Web (Astro + SEO + UI Parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la versión web de Cambio Rápido en `web/` usando Astro 7 + Vercel ISR con paridad visual y funcional 1:1 con la app móvil above the fold, navegación multi-ruta real y SEO técnico/semántico completo.

**Architecture:** `web/` coexiste como subproyecto Astro independiente dentro de `cambio-rapido/` (dejando Expo móvil intacto en raíz). Usa `output: 'static'` + `@astrojs/vercel` (`isr: { expiration: 120 }`) donde las 6 rutas con tasas vivas + `/robots.txt` + `/sitemap.xml` renderizan HTML completo en servidor (`prerender = false`) y `/preguntas-frecuentes` + `/privacidad` se precompilan estáticas (`prerender = true`), mientras la calculadora céntimo-a-céntimo y el gráfico de tendencias corren en TypeScript nativo liviano sin runtime de React/Preact.

**Tech Stack:** Astro 7.4.x, `@astrojs/vercel` 11.x, Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource/poppins`, `@supabase/supabase-js`, TypeScript, Vitest, ImageMagick (`og-image.png`).

## Global Constraints

- Ubicación: todo el nuevo código web vive en `web/`; NO modificar `app/`, `components/`, `android/`, `ios/` ni `eas.json`.
- NO ejecutar `astro build`, `pnpm build` ni `npm run build` después de los cambios (regla del usuario: "Never build after changes"). Verificar únicamente con `vitest run` y `astro check` / `tsc --noEmit`.
- NO agregar `Co-Authored-By` ni atribución de IA en commits; usar conventional commits únicamente.
- Paridad UI/UX exacta above the fold: paleta de `constants/Colors.ts` (`#16a249`, `#d67d00`/`#eb8a02`, `#f9fafc`/`#0e151d`, `#ffffff`/`#1a2633`, `#f0f4f8`/`#253547`), Poppins 400/600/700, tarjeta central `max-width: 400px`, entrada céntimo-a-céntimo de derecha a izquierda, reset a `0,00` al enfocar, inicialización en `1` unidad de divisa, copia con check 1.5s, pegar desde portapapeles, grilla `Fuentes` en 2 columnas (`48%`, última `100%` si impar) y modal/drawer de tendencia (`7D`/`15D`/`30D` + multi-fuente).
- Toda fecha y validez BCV (`rate_old` / `date_old`) debe evaluarse explícitamente en zona horaria `America/Caracas`, jamás en UTC del servidor.
- `PUBLIC_SITE_URL` centralizado con fallback `https://cambiorapido.app`.
- Nunca usar `Cache-Control: no-store` en páginas públicas degradadas (usar `no-cache` para preservar bfcache); en `<dialog>` usar `closedby="any"` + fallback Safari click-outside y `overscroll-behavior: contain` sin `overflow: hidden` en `html`/`body`; nunca colocar headings (`h2`-`h6`) dentro de `<summary>`.

---

### Task 1: Scaffolding de `web/`, Configuración Astro/Vercel/Vitest y Assets PWA

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/vitest.config.ts`
- Create: `web/.gitignore`
- Create: `web/.env.sample`
- Create: `web/public/manifest.json`
- Copy: `public/favicon.ico`, `public/icon-192.png`, `public/icon-512.png` -> `web/public/`
- Create: `web/public/og-image.png`
- Create: `web/tests/setup.test.ts`

**Interfaces:**
- Produces: workspace `web/` ejecutable con `pnpm test` (`vitest run`) y `pnpm check` (`astro check`).

- [ ] **Step 1: Crear configuración base de `web/` y copiar assets PWA**

Crear `web/package.json`:
```json
{
  "name": "cambio-rapido-web",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/vercel": "^11.0.20",
    "@fontsource/poppins": "^5.3.0",
    "@supabase/supabase-js": "^2.119.0",
    "@tailwindcss/vite": "^4.3.5",
    "astro": "^7.4.8",
    "tailwindcss": "^4.3.5"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.12",
    "typescript": "^5.8.3",
    "vitest": "^5.1.0"
  }
}
```

Crear `web/astro.config.mjs`:
```js
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

const siteUrl = (
  process.env.PUBLIC_SITE_URL || "https://cambiorapido.app"
).replace(/\/+$/, "");

export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel({
    isr: {
      expiration: 120,
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Crear `web/tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*"],
  "exclude": ["dist"]
}
```

Crear `web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Crear `web/.gitignore`:
```text
dist/
.astro/
.vercel/
node_modules/
.env
.env.*
!.env.sample
```

Crear `web/.env.sample`:
```text
PUBLIC_SITE_URL=https://cambiorapido.app
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

Crear `web/public/manifest.json` (adaptado de `public/manifest.json` en raíz) y copiar `favicon.ico`, `icon-192.png`, `icon-512.png`, además de generar `web/public/og-image.png` (1200×630) usando SVG + ImageMagick `magick`.

- [ ] **Step 2: Instalar dependencias en `web/` y verificar `vitest` con test smoke**

Escribir `web/tests/setup.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("web project scaffold", () => {
  it("contains required PWA and OG assets in public/", () => {
    const publicDir = path.resolve(__dirname, "../public");
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "og-image.png"))).toBe(true);
  });
});
```

Ejecutar:
```bash
pnpm --dir web install && pnpm --dir web test
```
Expected: PASS (1 test).

- [ ] **Step 3: Commit Task 1**

```bash
git add web/package.json web/pnpm-lock.yaml web/astro.config.mjs web/tsconfig.json web/vitest.config.ts web/.gitignore web/.env.sample web/public/ web/tests/setup.test.ts
git commit -m "chore(web): scaffold Astro 7 project with Tailwind v4, Vercel ISR and Vitest"
```

---

### Task 2: Lógica Pura de Tasas, Fecha Caracas, Validez BCV, Formato, Calculadora y Brecha (TDD)

**Files:**
- Create: `web/src/lib/rates/types.ts`
- Create: `web/src/lib/rates/caracas-date.ts`
- Create: `web/src/lib/rates/bcv-validity.ts`
- Create: `web/src/lib/rates/format.ts`
- Create: `web/src/lib/rates/calculator.ts`
- Create: `web/src/lib/rates/brecha.ts`
- Test: `web/tests/rates-core.test.ts`

**Interfaces:**
- Produces:
  - `RawRateRow`, `ResolvedRate`, `HistoryPoint`, `HistorySeries`, `BrechaResult`, `RateDisplayMode` (`"current" | "next"`)
  - `getCaracasDayKey(input?: Date | string): string` (`YYYY-MM-DD` en `America/Caracas`)
  - `getCaracasDayStartMs(input?: Date | string): number`
  - `formatCaracasTimestamp(input: Date | string | number): string` (`dd/mm/aa h:mm AM/PM`)
  - `formatSimpleCaracasDate(dateStr: string): string` (`dd/mm/aa`)
  - `resolveEffectiveRate(row: RawRateRow, now?: Date): ResolvedRate`
  - `formatNumber(value: number, options?: FormatNumberOptions): string`
  - `formatCurrency(value: number, suffix: string, delimiter?: string, separator?: string, precision?: number): string`
  - `toCents(value: number | null, precision?: number): number`
  - `centsToNumber(cents: number, precision?: number): number`
  - `parseDigitsToCents(rawText: string, maxValue?: number, precision?: number): number | null`
  - `parseClipboardAmount(text: string): number | null`
  - `convertAmount(amount: number, rate: number, direction: "bsToForeign" | "foreignToBs"): number`
  - `calculateBrecha(bcvRate: number, usdtRate: number, amountUsd?: number): BrechaResult`

- [ ] **Step 1: Escribir tests fallidos en `web/tests/rates-core.test.ts`**

Cubrir:
- `getCaracasDayKey`: conversión correcta cuando servidor está en UTC (`2026-11-10T02:30:00Z` -> `2026-11-09` en Caracas `-04:00`) y cuando el string viene sin offset desde Postgres `timestamp without time zone` (`"2026-11-09T22:15:04.246255"` -> `"2026-11-09"` y `"2026-11-10T00:00:00"` -> `"2026-11-10"` interpretados en `-04:00`).
- `formatCaracasTimestamp`: formato exacto `dd/mm/aa h:mm AM/PM` en zona `America/Caracas`, tanto para timestamps con offset explícito (`Z`/`-04:00`) como para timestamps sin offset de Postgres (`"2026-11-09T22:15:04.246255"` -> `"09/11/26 10:15 PM"` sin importar si `TZ=UTC`).
- `resolveEffectiveRate`:
  - Cuando `source === "BCV"` y `date_old` es `2026-11-09T00:00:00` y `now` es `2026-11-09` (<= `date_old`), usa `rate_old` como vigente y expone `nextRate` = `rate` si difiere.
  - Cuando `now` ya pasó `date_old` (`2026-11-10`), usa `rate` y `hasNextRate === false`.
  - Cuando `source !== "BCV"` (Binance USDT), siempre usa `rate`.
- `formatCurrency` y `parseDigitsToCents`:
  - `1001.186 -> "1.001,19 Bs"`.
  - Entrada céntimo-a-céntimo `"2"` -> `2` cents (`0,02`), `"2350"` -> `2350` cents (`23,50`).
  - `parseClipboardAmount`: `"1.001,19 Bs"` -> `1001.19`, `"$ 25.50"` -> `25.5`, `"texto"` -> `null`.
- `convertAmount`: `bsToForeign` y `foreignToBs`, y `rate === 0` devuelve `0`.
- `calculateBrecha`: diferencia en Bs, porcentaje `(usdt - bcv) / bcv * 100` e impacto para un monto.

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar `types.ts`, `caracas-date.ts`, `bcv-validity.ts`, `format.ts`, `calculator.ts`, `brecha.ts`**

Implementación limpia, pura y tipada estrictamente sin `any`.

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y verificar PASS**

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add web/src/lib/rates/ web/tests/rates-core.test.ts
git commit -m "feat(web): implement pure rate, Caracas date, BCV validity, calculator and brecha logic"
```

---

### Task 3: Cliente Supabase, Carga Segura de Tasas e Historial Paginado Diario (TDD)

**Files:**
- Create: `web/src/lib/rates/supabase.ts`
- Create: `web/src/lib/rates/history.ts`
- Test: `web/tests/rates-repository.test.ts`

**Interfaces:**
- Consumes: `RawRateRow`, `ResolvedRate`, `HistoryPoint`, `getCaracasDayKey`, `resolveEffectiveRate` de Task 2.
- Produces:
  - `fetchLatestRatesSnapshot(client?, now?): Promise<{ ok: boolean; rates: ResolvedRate[]; updatedAtIso: string | null; error?: string }>`
  - `aggregateDailyHistory(rows: { rate: number; date: string }[]): HistoryPoint[]`
  - `fetchPaginatedHistory(fetchPageFn, currencyId: number, days: number, now?: Date): Promise<HistoryPoint[]>`
  - `fetchRatesHistory(currencyIds: number[], days?: number, client?, now?): Promise<{ ok: boolean; series: Record<number, HistoryPoint[]>; error?: string }>`

- [ ] **Step 1: Escribir tests fallidos en `web/tests/rates-repository.test.ts`**

Cubrir:
- `aggregateDailyHistory`: múltiples registros intradía en mismo día Caracas se promedian correctamente y se ordenan cronológicamente ascendente.
- `fetchPaginatedHistory`: cuando la página 1 retorna 1.000 filas, solicita página 2 (`range(1000, 1999)`) hasta completar sin truncar resultados.
- `fetchLatestRatesSnapshot`: ante rechazo de red o timeout, devuelve `{ ok: false, rates: [], updatedAtIso: null, error }` sin lanzar excepción.
- `fetchRatesHistory`: ante error de permisos o red en `exchange_rates`, devuelve `{ ok: false, series: {}, error }` sin romper SSR.

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

- [ ] **Step 3: Implementar `supabase.ts` e `history.ts`**

Implementación con `AbortSignal.timeout(3000)` para `fetchLatestRatesSnapshot` y queries paginadas con inyección de dependencia opcional para testear sin red real.

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y confirmar PASS**

- [ ] **Step 5: Commit Task 3**

```bash
git add web/src/lib/rates/supabase.ts web/src/lib/rates/history.ts web/tests/rates-repository.test.ts
git commit -m "feat(web): add Supabase rate snapshot loader and paginated Caracas daily history"
```

---

### Task 4: Generadores SEO Puros (`config.ts`, `meta.ts`, `schema.ts`, `faqs.ts`, `sitemap.ts`) (TDD)

**Files:**
- Create: `web/src/lib/seo/config.ts`
- Create: `web/src/lib/seo/meta.ts`
- Create: `web/src/lib/seo/schema.ts`
- Create: `web/src/lib/seo/faqs.ts`
- Create: `web/src/lib/seo/sitemap.ts`
- Test: `web/tests/seo.test.ts`

**Interfaces:**
- Consumes: `ResolvedRate`, `formatNumber`.
- Produces:
  - `getSiteUrl(envSiteUrl?: string): string`
  - `buildCanonicalUrl(pathname: string, siteUrl?: string): string`
  - `buildPageMeta(routeKey: RouteKey, rates?: ResolvedRate[], siteUrl?: string): PageMeta`
  - `buildStructuredData(params): Record<string, unknown>[]`
  - `getFaqsForRoute(routeKey: RouteKey): FaqItem[]`
  - `buildRobotsTxt(siteUrl?: string): string`
  - `buildSitemapXml(siteUrl?: string, lastModIso?: string | null): string`

- [ ] **Step 1: Escribir tests fallidos en `web/tests/seo.test.ts`**

Cubrir:
- `buildCanonicalUrl` normaliza slashes (`"/dolar-bcv/" -> "https://cambiorapido.app/dolar-bcv"` y `"/" -> "https://cambiorapido.app/"`).
- `buildPageMeta` genera `<title>` no vacío y descripción única para cada una de las 8 rutas, incluyendo tasa formateada cuando existe.
- `buildStructuredData` produce `WebSite` + `WebApplication` válidos en `/`, `BreadcrumbList` en subrutas, y `FAQPage` válido cuando hay FAQs.
- `buildSitemapXml` incluye las 8 rutas públicas, excluye `/api/*`, y formatea `<lastmod>` válido.
- `buildRobotsTxt` incluye `Allow: /`, `Disallow: /api/` y `Sitemap: <site>/sitemap.xml`.

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

- [ ] **Step 3: Implementar `config.ts`, `meta.ts`, `schema.ts`, `faqs.ts`, `sitemap.ts`**

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y confirmar PASS**

- [ ] **Step 5: Commit Task 4**

```bash
git add web/src/lib/seo/ web/tests/seo.test.ts
git commit -m "feat(web): add SEO metadata, JSON-LD schema, FAQ content, robots and sitemap builders"
```

---

### Task 5: Sistema de Diseño, `BaseLayout.astro`, Iconos, `Navbar`, `Footer` y `Breadcrumbs`

**Files:**
- Create: `web/src/styles/global.css`
- Create: `web/src/components/icons/TrendingUp.astro`
- Create: `web/src/components/icons/TrendingUpDown.astro`
- Create: `web/src/components/icons/ArrowRight.astro`
- Create: `web/src/components/icons/ArrowDownUp.astro`
- Create: `web/src/components/icons/Copy.astro`
- Create: `web/src/components/icons/Paste.astro`
- Create: `web/src/components/icons/Info.astro`
- Create: `web/src/components/icons/XIcon.astro`
- Create: `web/src/components/Navbar.astro`
- Create: `web/src/components/Footer.astro`
- Create: `web/src/components/Breadcrumbs.astro`
- Create: `web/src/layouts/BaseLayout.astro`
- Create: `web/src/scripts/theme.ts`
- Test: `web/tests/theme-logic.test.ts`

**Interfaces:**
- Consumes: `PageMeta`, `BreadcrumbItem` de `src/lib/seo/`.
- Produces: `computeNextColorScheme(currentRendered, systemPrefersDark): { stored: "light" | "dark" | null; metaContent: "light" | "dark" | "light dark" }` + layout shell + componentes base.

- [ ] **Step 1: Escribir test fallido para la lógica tri-estado de `dark-mode-toggle` en `web/tests/theme-logic.test.ts`**

Verificar que al hacer toggle back al esquema del sistema se devuelve `stored: null` (`metaContent: "light dark"`), mientras que al invertirlo se devuelve `"dark"` o `"light"` literal.

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

- [ ] **Step 3: Implementar `global.css` (con tokens de `Colors.ts`, `color-scheme: light dark`, `light-dark()` + `@media (prefers-color-scheme: dark)` fallback, `:focus-visible`, `@fontsource/poppins`), iconos SVG idénticos a `components/icons/`, `theme.ts`, `BaseLayout.astro`, `Navbar.astro`, `Footer.astro` y `Breadcrumbs.astro`**

Asegurar:
- `<meta name="color-scheme" content="light dark">` seguido inmediatamente por `<script is:inline>` que lee `localStorage.getItem("color-scheme")` con `try..catch`.
- Un solo `<main id="main-content">` y skip link accesible.
- Una única región `<div id="app-live-region" aria-live="polite" class="sr-only"></div>` para anunciar copias y actualizaciones.
- Iconos decorativos con `aria-hidden="true"`.

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y confirmar PASS**

- [ ] **Step 5: Commit Task 5**

```bash
git add web/src/styles/ web/src/components/icons/ web/src/components/Navbar.astro web/src/components/Footer.astro web/src/components/Breadcrumbs.astro web/src/layouts/BaseLayout.astro web/src/scripts/theme.ts web/tests/theme-logic.test.ts
git commit -m "feat(web): add BaseLayout, design tokens, theme toggle, icons and navigation shell"
```

---

### Task 6: Calculadora Fiel a la App + Drawer/Modal de Tendencias + Clientes TS

**Files:**
- Create: `web/src/components/CalculatorCard.astro`
- Create: `web/src/components/RateHistoryPanel.astro`
- Create: `web/src/components/RateHistoryDrawer.astro`
- Create: `web/src/scripts/calculator-state.ts` (estado puro testeable)
- Create: `web/src/scripts/calculator-client.ts`
- Create: `web/src/scripts/history-client.ts`
- Create: `web/src/scripts/drawer-client.ts`
- Test: `web/tests/calculator-state.test.ts`

**Interfaces:**
- Consumes: `ResolvedRate[]`, `HistorySeries`, `formatCurrency`, `parseDigitsToCents`, `parseClipboardAmount`, `convertAmount`, `resolveEffectiveRate`.
- Produces: máquina de estado pura de calculadora + UI idéntica a `app/index.tsx`, `components/Currency.tsx`, `components/Convertions.tsx`, `components/BottomDrawer.tsx`, `components/RateHistory.tsx`.

- [ ] **Step 1: Escribir tests fallidos en `web/tests/calculator-state.test.ts`**

Verificar:
- Inicialización: `foreign = 1`, `bs = 1 * activeRate`.
- Entrada céntimo-a-céntimo en `Bs` o `foreign`: digitar `"2"`, `"23"`, `"2350"` recalcula el otro input automáticamente.
- `resetOnFocus`: al enfocar resetea ambos montos a `0` (`0,00`).
- Cambio de fuente (`selectSource`) y toggle de modo BCV (`"current"` vs `"next"`): recalcula preservando `lastEdited`.
- Construcción de puntos SVG para el gráfico multi-fuente (`buildChartModel`) con `Mínimo`, `Máximo` y `Variación %`.

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

- [ ] **Step 3: Implementar `calculator-state.ts`, `CalculatorCard.astro`, `RateHistoryPanel.astro`, `RateHistoryDrawer.astro`, `calculator-client.ts`, `history-client.ts`, `drawer-client.ts`**

Reglas obligatorias aplicadas:
- `<dialog id="history-dialog" closedby="any" aria-labelledby="history-dialog-title">` con fallback Safari en `drawer-client.ts` y `overscroll-behavior: contain` en `dialog:modal` y `dialog::backdrop` (`overflow: hidden`).
- Input céntimo-a-céntimo con mismo aspecto `50px`, `borderRadius: 10px`, prefijo izquierdo, fondo/borde focus sutil, botón copiar con icono checkmark por `1.5s`, popover `"Pegar"` en long-press / click derecho / botón contextual accesible, y `aria-valuetext` sincronizado.
- Grilla `Fuentes` de 2 columnas (`48%`, última `100%` si impar), card activa `#16a249` + borde `2px solid #037c2f`.
- Persistencia offline en `localStorage` (`cached_rates` y `cached_history_${currencyId}`) + refresh contra `/api/rates.json` mostrando píldora `Tag` (`Actualizado` / `Sin conexión` / `Error al actualizar`).

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y confirmar PASS**

- [ ] **Step 5: Commit Task 6**

```bash
git add web/src/components/CalculatorCard.astro web/src/components/RateHistoryPanel.astro web/src/components/RateHistoryDrawer.astro web/src/scripts/ web/tests/calculator-state.test.ts
git commit -m "feat(web): implement app-parity calculator, sources grid, history chart and accessible modal drawer"
```

---

### Task 7: Bloques Below-the-Fold SEO, Todas las Rutas y Endpoints API/Sitemap/Robots

**Files:**
- Create: `web/src/components/EquivalenceTable.astro`
- Create: `web/src/components/BrechaSummary.astro`
- Create: `web/src/components/FaqSection.astro`
- Create: `web/src/pages/index.astro`
- Create: `web/src/pages/dolar-bcv.astro`
- Create: `web/src/pages/euro-bcv.astro`
- Create: `web/src/pages/usdt-binance.astro`
- Create: `web/src/pages/brecha-cambiaria.astro`
- Create: `web/src/pages/tendencias.astro`
- Create: `web/src/pages/preguntas-frecuentes.astro`
- Create: `web/src/pages/privacidad.astro`
- Create: `web/src/pages/robots.txt.ts`
- Create: `web/src/pages/sitemap.xml.ts`
- Create: `web/src/pages/api/rates.json.ts`
- Create: `web/src/pages/api/history.json.ts`
- Test: `web/tests/routes-contracts.test.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `CalculatorCard`, `RateHistoryDrawer`, `RateHistoryPanel`, `EquivalenceTable`, `BrechaSummary`, `FaqSection`, `fetchLatestRatesSnapshot`, `fetchRatesHistory`, `buildPageMeta`, `buildStructuredData`, `getFaqsForRoute`, `buildSitemapXml`, `buildRobotsTxt`.
- Produces: las 8 páginas HTML completas + 4 endpoints dinámicos.

- [ ] **Step 1: Escribir tests fallidos en `web/tests/routes-contracts.test.ts`**

Verificar:
- Que las 8 páginas, `robots.txt.ts`, `sitemap.xml.ts`, `rates.json.ts` y `history.json.ts` existen y exportan `prerender` correcto (`true` para `/preguntas-frecuentes` y `/privacidad`; `false` para las demás).
- Que ningún `<summary>` contiene etiquetas `<h1>`–`<h6>` anidadas.
- Que `FaqSection` y `EquivalenceTable` usan marcado semántico accesible (`<table>`, `<caption>`, `<th scope>`, `@container`).
- Que en errores SSR se usa `Cache-Control: public, max-age=0, must-revalidate` (y nunca `no-store`).

- [ ] **Step 2: Ejecutar `pnpm --dir web test` y confirmar FAIL**

- [ ] **Step 3: Implementar `EquivalenceTable.astro`, `BrechaSummary.astro`, `FaqSection.astro` y todas las rutas y endpoints**

Asegurar:
- Exactamente un `<h1>` por página.
- En `/`: la calculadora ocupa limpiamente el centro *above the fold* manteniendo el look exacto de la app móvil, y debajo viven la tabla rápida, el resumen de brecha, los accesos internos por moneda y la FAQ breve.
- En `/dolar-bcv`, `/euro-bcv`, `/usdt-binance`: la calculadora aparece pre-fijada con esa divisa y muestra su tabla específica + tendencia 7D + FAQ de la moneda.
- En `/brecha-cambiaria`: comparador interactivo dedicado de monto en BCV vs USDT + desglose porcentual y en Bs.
- En `/tendencias`: gráfico multi-fuente interactivo (`7D`/`15D`/`30D`) + tabla HTML semántica con los promedios diarios de los últimos 30 días.
- En `/privacidad`: contenido completo y fiel de `PRIVACY_POLICY.md`.

- [ ] **Step 4: Ejecutar `pnpm --dir web test` y `pnpm --dir web check` y verificar PASS sin errores**

Run:
```bash
pnpm --dir web test && pnpm --dir web check
```
Expected: Todos los tests unitarios pasan y `astro check` finaliza con 0 errores (NO ejecutar `build`).

- [ ] **Step 5: Commit Task 7**

```bash
git add web/src/components/EquivalenceTable.astro web/src/components/BrechaSummary.astro web/src/components/FaqSection.astro web/src/pages/ web/tests/routes-contracts.test.ts
git commit -m "feat(web): add all SEO pages, below-the-fold semantic sections and API/sitemap endpoints"
```

---

### Task 8: Verificación Final Integral (Sin Build) y Actualización de Memoria

**Files:**
- Verify: todos los archivos en `web/` y estado limpio de raíz (`app/index.tsx` y `components/Currency.tsx` sin cambios adicionales).

- [ ] **Step 1: Auditoría de integridad y verificación completa**

Ejecutar:
```bash
pnpm --dir web test && pnpm --dir web check && git status -s
```
Verificar:
1. Todos los tests unitarios pasan al 100%.
2. `astro check` termina con 0 errores.
3. No existe carpeta `web/dist` ni se corrió ningún comando `build`.
4. `app/`, `components/`, `android/`, `ios/`, `eas.json` no fueron tocados por esta implementación.

- [ ] **Step 2: Guardar resumen y aprendizajes en Engram (`mem_save` / `mem_session_summary`)**
