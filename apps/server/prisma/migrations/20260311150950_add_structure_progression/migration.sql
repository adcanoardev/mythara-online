-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemType" ADD VALUE 'BLUE_DIAMOND';
ALTER TYPE "ItemType" ADD VALUE 'ROCK_FRAGMENT';
ALTER TYPE "ItemType" ADD VALUE 'ARCANE_GEAR';
ALTER TYPE "ItemType" ADD VALUE 'FLAME_CORE';

-- AlterTable
ALTER TABLE "Structure" ADD COLUMN     "dailyDiamonds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastDiamondReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "structureXp" INTEGER NOT NULL DEFAULT 0;
