# Diseño: Cambio Rápido Web en Astro (Paridad UI/UX + Arquitectura SEO)

**Fecha:** 2026-11-09  
**Estado:** Borrador para revisión del usuario  
**Alcance:** Versión web en Astro dentro de `web/`, manteniendo la app móvil de Expo (`android/`, `ios/`, `app/`, `components/`) intacta en la raíz del repositorio.

---

## 1. Contexto y Objetivos

La versión web actual de Cambio Rápido exportada con Expo Web (`expo export -p web`) presenta visibilidad orgánica casi nula por razones técnicas verificadas:
- El HTML estático exportado (`dist/index.html`) tiene `<title></title>` vacío, sin `<meta name="description">`, sin `canonical`, sin Open Graph ni `Schema.org`.
- No existen `robots.txt` ni `sitemap.xml`, y `vercel.json` reescribe todas las rutas hacia `/` como SPA.
- El contenido inicial es un `<div id="root"></div>` vacío hasta que ejecuta React Native Web en el cliente.

**Objetivos de esta arquitectura:**
1. **Paridad visual y funcional con la app móvil:** los usuarios habituales deben sentir exactamente la misma interfaz y comportamiento de calculadora que ya usan y prefieren en la app (`#16a249`, Poppins, entrada céntimo-a-céntimo, reset on focus, copia/pega, cards de fuentes y drawer/modal de tendencia).
2. **Navegación real multi-ruta + SEO técnico superior:** capturar búsquedas sin marca de alta intención en Venezuela (*dólar BCV hoy, euro BCV hoy, USDT Binance, brecha cambiaria, tendencias históricas*) sirviendo HTML completo con tasas vivas desde el primer byte (SSR + Vercel ISR), datos estructurados `JSON-LD`, Core Web Vitals al máximo y enlazado interno real.
3. **Convivencia limpia en el repo:** mantener Expo funcionando sin cambios en la raíz para Android/iOS mientras Vercel pasa a desplegar desde `web/`.

> **Nota realista sobre posicionamiento:** Pasar a Astro resuelve el 100% de las barreras técnicas de indexación, velocidad y arquitectura multi-ruta frente a SPAs como `alcambio.app`. Sin embargo, superar a competidores establecidos requiere además registrar el dominio propio (ej. `cambiorapido.app` / `.com`), darlo de alta en Google Search Console y construir autoridad externa (enlaces desde tiendas cuando la app esté publicada, menciones y uso recurrente).

---

## 2. Arquitectura del Proyecto y Despliegue

### 2.1 Ubicación en el Repositorio

