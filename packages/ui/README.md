# `@recetario/ui` — UI component library

Astro UI components, CSS tokens, and client-side utilities shared across KitchCalc apps.

## What's inside

### Components

Importable from `@recetario/ui`:

- `Button`, `Input`, `PasswordInput` — form controls
- `Card`, `Badge` — layout & decoration
- `Dialog` — accessible modal dialog
- `SectionHeading` — page section titles
- `FinancialSummary` — production-cost summary card

### Utilities (client-side)

- `accent-colors` — 7 accent families (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`)
- `dialog` — `bindDialogBackdrop()` for dialog backdrop binding
- `loading-overlay` — spinner overlay for async operations
- `password-toggle` — toggle password input visibility

## Usage

```astro
---
import { Button, Card, Dialog, SectionHeading } from "@recetario/ui";
import { getAccentCssVars } from "@recetario/ui/accent-colors";
---
```

## Peer dependencies

- `astro`, `astro-icon` (lucide icon pack)
- Tailwind CSS 4 (semantic tokens via `@import "@recetario/ui/tokens.css"`)
