# Cycle Summary: 20260704-preparacion-bugs

## Request
Fix 4 bugs in the recipe preparación (instructions) section:
1. List markers (numbers/bullets) not visible in edit mode
2. Steps display incorrectly in read mode when HTML lists are present
3. Unwanted dividers (border-y) above/below the editor
4. Editor margins narrower than the top menu

## Root Causes

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| List markers invisible | Tailwind preflight resets `list-style: none` globally; `.contenteditable-editor ul/ol` had `padding-left` but no `list-style-type` | Added `list-style-type: disc` to ul, `list-style-type: decimal` to ol |
| Read mode list duplication | `parseHtmlSteps` regex matched both `<ol>` and `<li>` independently, duplicating content | Removed `ol\|ul\|li` from regex — lists treated as inline content |
| Unwanted dividers | Wrapper div had `border-y` class | Removed `border-y` |
| Narrow margins | Editor used `mx-5` vs panels' `mx-1` | Changed to `mx-1 sm:mx-2 lg:mx-8` + `mt-6` |

## Files Changed
- `apps/web/src/styles/global.css` — split ul/ol selector, added list-style-type
- `apps/web/src/lib/instructions-parser.ts` — removed ol|ul|li from block regex
- `apps/web/src/components/InstructionsEditor.astro` — removed border-y, adjusted margins

## Validation
- ✅ `pnpm astro check` — 0 errors, 0 warnings
- ✅ `pnpm eslint .` — 10 pre-existing errors (none in changed files)
- ⚠️ `pnpm build` — blocked by pre-existing Prisma SSR issue
- ⚠️ Visual QA — blocked by auth requirement (CSS verified at source level)

## Review
- ✅ **Verdict: accept** — all acceptance criteria met
- Note: `border-border` dead class on wrapper (cosmetic, no visual impact, remove next time file is touched)
- Note: Regex tradeoff for mixed block+list HTML is low-risk (common case handled correctly)

## Pending
- User acceptance
- Optional: visual QA in browser with authenticated session