```text
cambio-rapido/
├── app/                     # Expo Router (móvil intacto)
├── components/              # Componentes Expo (intactos)
├── android/ & ios/          # Builds nativos (intactos)
├── docs/superpowers/specs/  # Documentos de diseño
└── web/                     # Nuevo proyecto Astro + Tailwind CSS v4 + Vercel ISR
    ├── package.json         # Dependencias aisladas (pnpm)
    ├── astro.config.mjs     # output: 'static' + adapter vercel({ isr: { expiration: 120 } })
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── public/
    │   ├── favicon.ico
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   ├── manifest.json
    │   └── og-image.png     # 1200x630 para Open Graph / Twitter
    └── src/
        ├── styles/
        │   └── global.css   # Tokens de Colors.ts + Tailwind v4 + Poppins
        ├── lib/
        │   ├── rates/       # Lógica pura y cliente Supabase (testeable sin DOM)
        │   │   ├── types.ts
        │   │   ├── caracas-date.ts
        │   │   ├── bcv-validity.ts
        │   │   ├── calculator.ts
        │   │   ├── format.ts
        │   │   ├── brecha.ts
        │   │   ├── history.ts
        │   │   └── supabase.ts
        │   └── seo/         # Generadores puros de metadata y JSON-LD
        │       ├── config.ts
        │       ├── meta.ts
        │       └── schema.ts
        ├── layouts/
        │   └── BaseLayout.astro
        ├── components/
        │   ├── Navbar.astro
        │   ├── Footer.astro
        │   ├── Breadcrumbs.astro
        │   ├── CalculatorCard.astro      # Réplica fiel above-the-fold de app/index.tsx
        │   ├── RateHistoryDrawer.astro   # Modal/BottomDrawer fiel a BottomDrawer + RateHistory
        │   ├── RateHistoryPanel.astro    # Panel embebido para /tendencias
        │   ├── EquivalenceTable.astro    # Tabla HTML indexable de montos
        │   ├── BrechaSummary.astro       # Comparativa porcentual y en Bs
        │   ├── FaqSection.astro          # Acordeón HTML nativo (<details>) + JSON-LD
        │   └── icons/                    # SVGs fieles a components/icons/*
        ├── scripts/
        │   ├── calculator-client.ts      # Entrada céntimo-a-céntimo, copy/paste, refresh, offline
        │   ├── history-client.ts         # Interactividad 7D/15D/30D + multi-fuente + SVG
        │   └── drawer-client.ts          # Comportamiento responsive modal/drawer
        └── pages/
            ├── index.astro
            ├── dolar-bcv.astro
            ├── euro-bcv.astro
            ├── usdt-binance.astro
            ├── brecha-cambiaria.astro
            ├── tendencias.astro
            ├── preguntas-frecuentes.astro
            ├── privacidad.astro
            ├── robots.txt.ts
            ├── sitemap.xml.ts
            └── api/
                ├── rates.json.ts
                └── history.json.ts
```

### 2.2 Configuración de Astro y Vercel

- **Modo de renderizado:** `output: 'static'` con `@astrojs/vercel` configurado con `isr: { expiration: 120 }` (revalidación cada 2 minutos en el edge CDN de Vercel).
  - Rutas estáticas (`export const prerender = true`): `/preguntas-frecuentes`, `/privacidad`.
  - Rutas dinámicas con tasas vivas (`export const prerender = false`): `/`, `/dolar-bcv`, `/euro-bcv`, `/usdt-binance`, `/brecha-cambiaria`, `/tendencias`, `/robots.txt`, `/sitemap.xml`.
  - Endpoints JSON de respaldo/actualización rápida: `/api/rates.json` (`Cache-Control: public, s-maxage=30, stale-while-revalidate=60`) y `/api/history.json` (`Cache-Control: public, s-maxage=300, stale-while-revalidate=600`).
- **Configuración de Vercel:** En el proyecto de Vercel se configura `Root Directory = web` (sin modificar `eas.json` ni los archivos nativos de Expo en la raíz).
- **Variables de entorno en `web/`:**
  - `PUBLIC_SITE_URL`: URL canónica base (fallback `https://cambiorapido.app` hasta adquirir el dominio definitivo).
  - `SUPABASE_URL` / `SUPABASE_KEY` (con fallback a `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` o `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` para lectura exclusiva desde servidor Astro SSR y endpoints `/api/*`, evitando duplicar configuración innecesaria).

---

## 3. Navegación, Mapa de Rutas y Estrategia SEO

### 3.1 Navegación Visible

- **Header superior limpio:**
  - Marca a la izquierda (`TrendingUp` + `Cambio rápido` enlazando a `/`).
  - Links principales de navegación:
    - `Calculadora` (`/`)
    - `Dólar BCV` (`/dolar-bcv`)
    - `Euro BCV` (`/euro-bcv`)
    - `USDT Binance` (`/usdt-binance`)
    - `Brecha` (`/brecha-cambiaria`)
    - `Tendencias` (`/tendencias`)
  - Botón accesible de cambio de tema (Claro / Oscuro) + menú hamburguesa ligero en pantallas pequeñas.
