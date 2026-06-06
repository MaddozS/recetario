# Settings Page: Account Feedback Disappears After Save

**Investigation Date**: 2026-05-28
**Bug**: Account information change feedback messages disappear immediately after saving in the settings page.

---

## Summary

**Root cause**: `window.location.reload()` on line 1014 of `src/pages/settings.astro` — the name-change form shows the success feedback then immediately reloads the page, erasing the feedback. The email and password forms do NOT have this issue. There are also unnecessary artifacts in the name-change handler (dispatching `astro:after-swap` before the reload).

---

## Key Files

- `src/pages/settings.astro:1014` — **BUG**: `window.location.reload()` after showing name-change feedback
- `src/pages/settings.astro:1011-1013` — Unnecessary `astro:after-swap` dispatch before reload
- `src/pages/settings.astro:892-912` — `showFeedback()` helper (works correctly)
- `src/pages/settings.astro:889` — `setupPasswordToggles()` called inside `setupAccountForms` (harmless)
- `src/layouts/Layout.astro:3,66` — `ClientRouter` from `astro:transitions` (ViewTransitions active but not trigger of this bug)
- `src/lib/password-toggle.ts:1-28` — Only toggles `[data-pw-toggle]` elements, does NOT affect feedback divs
- `src/components/FeedbackAlert.astro:1-46` — Server-side component for page-level feedback (used for preferences tab only)
- `src/pages/api/account/update-name.ts:1-30` — Name update API (correct, no issues)
- `src/pages/api/account/change-email.ts:1-38` — Email change API (correct, no issues)
- `src/pages/api/account/change-password.ts:1-48` — Password change API (correct, no issues)
- `src/styles/global.css:1-1172` — No CSS auto-hides feedback elements

---

## Detailed Findings

### 1. Primary Root Cause: `window.location.reload()` on Name Change (line 1014)

**File**: `src/pages/settings.astro:1009-1014`

```javascript
if (res.ok) {
    showFeedback(fb, "success", "Nombre actualizado correctamente.");
    document.getElementById("change-name-form")?.dispatchEvent(
        new CustomEvent("astro:after-swap"),
    );
    window.location.reload();  // ← BUG
}
```

After showing the feedback (removing `hidden` class, adding semantic colors, focusing the element), `window.location.reload()` fires a full page reload. The server re-renders the page from scratch, and all three feedback divs (`#change-name-feedback`, `#change-email-feedback`, `#change-password-feedback`) are rendered with:
```html
class="mt-4 hidden rounded-xl border px-4 py-3 text-sm font-semibold"
```

