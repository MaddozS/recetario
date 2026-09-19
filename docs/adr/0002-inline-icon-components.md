# Inline `.astro` components replace the astro-icon library

> **Nota (Task 13b):** decisión de la etapa Astro. El frontend Nuxt usa un único `Icon.vue` alimentado por `app/utils/icon-registry.ts` (`__iconData` de lucide), sin componentes `.astro` ni allowlist. Ver ADR-0009.

We removed `astro-icon` and `@iconify-json/lucide` (along with the `debug` CJS shim that was masking their workerd failure) and replaced them with 47 hand-authored icon components at `packages/ui/src/icons/` — one per icon in the previous `include.lucide` allowlist. Consumers import each icon by name (`import Check from "@recetario/ui/icons/Check.astro"`) so TypeScript catches missing icons at the import line; the iconify CJS chain is gone, so the workerd `module is not defined` class of failure can no longer originate from this surface.

## Considered Options

- **`lucide-static`** (static SVG files served from `node_modules`). Rejected: cheapest migration, but the allowlist stays — every new icon still requires editing two files (the `include.lucide` array and the AGENTS.md rule). The goal of this decision was killing allowlist drift, not just the CJS bug, and this option solves only the latter.
- **`unplugin-icons` (Astro mode).** Rejected: structurally similar to `astro-icon` (depends on `@iconify/utils` for icon resolution), so the CJS interop risk against workerd is the same and unverified. Even if the CJS issue did not recur, it does not address allowlist drift.
- **Hand-rolled SVG snippets in `packages/ui` with no upstream source of truth.** Rejected: same per-file shape as the chosen approach, but icons drift from upstream lucide over time because there is nothing to re-sync against. The chosen approach copies SVG bodies verbatim from the lucide source so a single icon can be re-pasted from `lucide.dev/icons` when upstream updates.
- **Keep `astro-icon` and the `debug` shim.** Rejected: the shim is a working dev-only fix but leaves the underlying CJS landmine in place — any future dep that pulls CJS into the SSR path re-triggers the same `module is not defined` failure. The shim treated the symptom; this decision removes the cause.

## Consequences

- The `debug` Vite alias in `apps/web/astro.config.mjs` and `apps/web/src/lib/debug-shim.mjs` are deleted. If a future CJS dep slips into the SSR runtime, the symptom returns and the fix has to address that dep, not another shim.
- `astro-icon` and `@iconify-json/lucide` are removed from `apps/web/package.json` dependencies. `astro-icon` is removed from `packages/ui/package.json` `peerDependencies`. The `include.lucide` allowlist array in `astro.config.mjs` is deleted.
- Adding a new icon is a single-file operation: drop a `<Name>.astro` into `packages/ui/src/icons/`, add the subpath export to `packages/ui/package.json`, and import it. TypeScript catches missing imports at build time; no central allowlist to keep in sync.
- A `scripts/generate-icons.mjs` script is committed alongside the 47 component files. It is the one-time extraction tool that produced the initial 47 files from `@iconify-json/lucide` and is kept around as a no-arg fallback for re-syncing a single icon from upstream lucide. Not wired into `package.json` as a `pnpm` command.
- The AGENTS.md "astro-icon whitelist" section is replaced with the new "icons live in `packages/ui/src/icons/`" rule. The troubleshooting entry about `cookie@1.1.1` CJS / `corepack prepare pnpm@11.1.2 --activate` is removed — the symptom it fixed is no longer reachable once the iconify chain is gone.
- 30 call sites are updated mechanically: `import { Icon } from "astro-icon/components"` becomes `import <Name> from "@recetario/ui/icons/<Name>.astro"`, and `<Icon name="lucide:<name>" ... />` becomes `<Name ... />`. The `lucide:` prefix is dropped; `size` and `class` props pass through unchanged.