- **Footer semántico:** incluye todas las rutas de herramientas más `Preguntas Frecuentes` (`/preguntas-frecuentes`) y `Aviso Legal y Privacidad` (`/privacidad`), junto con el descargo informativo resumido.

### 3.2 Intención de Búsqueda por Ruta (Sin Canibalización)

| Ruta | Prerender | Intención / Keywords principales | Contenido Above the Fold | Contenido Below the Fold (SEO) |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `false` (ISR 120s) | Calculadora dólar BCV, cambio rápido Venezuela, tasa BCV y USDT hoy | Calculadora fiel idéntica a la app (`400px` centrada) con todas las fuentes | Tabla rápida de montos, resumen de brecha BCV/USDT, enlaces a monedas, FAQ resumida |
| `/dolar-bcv` | `false` (ISR 120s) | Precio dólar BCV hoy, calcular dólares a bolívares BCV | Calculadora pre-fijada en Dólar BCV + chip **Vigente hoy** vs **Próxima tasa** | Tabla de equivalencias USD→Bs (`1` a `1.000`), tendencia 7D en HTML, FAQ BCV |
| `/euro-bcv` | `false` (ISR 120s) | Euro BCV hoy, euros a bolívares BCV | Calculadora pre-fijada en Euro BCV (`€`) + Vigente vs Próxima tasa | Tabla EUR→Bs (`1` a `1.000`), tendencia 7D, FAQ Euro BCV |
| `/usdt-binance` | `false` (ISR 120s) | USDT a bolívares hoy, dólar Binance P2P Venezuela | Calculadora pre-fijada en USDT Binance (Compra / Venta) | Comparativa Compra vs Venta P2P, tabla USDT→Bs, brecha contra BCV, FAQ P2P |
| `/brecha-cambiaria` | `false` (ISR 120s) | Brecha cambiaria Venezuela hoy, diferencia BCV vs paralelo/USDT | Comparador interactivo de monto en BCV vs USDT (diferencia en `%` y `Bs`) | Desglose del impacto en compras/cambios, historial reciente de brecha, FAQ |
| `/tendencias` | `false` (ISR 120s) | Historial dólar BCV y USDT, fluctuación últimos 30 días | Gráfico SVG interactivo multi-fuente (`7D / 15D / 30D`) | Tabla HTML semántica con promedios diarios de los últimos 30 días (indexable) |
| `/preguntas-frecuentes` | `true` (Static) | Cómo se calcula tasa BCV, qué es fecha valor, cómo funciona P2P | Encabezado editorial y buscador/índice por tema | Preguntas detalladas con `FAQPage` JSON-LD e interlinking a calculadoras |
| `/privacidad` | `true` (Static) | Aviso legal y privacidad Cambio Rápido | Título y fecha de actualización | Texto oficial completo de `PRIVACY_POLICY.md` |

### 3.3 SEO Técnico y Structured Data

- **Canonical y URLs:** cada ruta emite `<link rel="canonical" href="${SITE_URL}${pathname}" />` normalizado sin barra final ambigua (excepto `/`), `hreflang="es-VE"`, `og:locale="es_VE"`, `robots="index, follow"`.
- **Títulos y descripciones dinámicas:**
  - Generados vía `src/lib/seo/meta.ts`. En páginas de tasa (`/dolar-bcv`, `/euro-bcv`, `/usdt-binance`), cuando el valor en SSR está disponible se incluye la tasa vigente formateada en el `<title>` o `description` respetando longitudes óptimas (`≤60` chars title, `≤155` chars description) para maximizar CTR.
- **JSON-LD (`Schema.org`) vía `src/lib/seo/schema.ts`:**
  - `/` incluye `WebSite` + `Organization` + `WebApplication` (`applicationCategory: "FinanceApplication"`, `operatingSystem: "Web"`).
  - Subpáginas incluyen `BreadcrumbList`.
  - Rutas con preguntas incluyen `FAQPage`.
