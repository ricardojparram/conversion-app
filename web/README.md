# Cambio rápido — Web (Astro + Vercel)

Aplicación web SSR/ISR en [Astro 7](https://astro.build/) desplegada en Vercel (`web/`) para consultar y calcular tasas de cambio en Venezuela (**Dólar BCV**, **Euro BCV** y **USDT Venta Binance P2P**), brecha cambiaria e historial de los últimos 60 días.

## Arquitectura y rutas principales

| Ruta | Estrategia | Propósito |
| --- | --- | --- |
| `/` | SSR + ISR (`120s`) | Calculadora principal, brecha resumen y equivalencias rápidas |
| `/dolar-bcv`, `/euro-bcv`, `/usdt-binance`, `/brecha-cambiaria` | SSR + ISR (`120s`) | Vistas dedicadas, historial y tablas por fuente / brecha |
| `/tendencias` | SSR + ISR (`120s`) | Historial tabular continuo (incluye fines de semana/feriados con tasa vigente anterior) |
| `/preguntas-frecuentes`, `/privacidad`, `/404` | Estática (`prerender = true`) | Guías frecuentes, aviso legal y página 404 (`noindex`) |
| `/api/rates.json`, `/api/history.json` | SSR dinámico (`noindex`) | Endpoints JSON consumidos únicamente desde el mismo origen (`/sw.js` y scripts cliente) |
| `/og/[route].png` | SSR dinámico (`@resvg/resvg-wasm`) | Tarjetas Open Graph PNG (`1200×630`) |
| `/robots.txt`, `/sitemap.xml` | SSR dinámico | Indexación condicional según `PUBLIC_INDEXABLE` y dominio activo |

## Desarrollo y verificación local

Desde `web/`:

```bash
pnpm install
pnpm dev         # Servidor local de desarrollo (http://localhost:4321)
pnpm run check   # Chequeo de tipos Astro + TypeScript
pnpm test        # Suite de pruebas unitarias y contratos (incluye sincronía de hashes CSP)
```

> [!NOTE]
> Este subproyecto coexiste con la app Expo en la raíz del repositorio. En [`astro.config.mjs`](./astro.config.mjs), `vite.tsconfig` está fijado explícitamente a [`web/tsconfig.json`](./tsconfig.json) para evitar que Rolldown/Vite herede `expo/tsconfig.base` en despliegues monorepo.

## Variables de entorno

Las variables se leen en Vercel (`Production` / `Preview`) y localmente desde `web/.env` o `web/.env.local` (ignorado en git):

| Variable | Requerida | Uso |
| --- | --- | --- |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase (lectura server-side de tasas e historial) |
| `SUPABASE_KEY` | Sí | Clave pública/anon o key de lectura usada por [`src/lib/rates/supabase.ts`](./src/lib/rates/supabase.ts) |
| `PUBLIC_SITE_URL` | Al comprar dominio | Origen canónico público (ej. `https://cambiorapido.app`). Sin ella, se infiere `VERCEL_PROJECT_PRODUCTION_URL` o `VERCEL_URL`. |
| `PUBLIC_INDEXABLE` | Al lanzar dominio | Por defecto indexa en dominios propios y bloquea (`noindex`) en subdominios `*.vercel.app`. Definir `"true"` si se fuerza indexación explícita. |
| `PUBLIC_CONTACT_EMAIL` | Opcional | Email de contacto público en JSON-LD (`Organization.contactPoint`); si está vacío se omite. |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Opcional | Token `<meta name="google-site-verification">` para Search Console. |

### Checklist al conectar dominio propio

1. Asociar el dominio en Vercel (**Domains** del proyecto `cambio-rapido`).
2. Configurar `PUBLIC_SITE_URL=https://tudominio.com` en Vercel y redeployar.
3. Verificar `/robots.txt`, `/sitemap.xml` y etiquetas `<link rel="canonical">` en el HTML emitido.
4. Registrar la propiedad en Google Search Console (opcionalmente usando `PUBLIC_GOOGLE_SITE_VERIFICATION`) y enviar `/sitemap.xml`.

## Seguridad HTTP y Content Security Policy (CSP)

Las cabeceras de seguridad se configuran en [`vercel.json`](./vercel.json) para cubrir de forma uniforme páginas SSR/ISR, rutas prerenderizadas estáticas, endpoints JSON y recursos en `public/` (incluyendo `frame-ancestors 'none'`, que no funciona en etiquetas `<meta>`).

### Cabeceras aplicadas

| Cabecera | Ruta(s) | Qué protege |
| --- | --- | --- |
| `Content-Security-Policy` | `/(.*)` | Restringe qué scripts, estilos, fuentes, imágenes, workers (`sw.js`), peticiones (`fetch`), formularios y marcos (`iframe`) puede ejecutar o cargar el navegador. |
| `Cross-Origin-Resource-Policy: same-origin` | `/(.*)` | Evita que sitios externos lean respuestas HTML, endpoints JSON (`/api/*`) o bundles `/_astro/*` mediante peticiones cross-origin. |
| `Cross-Origin-Resource-Policy: cross-origin` | `/og/(.*)` y recursos públicos (`/og-image.png`, `/icon-192.png`, `/icon-512.png`, `/favicon.ico`, `/favicon.svg`) | Permite que WhatsApp, X, LinkedIn, Telegram y navegadores lean las tarjetas Open Graph e íconos públicos sin bloquear las vistas previas. |
| `Cross-Origin-Opener-Policy: same-origin-allow-popups` | `/(.*)` | Aísla el contexto `window.opener` frente a ventanas externas evitando ataques XS-Leaks. |
| `X-Frame-Options: DENY` | `/(.*)` | Defensa complementaria contra clickjacking junto a `frame-ancestors 'none'`. |
| `X-Content-Type-Options: nosniff` | `/(.*)` | Impide MIME-type sniffing en scripts, hojas de estilo y respuestas JSON. |
| `Referrer-Policy: strict-origin-when-cross-origin` | `/(.*)` | Evita filtrar rutas completas al navegar hacia orígenes externos. |
| `Permissions-Policy` | `/(.*)` | Deshabilita `camera`, `geolocation`, `microphone`, `accelerometer` y `focus-without-user-activation`. |
| `Strict-Transport-Security` | Edge Vercel | Servida automáticamente por Vercel (`max-age=63072000; includeSubDomains; preload`) en producción HTTPS. |

### Detalle de directivas CSP y decisiones técnicas

Política activa en [`vercel.json`](./vercel.json):

- **`default-src 'self'`**: Cualquier tipo de recurso no listado explícitamente solo puede cargarse desde el mismo origen.
- **`script-src 'self' 'sha256-...' 'report-sample'`**:
  - Permite los módulos propios en `/_astro/*.js` y **únicamente** el script inline de bootstrap del tema (`color-scheme`) en [`BaseLayout.astro`](./src/layouts/BaseLayout.astro), identificado por su hash SHA-256 exacto.
  - No usa `'unsafe-inline'`, `'unsafe-eval'` ni **`'strict-dynamic'`** (con propósito: en páginas con caché ISR de 120s no es seguro emitir nonces por petición, y añadir `'strict-dynamic'` hace que los navegadores ignoren `'self'` bloqueando `/_astro/*.js`).
  - [`astro.config.mjs`](./astro.config.mjs) desactiva el inline automático de chunks JS pequeños (`assetsInlineLimit` retorna `false` para `.js`/`.mjs`) y [`navbar.ts`](./src/scripts/navbar.ts) vive dentro del bundle externo compartido de [`BaseLayout.astro`](./src/layouts/BaseLayout.astro) para que no aparezcan bloques `<script type="module">` inline sin hash.
- **`script-src-attr 'none'`**: Bloquea manejadores inline en atributos HTML (`onclick=`, `onerror=`, etc.).
- **`style-src 'self' 'unsafe-inline'; style-src-elem 'self'; style-src-attr 'unsafe-inline'`**:
  - `build.inlineStylesheets: "never"` en [`astro.config.mjs`](./astro.config.mjs) fuerza todas las hojas de estilo a emitirse como `<link rel="stylesheet" href="/_astro/*.css">`.
  - Así, en navegadores modernos `style-src-elem 'self'` bloquea cualquier etiqueta `<style>` inyectada, mientras `style-src-attr 'unsafe-inline'` permite los atributos dinámicos `style="..."` usados en barras de porcentaje, marcadores de gráficas SVG y etiquetas de tablas responsivas; `style-src` sirve de fallback compatible para motores antiguos.
- **`img-src 'self' data:` / `font-src 'self'` / `connect-src 'self'` / `manifest-src 'self'` / `worker-src 'self'`**: Sin SDKs, fuentes ni scripts de terceros; incluso el Service Worker ([`public/sw.js`](./public/sw.js)) solo intercepta y cachea peticiones del mismo origen.
- **`object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`**: Bloquean plugins heredados, secuestro de `<base>`, envío de formularios externos, embebido en iframes y cargas por HTTP plano.
- **Trusted Types (`require-trusted-types-for 'script'`)**: Queda documentado como mejora futura; activarlo hoy rompería las asignaciones `innerHTML` existentes en `calculator-client.ts` y `history-client.ts` hasta migrar esos nodos a DOM/Sanitizer API (`setHTML()`) o envolverlos en una política `trustedTypes.createPolicy(...)` con escape estricto.

### Alcance real: qué protege CSP y qué NO protege

- **Sí protege:** Impide que cualquier script no autorizado inyectado en el HTML de tu página (XSS, inyección en el DOM, scripts externos añadidos sin permiso o redirecciones vía JS dentro del sitio) se ejecute en el navegador del usuario.
- **No protege:** Redirecciones que ocurren **fuera** de tu sitio antes de cargar o fuera del contexto de tu origen (por ejemplo: extensiones maliciosas en el dispositivo, secuestro de DNS/router, anuncios de un motor de búsqueda previo o entrar a un dominio distinto homónimo como `.com`). En la app no existen scripts ni redes publicitarias de terceros.

### Cómo mantener el hash SHA-256 al editar `BaseLayout.astro`

Si modificás el `<script is:inline>` de preferencia de tema en [`src/layouts/BaseLayout.astro`](./src/layouts/BaseLayout.astro), recalculá su digest SHA-256 y actualizalo en [`vercel.json`](./vercel.json):

```bash
node -e '
const fs = require("fs"), crypto = require("crypto");
const html = fs.readFileSync("src/layouts/BaseLayout.astro", "utf8");
const m = html.match(/<script\s+is:inline>([\s\S]*?)<\/script>/);
console.log("sha256-" + crypto.createHash("sha256").update(m[1], "utf8").digest("base64"));
'
```

La suite [`tests/routes-contracts.test.ts`](./tests/routes-contracts.test.ts) verifica automáticamente en `pnpm test` que:
1. No existan `<script>` ejecutables inline adicionales ni `<style is:inline>` en `src/`.
2. El hash calculado del `<script is:inline>` en `BaseLayout.astro` coincida exactamente con `Content-Security-Policy` en [`vercel.json`](./vercel.json).
3. Todas las directivas obligatorias de CSP y excepciones de CORP sigan presentes.
