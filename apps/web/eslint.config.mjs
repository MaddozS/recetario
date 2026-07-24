import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginAstro from "eslint-plugin-astro";

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginAstro.configs.recommended,
  {
    ignores: ["dist/", ".vercel/", ".astro/", "node_modules/", "generated/"],
  },
];