- **Rastreo:**
  - `/robots.txt` (`src/pages/robots.txt.ts`) permite rastreo completo (`Allow: /`, `Disallow: /api/`) y apunta explícitamente a `Sitemap: ${SITE_URL}/sitemap.xml`.
  - `/sitemap.xml` dinámico devuelve todas las URLs públicas con `<lastmod>` tomado de la fecha más reciente de actualización en Supabase y `<changefreq>`/`<priority>` diferenciados.

---

## 4. Paridad Visual y Funcional con la App Móvil

Para respetar la preferencia explícita de los usuarios actuales de Cambio Rápido, **el núcleo interactivo replica fielmente la UI y comportamiento de la app Expo**:

1. **Paleta y tipografía exactas (`src/styles/global.css`):**
   - Light: `text: #25364b`, `textSecondary: rgba(0, 0, 0, 0.5)`, `background: #f9fafc`, `backgroundSecondary: #ffffff`, `backgroundFocus: #f0f4f8`, `border: rgba(0, 0, 0, 0.2)`, `borderFocus: rgba(0, 0, 0, 0.4)`, `icon/primary: #16a249`, `tint: #d67d00`.
   - Dark: `text: #e6eff8`, `textSecondary: rgba(255, 255, 255, 0.8)`, `background: #0e151d`, `backgroundSecondary: #1a2633`, `backgroundFocus: #253547`, `border: rgba(255, 255, 255, 0.2)`, `borderFocus: rgba(255, 255, 255, 0.4)`, `icon/primary: #16a249`, `tint: #eb8a02`.
   - Fuente **Poppins** (400 Regular, 600 SemiBold, 700 Bold) auto-hospedada con `@fontsource/poppins` para cero layout shift (`CLS = 0`).
   - Script `is:inline` mínimo en `<head>` lee `localStorage.theme` / `prefers-color-scheme` antes del primer pintado para evitar flash blanco en dark mode.

2. **Comportamiento exacto de la Calculadora (`CalculatorCard.astro` + `calculator-client.ts`):**
   - Contenedor central de `max-width: 400px` en la zona hero (above the fold):
     - Título con icono `TrendingUp` (`#16a249`) + subtítulo dinámico (`Bolívares → Dólares`, `Bolívares → Euros`, `Bolívares → USDT` según fuente activa).
     - **Dos inputs (`Bolívares` y divisa destino) con entrada céntimo-a-céntimo de derecha a izquierda:**
       - Digitar `2`, `3`, `5`, `0` produce `0,02` → `0,23` → `2,35` → `23,50`, idéntico a `components/Currency.tsx`.
       - Al recibir foco (`onFocus`), limpia los inputs a `0,00` (paridad con `resetInputs()`).
       - Valor inicial al cargar la página: equivalente a `1` unidad de la divisa seleccionada (ej. `$1,00` ↔ tasa en `Bs`).
       - Estados visuales exactos: altura `50px`, `borderRadius: 10px`, prefijo izquierdo (`Bs`, `$`, `€`, `USDT`), fondo y borde sutil en focus (`backgroundFocus` / `borderFocus`), **sin borde verde chillón**.
       - Botón **Copiar** a la derecha con icono `Copy` que cambia a checkmark verde por `1.5s`, copiando el monto formateado (ej. `1.001,19 Bs`).
       - Soporte de **Pegar** desde menú contextual / evento `paste` y popover/botón discreto de `"Pegar"` usando la misma regex de parseo numérico (`/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/`).
       - **Mejora invisible de accesibilidad (sin alterar UI):** el `<input inputmode="numeric">` mantiene `aria-label`, `aria-valuetext` actualizado con el monto legible y live region discreta para lectores de pantalla y Lighthouse 100 Accessibility.
   - Separador central con icono `ArrowDownUp` (`#16a249`).
   - Sección **Fuentes** + etiqueta `"Actualizado: dd/mm/aa h:mm AM/PM"` en hora Caracas:
     - Grilla de 2 columnas (`48%` c/u; si el total es impar, el último elemento ocupa `100%`, idéntico a `components/Convertions.tsx`).
     - Card activa: fondo `#16a249`, borde `2px solid #037c2f`, texto blanco. Card inactiva: `backgroundSecondary`, borde `1px`, nombre en `textSecondary`, tasa en `#16a249`.
     - En rutas BCV (`/dolar-bcv`, `/euro-bcv`) y cuando exista próxima tasa publicada (`caracasDayStart(now) <= caracasDayStart(date_old)` con `rate !== rate_old`), se muestra un selector discreto para alternar entre **Tasa vigente hoy** (`rate_old`) y **Próxima tasa BCV** (`rate`).
   - Botón **"Ver tendencia y fluctuación"** (`TrendingUpDown`):
     - Abre el modal centrado en desktop (`440px`, botón circular de cierre) o drawer inferior en móvil (`borderTopLeft/RightRadius: 24px`, handle de arrastre), fiel a `BottomDrawer.tsx` + `RateHistory.tsx`:
       - Selector `7D` / `15D` / `30D`, pills comparativas por fuente (`BCV` verde `#16a249`, `Paralelo/USDT` rojo `#ea4335`, `Promedio` azul `#2563eb`), métricas `Mínimo` / `Máximo` / `Variación ▲▼`, gráfico SVG con gradiente e indicador circular en el último punto, tabla comparativa multi-fuente y desplegable `"Ver historial detallado"`.
     - Además incluye un enlace discreto `"Ver página completa de tendencias →"` hacia `/tendencias`.

