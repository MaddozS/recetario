# Data Model: Password Reset Flow

## Entities

### PasswordResetToken

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Primary key |
| userId | String | @map("user_id"), @index | Foreign key to User |
| token | String | @unique, @index | Hashed token for security |
| expiresAt | DateTime | @map("expires_at") @db.Timestamptz() | Expiry timestamp |
| usedAt | DateTime? | @map("used_at") @db.Timestamptz() | When token was used |
| createdAt | DateTime | @default(now()) @map("created_at") | Creation timestamp |

**Relationships**: `userId` → `User.id` (CASCADE on delete)

**Indexes**:
- `@@index([userId])` - For user token cleanup queries
- `@@index([token])` - For token validation lookups

**State Transitions**:
- `pending` → `used` (when password is changed)
- `pending` → `expired` (when expiresAt < now())

### Verification (Existing)

Better Auth uses `Verification` model for various flows. Password reset tokens in our custom implementation use `PasswordResetToken` instead.

---

## Validation Rules

### Password Requirements (from existing `PASSWORD_RULES`)
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### Token Validation
- Token must exist in database
- Token must not be expired (expiresAt > now())
- Token must not be used (usedAt = null)

---

## Migration

```sql
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" ("token");
```