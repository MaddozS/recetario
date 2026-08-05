/*
  Warnings:

  - Changed the type of `theme` on the `user_preferences` table.
  - Changed the type of `accent_color` on the `user_preferences` table.
*/

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "AccentColor" AS ENUM (
  'indigo',
  'violet',
  'blue',
  'emerald',
  'rose',
  'amber',
  'coral'
);

-- AlterTable
ALTER TABLE "user_preferences"
ALTER COLUMN "theme" TYPE "Theme"
USING "theme"::text::"Theme";

ALTER TABLE "user_preferences"
ALTER COLUMN "accent_color" TYPE "AccentColor"
USING "accent_color"::text::"AccentColor";