---

## 5. Flujo de Datos, Precisión Cambiaria y Resiliencia

### 5.1 Lectura de Tasas Actuales (`get_latest_exchange_rates`)

1. En SSR (`src/lib/rates/supabase.ts`), se invoca `supabase.rpc('get_latest_exchange_rates')` con timeout estricto (`AbortSignal.timeout(3000)`).
2. **Única fuente de verdad para validez BCV (`src/lib/rates/bcv-validity.ts`):**
   - Evaluada siempre en zona horaria `America/Caracas` (`Intl.DateTimeFormat` con `timeZone: 'America/Caracas'`), tanto para fechas de validez como para el formateo de `"Actualizado: ..."` (evitando desfases UTC del servidor Vercel).
   - Si `source === "BCV"` y `date_old` existe, y `caracasDayStart(now) <= caracasDayStart(date_old)`:
     - `effectiveRate = rate_old`, `effectiveDate = date_old`.
     - `nextRate = rate`, `nextDate = date` (disponible si difiere de `effectiveRate`).
   - En caso contrario:
     - `effectiveRate = rate`, `effectiveDate = date`, `nextRate = null`.
   - Esto corrige el desfase menor existente en el `useEffect` inicial de `app/index.tsx` vs `components/Convertions.tsx`.

### 5.2 Historial de Tasas (`7D / 15D / 30D`)

- **Problema evitado:** `database/rates.repository.ts` dispara 30 consultas paralelas por moneda (120 requests para 4 fuentes), y cada moneda de Binance puede superar las 800 filas en 30 días (rozando el límite por defecto de 1.000 filas de PostgREST).
- **Diseño en `src/lib/rates/history.ts`:**
  - En servidor, consulta `exchange_rates` por moneda dentro de la ventana de 30 días en zona `America/Caracas`, paginando con `.range(offset, offset + 999)` únicamente si una moneda supera 1.000 registros en el rango (evitando truncamiento silencioso y reduciendo ~120 requests a ~4-8 requests totales).
  - Agrupa los registros por fecha calendario de Caracas (`YYYY-MM-DD`) calculando el promedio diario (consistente con el commit `f53174e` del repositorio).
  - Para páginas individuales (`/dolar-bcv`, `/euro-bcv`, `/usdt-binance`), puede pedir solo la moneda correspondiente (`7D`) mientras `/tendencias` y el drawer cargan las fuentes seleccionadas bajo demanda con caché en memoria/CDN (`/api/history.json`).
  - **Nota de permisos Supabase:** si la tabla `exchange_rates` llegara a responder error de permisos para el rol `anon`, `history.ts` captura el fallo limpiamente, registra warning en servidor y degrada el bloque de historial sin romper la página ni devolver HTTP 500 (dejando documentada la opción futura de un RPC agregado `get_daily_rate_history` en `conversion-app-supabase`).

