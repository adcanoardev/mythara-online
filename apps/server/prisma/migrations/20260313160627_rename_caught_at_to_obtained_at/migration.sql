/*
  Warnings:

  - You are about to drop the column `caughtAt` on the `CreatureInstance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreatureInstance" DROP COLUMN "caughtAt",
ADD COLUMN     "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
