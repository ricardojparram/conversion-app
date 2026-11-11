import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

const webDir = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.join(webDir, ".env.local"),
  path.join(webDir, ".env"),
  path.resolve(webDir, "..", ".env.local"),
  path.resolve(webDir, "..", ".env"),
];

for (const envPath of envCandidates) {
  if (!fs.existsSync(envPath)) continue;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key] && val.length > 0) {
      process.env[key] = val;
    }
  }
}

function normalizeSiteOrigin(raw) {
  const trimmed = (raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const siteUrl =
  normalizeSiteOrigin(process.env.PUBLIC_SITE_URL) ||
  normalizeSiteOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeSiteOrigin(process.env.VERCEL_URL) ||
  "https://cambiorapido.app";

export default defineConfig({
  site: siteUrl,
  output: "static",
  trailingSlash: "never",
  adapter: vercel({
    includeFiles: [
      "src/assets/fonts/Poppins_400Regular.ttf",
      "src/assets/fonts/Poppins_600SemiBold.ttf",
      "src/assets/fonts/Poppins_700Bold.ttf",
      "node_modules/@resvg/resvg-wasm/index_bg.wasm",
    ],
    isr: {
      expiration: 120,
      exclude: [/^\/api\//, /^\/og\//],
    },
  }),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-wasm"],
    },
  },
});
