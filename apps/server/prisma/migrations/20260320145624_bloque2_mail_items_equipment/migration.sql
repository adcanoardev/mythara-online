-- CreateEnum
CREATE TYPE "MailType" AS ENUM ('SYSTEM', 'GUILD', 'PROMO');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('EQUIPMENT', 'CONSUMABLE', 'ESSENCE', 'MATERIAL', 'KEY', 'BOOSTER');

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "goldEssences" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mythicEssences" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MailType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" JSONB,
    "actionData" JSONB,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "ItemCategory" NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "iconUrl" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "mainStat" TEXT NOT NULL,
    "mainValue" DOUBLE PRECISION NOT NULL,
    "subStat1" TEXT,
    "subValue1" DOUBLE PRECISION,
    "subStat2" TEXT,
    "subValue2" DOUBLE PRECISION,
    "subStat3" TEXT,
    "subValue3" DOUBLE PRECISION,
    "equippedOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerInventory_userId_itemId_key" ON "TrainerInventory"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInventory" ADD CONSTRAINT "TrainerInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInventory" ADD CONSTRAINT "TrainerInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentInstance" ADD CONSTRAINT "EquipmentInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
