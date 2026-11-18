import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '.nuxt/',
      '.output/',
      '.wrangler/',
      'node_modules/',
      'generated/',
      'test-results/',
      'playwright-report/',
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // Los auto-imports de Nuxt no están declarados en el scope del módulo.
      // vue-tsc ya detecta identificadores inexistentes.
      'no-undef': 'off',
      // El vocabulario visual del proyecto (Button, Card, Dialog…) es el contrato.
      'vue/multi-word-component-names': 'off',
      // Prettier es dueño del formato de las plantillas: estas reglas de
      // `flat/recommended` reescriben lo que `pnpm format` vuelve a escribir.
      'vue/singleline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-self-closing': 'off',
      // Prettier indenta y cierra el `>` a su manera cuando un atributo largo
      // fuerza el salto de línea (p. ej. spans con `{{ }}` anidados).
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      // No entiende `defineProps<T>()`: una prop opcional tipada (`foo?: T`)
      // ya es `undefined` por defecto.
      'vue/require-default-prop': 'off',
    },
  },
  {
    // Utilidades de test que corren en Node (stub del API, setup de Playwright).
    files: ['test/e2e/support/**/*.{ts,mjs}', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
];
