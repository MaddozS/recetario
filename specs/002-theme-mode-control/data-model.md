# Data Model: Theme Mode Control

## Entity Changes

### UserPreferences (existing)

**Theme field** — extended valid values:

| Field | Type | Current Values | New Values | Default |
|-------|------|----------------|------------|---------|
| `theme` | `String` | `"light"`, `"dark"` | `"system"`, `"light"`, `"dark"` | `"system"` (inferred — no saved row = follow OS) |

**No schema migration needed** — `theme` is a free-text `String` in Prisma.
Validation is enforced at the application and type level.

### TypeScript type update

File: `src/lib/db/types.ts`

```diff
- theme: "light" | "dark";
+ theme: "light" | "dark" | "system";
```

### Validation update

File: `src/lib/db/preferences.ts`

`upsertUserPreferences()` must validate that `theme` is one of
`"system"`, `"light"`, or `"dark"`. Reject with error otherwise.

### State transitions

```
                  ┌──────────┐
      ┌──────────→│  system  │←──────────┐
      │           └──────────┘           │
      │                │                 │
      │     OS changes │                 │
      │    (auto-flip) │                 │
      │                ▼                 │
      │    ┌─────────────────────┐       │
      │    │ resolved: light/dark│       │
      │    └─────────────────────┘       │
      │                                  │
      ▼                                  ▼
  ┌───────┐                         ┌───────┐
  │ light │────────────────────────→│ dark  │
  └───────┘                         └───────┘
      │                                  │
      └──────────(user selects "System")─┘
```

- User selection of "system" from any explicit mode returns to OS-following
- User selection of "light" or "dark" from "system" overrides OS
- OS change while in "system" mode flips the resolved theme in real-time
