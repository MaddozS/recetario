# UI Contract: Página de Registro de Usuario

**Feature**: 005-sign-up-page | **Date**: 2026-05-27

## Page: `/sign-up`

### Route

- **Path**: `/sign-up`
- **Method**: GET (page render), POST (form submission — handled client-side via Better Auth client)
- **Auth**: Public (redirects to `/recipes` if session exists)
- **Layout**: `LandingLayout`

### Visual Structure

```
┌─────────────────────────────────────┐
│  Nav bar (logo + theme toggle)      │
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────┐     │
│   │  accent bar (top)         │     │
│   │  icon (chef-hat)          │     │
│   │  "Crear cuenta"           │     │
│   │  subtitle                 │     │
│   │                           │     │
│   │  [Nombre]                 │     │
│   │  [Apellido]               │     │
│   │  [Email]                  │     │
│   │  [Contraseña      👁]    │     │
│   │  [Confirmar        👁]    │     │
│   │  [Crear cuenta]           │     │
│   │                           │     │
│   │  ─────── o ───────        │     │
│   │                           │     │
│   │  [Continuar con Google]   │     │
│   │                           │     │
│   │  ¿Ya tienes cuenta?       │     │
│   │  [Inicia sesión]          │     │
│   └───────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### States

| State                   | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Default**             | Clean form with all fields empty                                                     |
| **Loading**             | Overlay/spinner shown, submit + Google buttons disabled                              |
| **Error**               | Red error banner at top of form with specific message                                |
| **Verification sent**   | Form replaced with success view (email, resend button, sign-in link)                 |
| **Pre-populated email** | If `kitchcalc:signup_email` exists in sessionStorage, show verification view on load |

### Form Fields

| Field              | Type     | Required | Validation                                    |
| ------------------ | -------- | -------- | --------------------------------------------- |
| `first_name`       | text     | Yes      | Non-empty, trimmed                            |
| `last_name`        | text     | Yes      | Non-empty, trimmed                            |
| `email`            | email    | Yes      | `type="email"` browser validation             |
| `password`         | password | Yes      | min 6 characters, with visibility toggle      |
| `confirm_password` | password | Yes      | Must match `password`, with visibility toggle |

### Error Messages

| Condition                | Message                                           |
| ------------------------ | ------------------------------------------------- |
| Passwords don't match    | "Las contraseñas no coinciden."                   |
| Password too short       | "La contraseña debe tener al menos 6 caracteres." |
| Email already registered | (from server) — "Este email ya está registrado."  |
| Google auth fails        | "No se pudo crear la cuenta con Google."          |
| Network error            | "Error al crear la cuenta."                       |

### Interaction Rules

1. All password fields have a toggle button (eye icon) to show/hide
2. Submit button disables during submission, shows loading text
3. Google button disables during OAuth flow
4. All interactions keyboard-accessible
5. `data-*-bound="1"` guards on all event listeners for SPA navigation safety
6. Client-side validation runs before API call (passwords match, length)
7. Spaces trimmed from name fields on submit
