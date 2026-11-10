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
      exclude: [/^\/api\//],
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
