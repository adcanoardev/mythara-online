-- CreateEnum
CREATE TYPE "MailType" AS ENUM ('SYSTEM', 'GUILD', 'PROMO');

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
    "attachments" JSONB,
    "actionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerInventory" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TrainerInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentInstance" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "mainStat" TEXT NOT NULL,
    "mainValue" DOUBLE PRECISION NOT NULL,
    "sub_stat1" TEXT,
    "sub_value1" DOUBLE PRECISION,
    "sub_stat2" TEXT,
    "sub_value2" DOUBLE PRECISION,
    "sub_stat3" TEXT,
    "sub_value3" DOUBLE PRECISION,
    "equippedOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaDefense" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "myth1Id" TEXT NOT NULL,
    "myth2Id" TEXT NOT NULL,
    "myth3Id" TEXT NOT NULL,
    "strategy1" TEXT NOT NULL DEFAULT 'BALANCED',
    "strategy2" TEXT NOT NULL DEFAULT 'BALANCED',
    "strategy3" TEXT NOT NULL DEFAULT 'BALANCED',
    "trophies" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaDefense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaMatch" (
    "id" SERIAL NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "trophyDelta" INTEGER NOT NULL,
    "replayData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerInventory_userId_itemId_key" ON "TrainerInventory"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaDefense_userId_key" ON "ArenaDefense"("userId");

-- AddForeignKey
ALTER TABLE "MailMessage" ADD CONSTRAINT "MailMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInventory" ADD CONSTRAINT "TrainerInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInventory" ADD CONSTRAINT "TrainerInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentInstance" ADD CONSTRAINT "EquipmentInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentInstance" ADD CONSTRAINT "EquipmentInstance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaDefense" ADD CONSTRAINT "ArenaDefense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
