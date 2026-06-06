# Analysis: Unique constraint violation on `ingredient.id`

**Date:** 2026-06-04
**Agent:** explorer
**Type:** Read-only diagnosis

## Summary

When a user creates a new ingredient, the `createIngredient()` function at `src/lib/db/ingredients.ts:91` relies on PostgreSQL's `autoincrement()` to assign the `id` value. However, the seed script (`prisma/seed.ts`) inserts ingredients with **explicit IDs** (1–34), and PostgreSQL's sequence (`ingredients_id_seq`) is **never advanced past those values**. The next auto-generated ID collides with an existing row, causing the `Unique constraint failed on the fields: (id)` error.

---

## 1. How `id` is defined in the schema

**File:** `prisma/schema.prisma:10-23`

```prisma
model Ingredient {
  id               Int                 @id @default(autoincrement())
  // ...
}
```

The migration SQL (`prisma/migrations/20260511231128_init/migration.sql:3`) confirms:

```sql
"id" SERIAL NOT NULL,
```

`SERIAL` is PostgreSQL shorthand for `INTEGER NOT NULL` with an auto-created sequence (`ingredients_id_seq`). The `@default(autoincrement())` annotation in Prisma translates to this `SERIAL` type.

---

## 2. How seed data inserts IDs

**File:** `prisma/seed.ts:56-77`

```typescript
for (const ing of ingredients) {
  await prisma.ingredient.upsert({
    where: { id: ing.id },            // <-- upsert by explicit ID
    update: { /* ... */ },
    create: {
      id: ing.id,                      // <-- EXPLICIT ID passed to create
      ownerId,
      name: ing.name,
      // ...
    },
  });
}
```

**File:** `data/ingredients.json`

Contains 34 ingredients with **explicit sequential IDs from 1 to 34**.

| Highest | Lowest |
|---------|--------|
| 34      | 1      |

---

## 3. The `createIngredient()` function

**File:** `src/lib/db/ingredients.ts:91-101`

```typescript
const data = await prisma.ingredient.create({
  data: {
    ownerId,
    name,
    unit,
    price,
    purchaseQuantity,
    brand: brand ?? null,
    supplier: supplier ?? null,
    // NOTE: no `id` field — relies on autoincrement
  },
});
```

No `id` is passed. Prisma omits the column from the INSERT, so PostgreSQL uses `DEFAULT`, which calls `nextval('ingredients_id_seq')`.

---

## 4. Root cause

**PostgreSQL sequence behavior:** When a row is inserted with an explicit `id` value, the sequence is **not advanced**. After seeding ingredients with IDs 1–34, the sequence state is:

| Column      | Value  |
|-------------|--------|
| `last_value`| 1      |
| `is_called` | false  |

When `createIngredient()` runs without specifying `id`, PostgreSQL calls `nextval('ingredients_id_seq')`, which returns **1** — an ID that already exists from the seed. This triggers:

```
Unique constraint failed on the fields: (`id`)
```

**Same problem exists for `Recipe`** — the seed inserts recipes with explicit IDs (101–214), and the `recipes_id_seq` sequence is similarly out of sync. `RecipePresentation` also uses explicit IDs in seed (if any). This bug will affect any `@default(autoincrement())` model that gets seeded with explicit IDs.

---

## 5. No existing sequence fix

Searched the entire codebase for `setval`, `reset`, `nextval`, `ingredients_id_seq`, `recipes_id_seq`. **No sequence management logic exists anywhere.**

---

## 6. Recommended fix approach

### Option A: Fix the seed script (recommended)

Add a sequence reset to `prisma/seed.ts` after all ingredient upserts:

```typescript
// After seeding ingredients, reset the sequence to max(id)
const maxIngredientId = await prisma.ingredient.aggregate({
  _max: { id: true },
});
await prisma.$executeRawUnsafe(
  `SELECT setval('ingredients_id_seq', $1, true)`,
  maxIngredientId._max.id ?? 0,
);
```

Same fix needed for `recipes_id_seq` and `recipe_presentations_id_seq`.

**Pros:** Fixes the root cause at the source. Prevents the bug for any future data seeding. Simple and contained.

**Cons:** Requires a raw SQL query (the Prisma-level `setval` equivalent is `$executeRawUnsafe`). Must be done after all upserts but before `$disconnect`. Running the seed is a one-time operation per fresh DB, so this is low-risk.

### Option B: Fix only `createIngredient` (not recommended and incomplete)

Pass an explicit `max(id) + 1` — but this is racy and defeats autoincrement.

### Option C: Raw SQL migration to fix sequence for existing databases

A one-off migration that runs:
```sql
SELECT setval('ingredients_id_seq', COALESCE((SELECT MAX(id) FROM ingredients), 1));
SELECT setval('recipes_id_seq', COALESCE((SELECT MAX(id) FROM recipes), 1));
SELECT setval('recipe_presentations_id_seq', COALESCE((SELECT MAX(id) FROM recipe_presentations), 1));
```

This fixes existing databases without re-seeding.

---

## 7. Adjacent code that may need changes

| File | Issue |
|------|-------|
| `prisma/seed.ts` | Must call `setval` after ingredient/recipe/presentation upserts |
| `prisma/schema.prisma` | `Recipe.id` and `RecipePresentation.id` also use `@default(autoincrement())` and will have the same bug after seed |
| `data/recipes.json` | Recipe IDs: 101–214 (highest: 214) |
| `prisma/migrations/20260511231128_init/migration.sql` | `recipes.id` is `SERIAL NOT NULL`, `recipe_presentations.id` is `SERIAL NOT NULL` — both affected |

---

## 8. Files examined

| File | Purpose |
|------|---------|
| `prisma/schema.prisma:10-23` | Ingredient model definition |
| `prisma/seed.ts:56-77` | Seed upsert with explicit IDs |
| `data/ingredients.json` | Seed ingredient data (IDs 1-34) |
| `src/lib/db/ingredients.ts:91-101` | `createIngredient()` — no ID passed |
| `prisma/migrations/20260511231128_init/migration.sql` | Migration SQL — `SERIAL` type confirmed |
| `prisma/fix-failed-migration.ts` | No sequence logic present |
| `data/recipes.json` (first lines) | Recipe IDs start at 101 |
