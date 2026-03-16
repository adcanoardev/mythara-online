-- CreateEnum
CREATE TYPE "StructureType" AS ENUM ('MINE', 'FRAGMENT_FORGE', 'LAB', 'NURSERY');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('FRAGMENT', 'SHARD', 'CRYSTAL', 'RUNE', 'ELIXIR', 'MEGA_ELIXIR', 'GRAND_ELIXIR', 'SPARK', 'GRAND_SPARK', 'EMBER_SHARD', 'TIDE_SHARD', 'VOLT_SHARD', 'GROVE_SHARD', 'FROST_SHARD', 'BOND_CRYSTAL', 'ASTRAL_SCALE', 'IRON_COAT', 'SOVEREIGN_STONE', 'CIPHER_CORE', 'BLUE_DIAMOND', 'ROCK_FRAGMENT', 'ARCANE_GEAR', 'FLAME_CORE');

-- CreateEnum
CREATE TYPE "BattleType" AS ENUM ('NPC', 'PVP');

-- CreateEnum
CREATE TYPE "BattleResult" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "starterId" INTEGER NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "prestige" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "medals" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "avatar" TEXT,
    "gender" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "avatarFrame" TEXT NOT NULL DEFAULT 'none',
    "unlockedFrames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "binderLevel" INTEGER NOT NULL DEFAULT 1,
    "sanctumClears" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "npcTokens" INTEGER NOT NULL DEFAULT 10,
    "pvpTokens" INTEGER NOT NULL DEFAULT 5,
    "lastNpcRecharge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPvpRecharge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombatToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Structure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StructureType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastCollected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "structureXp" INTEGER NOT NULL DEFAULT 0,
    "dailyDiamonds" INTEGER NOT NULL DEFAULT 0,
    "lastDiamondReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "item" "ItemType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL DEFAULT 100,
    "critChance" INTEGER NOT NULL DEFAULT 15,
    "critDamage" INTEGER NOT NULL DEFAULT 150,
    "isInParty" BOOLEAN NOT NULL DEFAULT false,
    "slot" INTEGER,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inNursery" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CreatureInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BattleType" NOT NULL,
    "result" "BattleResult" NOT NULL,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "coinsGained" INTEGER NOT NULL DEFAULT 0,
    "playerSpeciesId" TEXT NOT NULL,
    "playerLevel" INTEGER NOT NULL,
    "enemySpeciesId" TEXT NOT NULL,
    "enemyLevel" INTEGER NOT NULL,
    "capturedSpeciesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_userId_key" ON "Game"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProfile_userId_key" ON "TrainerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CombatToken_userId_key" ON "CombatToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Structure_userId_type_key" ON "Structure"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_userId_item_key" ON "Inventory"("userId", "item");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatToken" ADD CONSTRAINT "CombatToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Structure" ADD CONSTRAINT "Structure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatureInstance" ADD CONSTRAINT "CreatureInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleLog" ADD CONSTRAINT "BattleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
