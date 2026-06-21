-- CreateEnum
CREATE TYPE "FixedCostType" AS ENUM ('PERCENTAGE', 'AMOUNT');

-- CreateEnum
CREATE TYPE "FixedCostBase" AS ENUM ('PER_BATCH', 'PER_UNIT', 'PER_HOUR');

-- CreateTable
CREATE TABLE "recipe_fixed_costs" (
    "id" SERIAL NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FixedCostType" NOT NULL,
    "base" "FixedCostBase" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION,

    CONSTRAINT "recipe_fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_fixed_costs" (
    "id" SERIAL NOT NULL,
    "presentation_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FixedCostType" NOT NULL,
    "base" "FixedCostBase" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "presentation_fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_fixed_costs_recipe_id_idx" ON "recipe_fixed_costs"("recipe_id");

-- CreateIndex
CREATE INDEX "presentation_fixed_costs_presentation_id_idx" ON "presentation_fixed_costs"("presentation_id");

-- AddForeignKey
ALTER TABLE "recipe_fixed_costs" ADD CONSTRAINT "recipe_fixed_costs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_fixed_costs" ADD CONSTRAINT "presentation_fixed_costs_presentation_id_fkey" FOREIGN KEY ("presentation_id") REFERENCES "recipe_presentations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
