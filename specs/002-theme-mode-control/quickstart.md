# Quickstart: Theme Mode Control

## Files to modify

| File | Change |
|------|--------|
| `src/lib/db/types.ts` | Add `"system"` to `theme` union type |
| `src/lib/db/preferences.ts` | Add validation for `"system"` in `upsertUserPreferences()` |
| `src/layouts/Layout.astro` | Update `applyTheme()` with OS detection + listener; add inline flash prevention script |
| `src/pages/settings.astro` | Add Preferences tab HTML content (theme selector + accent picker) |

## Quick reference

### Theme type
```typescript
type Theme = "system" | "light" | "dark";
```

### applyTheme() logic
```javascript
function applyTheme() {
  const theme = html.dataset.appTheme || "system";
  const effective = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  html.classList.toggle("dark", effective === "dark");
}
```

### OS listener
```javascript
const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", () => {
  if (html.dataset.appTheme === "system") applyTheme();
});
```

## Verify

1. `pnpm dev` — dev server
2. Visit `/settings?tab=preferences` — see theme selector with 3 options
3. Select "Dark" — UI changes immediately, persists on reload
4. Select "System" — follows OS preference, updates on OS change
5. `pnpm astro check` — no type errors
