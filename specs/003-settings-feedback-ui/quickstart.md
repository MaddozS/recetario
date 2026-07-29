# Quickstart: Settings Feedback UI

**Phase**: 1 — Design & Contracts

## Files to modify

Only one file: `src/pages/settings.astro` (860 lines)

### Changes by section

| Section                      | Lines   | Change                                                                                                                                                  |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script 1 (setupSettings)     | 418–695 | Replace `alert()` calls with dynamic `FeedbackAlert` at top of section; add loading spinner toggling on submit                                          |
| Script 2 (setupSettingsTabs) | 697–741 | No changes (tab logic independent)                                                                                                                      |
| Script 3 (setupAccountForms) | 743–858 | Add disabled state logic to submit buttons based on field emptiness; add loading spinner during submission; verify feedback elements use correct tokens |
| Template (preferences form)  | 315–400 | Add `FeedbackAlert` container element at top of section; pass `loading` prop to submit button                                                           |
| Template (account forms)     | 200–312 | Add `disabled` binding to submit buttons; verify `loading` prop wiring                                                                                  |

## No changes needed

- `src/components/FeedbackAlert.astro` — already correct
- `src/components/ui/Button.astro` — already supports `disabled` and `loading` props
- Prisma schema — no data model changes
- API endpoints — no server changes
- CSS / global styles — no new tokens needed

## How to verify

1. Open `/settings` in browser
2. Change theme/accent → save → confirm success banner appears (green)
3. Simulate network failure → confirm error banner appears (red), selections revert
4. Load change-email form with empty fields → confirm button is visually disabled
5. Fill all fields → confirm button becomes enabled
6. Submit → confirm spinner appears, button disabled
7. Run `pnpm astro check` and `pnpm eslint .` — must pass with zero errors
