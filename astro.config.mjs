// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: ([tailwindcss()])
  },

  integrations: [icon({
    include: {
      lucide: ['*'], // Loads entire Lucide icon set
    },
  })],

  redirects: {
    "/": "/recipes/101",
    "/recipes": "/recipes/101"
  }
});
