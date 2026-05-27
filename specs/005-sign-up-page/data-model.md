# Data Model: Página de Registro de Usuario

**Feature**: 005-sign-up-page | **Date**: 2026-05-27

## Entity Changes

### User (existing model — modified)

**Table**: `user`

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| `id` | `String @id` | No change | UUID, auto-generated |
| `name` | `String` | No change | Display name (computed: `firstName + " " + lastName`) |
| `firstName` | `String` | **NEW** | User's first name (`@map("first_name")`) |
| `lastName` | `String` | **NEW** | User's last name (`@map("last_name")`) |
| `email` | `String @unique` | No change | Email address |
| `emailVerified` | `Boolean` | No change | Email verification status |
| `image` | `String?` | No change | Profile image URL |
| `role` | `Role` | No change | User role (default `USER`) |
| `createdAt` | `DateTime` | No change | Account creation timestamp |
| `updatedAt` | `DateTime` | No change | Last update timestamp |

### Prisma Schema Diff

```diff
model User {
  id            String    @id
  name          String
+ firstName     String    @map("first_name")
+ lastName      String    @map("last_name")
  email         String    @unique
  emailVerified Boolean   @map("email_verified")
  image         String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  accounts      Account[]
  sessions      Session[]
  @@map("user")
}
```

### Validation Rules

- `firstName`: Required, non-empty after trimming, max 100 chars
- `lastName`: Required, non-empty after trimming, max 100 chars
- Both fields accept Unicode (accented characters, ñ, etc.)
- Both fields are trimmed of leading/trailing whitespace before storage

### Data Flow — Email Registration

```
User fills form (firstName, lastName, email, password)
  → Client validates passwords match, min 6 chars
  → POST to Better Auth signUp.email()
    Parameters: { email, password, name: "firstName lastName", firstName, lastName }
    → Better Auth creates User record with all fields
    → Better Auth sends verification email
    → Returns success
  → Client shows verification confirmation screen
```

### Data Flow — Google Registration

```
User clicks "Continuar con Google"
  → Client initiates signIn.social({ provider: "google" })
    → Google OAuth flow
    → Google returns profile (given_name, family_name, email)
    → mapProfileToUser extracts firstName, lastName
    → Better Auth creates User + Account records
    → Returns session
  → Client redirects to /recipes
```

## No other entity changes

- `Account`, `Session`, `Verification` — no changes
- `Subscription`, `SubscriptionPlan` — no changes
- `UserPreferences` — no changes (uses `userId` from User, unaffected)
