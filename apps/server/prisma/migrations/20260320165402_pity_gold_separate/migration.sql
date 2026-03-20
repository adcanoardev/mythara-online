/*
  Warnings:

  - You are about to drop the `EquipmentInstance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MailMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrainerInventory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EquipmentInstance" DROP CONSTRAINT "EquipmentInstance_userId_fkey";

-- DropForeignKey
ALTER TABLE "MailMessage" DROP CONSTRAINT "MailMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "TrainerInventory" DROP CONSTRAINT "TrainerInventory_itemId_fkey";

-- DropForeignKey
ALTER TABLE "TrainerInventory" DROP CONSTRAINT "TrainerInventory_userId_fkey";

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "pityEliteGold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pityLegendaryGold" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "EquipmentInstance";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "MailMessage";

-- DropTable
DROP TABLE "TrainerInventory";

-- DropEnum
DROP TYPE "ItemCategory";

-- DropEnum
DROP TYPE "MailType";