### 5.3 Manejo de Errores, Estado Offline y Caché Cliente

- **Resiliencia en SSR:** si Supabase falla o excede el timeout de 3s durante el render en Vercel, las páginas NO lanzan error 500:
  - Renderizan una shell válida con estado informativo (*"Actualizando tasas..."* / último snapshot si hubiera caché) y HTTP 200 (o `Cache-Control: no-store` para que Vercel CDN no cachee una respuesta vacía durante 120s!).
  - El cliente intenta automáticamente recuperar desde `/api/rates.json` y, si está offline, lee `localStorage.getItem('cached_rates')`.
- **Sincronización fresca y PWA:**
  - Cada carga exitosa hidrata `localStorage` (`cached_rates` y `cached_history_${currencyId}`), manteniendo paridad offline con la app web actual.
  - Botón/gesto discreto de actualización manual llama a `/api/rates.json` y muestra el toast/pill `Tag` (`Actualizado`, `Sin conexión`, `Error al actualizar`) fiel a `components/Tag.tsx`.
  - Se conserva `manifest.json` y los íconos PWA en `web/public/`.

---

## 6. Estrategia de Testing

Se implementa suite unitaria con **Vitest** en `web/tests/` cubriendo toda la lógica crítica antes/junto con la implementación:

1. **`caracas-date.test.ts` & `bcv-validity.test.ts`:**
   - Transiciones de fecha en `America/Caracas` vs servidor en `UTC` (ej. 22:00 Caracas = 02:00 UTC del día siguiente).
   - Validación de `rate_old` / `date_old` en viernes tarde / fin de semana (tasa vigente vs próxima tasa fecha valor).
   - Formateo de fecha `"Actualizado: dd/mm/aa h:mm AM/PM"` siempre en hora Caracas.
2. **`format.test.ts` & `calculator.test.ts`:**
   - Entrada céntimo-a-céntimo (`0 → 0,02 → 0,23 → 2,35 → 23,50`), clamp máximo/mínimo y parseo de portapapeles (`"1.001,19 Bs"`, `"$ 25.50"`, `"100,5"`).
   - Formato de montos por encima de `1.000,00 Bs` (`1.001,19 Bs`, `12.345,67 Bs`).
   - Conversiones bidireccionales (`bsToUsd`, `usdToBs`, división segura cuando `rate === 0`).
3. **`brecha.test.ts` & `history.test.ts`:**
   - Cálculo de brecha porcentual y diferencial en Bs entre BCV y USDT.
   - Agrupación de múltiples registros intradía en promedios diarios ordenados cronológicamente en zona Caracas, incluyendo manejo de arrays vacíos y paginación simulada >1.000 filas.
4. **`seo.test.ts`:**
   - Generación de URLs canónicas con y sin trailing slash en `SITE_URL`.
   - Validez estructural de JSON-LD (`WebSite`, `WebApplication`, `BreadcrumbList`, `FAQPage`) y generación del XML de `sitemap.xml` con `<lastmod>` válido.
5. **Verificación de calidad HTML/SEO en build estático/SSR (script de verificación):**
   - Comprobar en pruebas de render/salida que cada ruta tiene un único `<h1>`, `<title>` no vacío, `<meta name="description">`, `<link rel="canonical">`, `JSON-LD` parseable y cero placeholders.
