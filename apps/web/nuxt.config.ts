import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2026-08-01",
  devtools: { enabled: false },
  css: ["~/assets/css/global.css"],
  components: [{ path: "~/components/ui", pathPrefix: false }],
  nitro: {
    preset: "cloudflare_module",
    // Sin `deployConfig`: evitaría `.wrangler/deploy/config.json`, que Wrangler
    // prioriza y que el pipeline Astro todavía usa hasta la Task 13.
    cloudflare: {
      nodeCompat: true,
      // El proxy de plataforma en dev descubre `wrangler.json`/`wrangler.jsonc`
      // desde `srcDir`; sin esto leería el `wrangler.jsonc` de Astro (assets en
      // `./dist/client`, binding a `recetario-api` en producción).
      dev: { configPath: "./wrangler.nuxt.jsonc" },
    },
  },
  // El binding `API` no está conectado al worker del API en `nuxt dev`
  // (instancias separadas de miniflare). El relay reenvía a esta URL.
  runtimeConfig: {
    internalApiUrl: process.env.INTERNAL_API_URL ?? "http://localhost:8787",
  },
  // Los paquetes workspace se consumen como TS crudo (sin build propio).
  build: {
    transpile: [
      "@recetario/types",
      "@recetario/auth",
      "@recetario/config",
      "@recetario/stripe",
    ],
  },
  // Rutas privadas: sin caché compartida y fuera de índices. Las cabeceras las
  // aplica `server/middleware/10.auth.ts` (mismo mecanismo que las cookies, así
  // el contrato es idéntico en dev, e2e y producción) y el layout privado
  // declara además su propio `robots`.
  vite: {
    // `@tailwindcss/vite@4.3.0` se tipa contra Vite 7 y Nuxt 4.5 usa Vite 8
    // (rolldown-vite): la identidad del tipo Plugin difiere, el runtime no.
    plugins: [tailwindcss() as never],
    // La caché de optimización queda fuera de node_modules para sobrevivir a
    // reestructuraciones de pnpm (`.vite-cache/` ya está gitignored).
    cacheDir: "../.vite-cache/web",
  },
  typescript: { strict: true, typeCheck: false },
  app: {
    head: {
      // `data-theme` (preferencia: system|light|dark), `data-accent`, la clase
      // `dark` y las variables del acento los gobierna `app.vue` de forma
      // reactiva; aquí sólo queda el idioma base.
      htmlAttrs: { lang: "es" },
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/kitchcalc_logo.svg" },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/kitchcalc_logo.webp" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap",
        },
      ],
      meta: [
        {
          name: "description",
          content:
            "KitchCalc | Calculadora de costo de recetas, inventario de ingredientes y planificador de produccion.",
        },
        { property: "og:title", content: "KitchCalc | Costeo Inteligente" },
        {
          property: "og:description",
          content:
            "Calculadora de costo de recetas, inventario de ingredientes y planificador de produccion.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      script: [
        {
          // Anti-FOUC: resuelve la clase `dark` antes del primer paint a partir
          // de la preferencia (`data-theme`) y del sistema. El acento y el
          // resto de la apariencia los aplica `app.vue` de forma reactiva.
          innerHTML: `(function () {
  var html = document.documentElement;
  var pref = html.dataset.theme || 'system';
  var dark =
    pref === 'dark' ||
    (pref === 'system' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  html.classList.toggle('dark', dark);
})();`,
        },
      ],
    },
  },
});