The `hidden` class (Tailwind's `display: none`) makes the feedback invisible on the fresh page. The user sees the feedback flash for a fraction of a second, then it's gone.

### 2. Unnecessary `astro:after-swap` Dispatch (lines 1011-1013)

```javascript
document.getElementById("change-name-form")?.dispatchEvent(
    new CustomEvent("astro:after-swap"),
);
```

This fires a synthetic `astro:after-swap` event on the form element. Because the event bubbles to `document`, it triggers the three lifecycle listeners registered in settings.astro:

- **Line 1218**: `setupAccountForms()` — re-calls `setupPasswordToggles()` and re-attempts to bind form handlers (guarded by `dataset.bound`, so no double-binding). Also re-defines `showFeedback` etc. inside the closure, but the old handlers are still bound.
- **Line 835-836**: `setupSettings()` and `setupSettingsTabs()` — re-bind theme/accent toggles and tab click handlers (also guarded).

**Impact**: Negligible due to binding guards, but wasteful. After the dispatch completes, `window.location.reload()` fires immediately anyway.

### 3. Email and Password Forms: Feedback Works Correctly

**Email form** (`src/pages/settings.astro:1099-1102`):
```javascript
if (res.ok) {
    showFeedback(fb, "success", "Email actualizado correctamente.");
    emailForm.reset();
    updateEmailBtnState();
}
```
No reload. Feedback persists. ✅

**Password form** (`src/pages/settings.astro:1180-1187`):
```javascript
if (res.ok) {
    showFeedback(fb, "success", "Contraseña actualizada correctamente.");
    pwdForm.reset();
    updatePasswordBtnState();
}
```
No reload. Feedback persists. ✅

### 4. `showFeedback()` Function Works Correctly (lines 892-912)

```javascript
function showFeedback(el, type, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");                        // ← shows the div
    el.className = el.className.replace(                   // ← strips old semantic classes
        /border-(success|danger)-(border|bg)/g, "");
    const fbClasses = (type === "success"                  // ← adds new semantic classes
        ? "border-success-border bg-success-bg text-success"
        : "border-danger-border bg-danger-bg text-danger"
    ).split(" ");
    el.classList.add(...fbClasses);
    el.setAttribute("tabindex", "-1");
    el.focus();                                           // ← focuses for screen readers
}
```

This is correct and works as intended. The feedback div gets styled and focused. The issue is ONLY that a subsequent `window.location.reload()` wipes it out.

### 5. `setupPasswordToggles()` Is Harmless

**File**: `src/lib/password-toggle.ts:1-28`

Only operates on elements matching `[data-pw-toggle]` (password visibility toggle buttons). It does NOT touch any feedback divs or elements with `hidden` class related to feedback.

### 6. Layout `ClientRouter` / ViewTransitions: NOT the Cause

**File**: `src/layouts/Layout.astro:3,66`
```javascript
import { ClientRouter } from "astro:transitions";
// ...
<ClientRouter />
```

**File**: `src/layouts/Layout.astro:104`
```html
<div class="max-w-7xl mx-auto" transition:name="app-content" transition:animate="slide">
    <slot />
</div>
```

`ClientRouter` enables client-side navigation with view transitions. However:
- Account form submissions use `fetch()` with `e.preventDefault()` — no navigation occurs
- The `astro:before-swap` handler (Layout.astro:254-279) only fires during page-to-page navigation
- The view transition CSS in `global.css` (lines 295-303) only animates `::view-transition-old(root)` and `::view-transition-new(root)` — doesn't hide feedback

**Conclusion**: ViewTransitions are not involved in this bug.

### 7. Global CSS: No Auto-Hiding Rules

**File**: `src/styles/global.css`

No CSS rule targets feedback-related classes or auto-hides elements beyond the standard Tailwind `hidden` utility (`display: none`). No animation or transition would cause feedback to disappear.

### 8. Preferences Feedback Has Its Own Independent System (lines 722-737)

```javascript
function showPrefsFeedback(type, msg) { ... prefsFeedback.classList.remove("hidden"); ... }
function hidePrefsFeedback() { prefsFeedback.classList.add("hidden"); }
```

This is separate from the account feedback divs. `hidePrefsFeedback()` only targets `#preferences-feedback` (line 735-736). It does NOT affect the three account feedback divs (`#change-name-feedback`, `#change-email-feedback`, `#change-password-feedback`).

### 9. API Endpoints: No Issues

All three API endpoints return simple `Response(null, { status: 200 })` on success. They don't redirect, don't set cookies, and don't trigger any navigation:
- `update-name.ts` — updates firstName, lastName, name in DB. Returns 200 or error status.
- `change-email.ts` — calls Better Auth `changeEmail`. Returns 200 or error message.
- `change-password.ts` — calls Better Auth `changePassword`. Returns 200 or error message.

---

## Edge Cases / Gotchas

1. **The name-change `showFeedback` + `reload` race**: Even though `showFeedback` is synchronous (DOM is updated immediately), the `reload()` fires right after. On fast connections, the reload can happen within milliseconds. The user sees a brief flash of green text before the page goes white and reloads.

2. **Why does the name form reload?** The name change updates `Astro.locals.user` (via DB). On reload, the server re-reads the user and renders the new name in the form fields. The email and password forms don't reload because:
   - Email: Better Auth handles the verification flow, no need to refresh the page UI
   - Password: The password field is always empty, no value to refresh
   
   But the name form fields (`value={userFirstName}`, `value={userLastName}`) are server-rendered, so the developer used `reload()` as a shortcut to show the updated name. This breaks the feedback UX.

3. **If you remove `window.location.reload()`**: The feedback would persist (good), but the form fields would still show the old name values (because the server hasn't re-rendered). The fix should either:
   - Update the DOM input values directly in JS after success (no reload needed)
   - Use a redirect with query params for the feedback (like the preferences tab does at lines 88-101)
   - Remove the reload and accept the stale form values until the next navigation

4. **`FeedbackAlert.astro` component**: Used for server-side feedback (via query params after redirect), as seen in the preferences tab flow (lines 108-114). The account forms bypass this pattern and use client-side DOM manipulation instead. This is why the account feedback is lost on reload — it's client-side state, not persisted in the URL.

5. **Both layouts use `ClientRouter`**: `src/layouts/Layout.astro:66` and `src/layouts/LandingLayout.astro:48` both render `<ClientRouter />`. This means view transitions are active app-wide, but as noted above, they don't interfere with fetch-based form submissions.
