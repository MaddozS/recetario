module.exports = {
  root: true,
  extends: ['@recetario/config/eslint.base.cjs'],
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      plugins: ['astro'],
      extends: ['plugin:astro/recommended'],
    },
  ],
};
