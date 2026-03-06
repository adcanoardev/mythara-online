-- CreateEnum
CREATE TYPE "BattleType" AS ENUM ('NPC', 'PVP');

-- CreateEnum
CREATE TYPE "BattleResult" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateTable
CREATE TABLE "BattleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BattleType" NOT NULL,
    "result" "BattleResult" NOT NULL,
    "xpGained" INTEGER NOT NULL DEFAULT 0,
    "coinsGained" INTEGER NOT NULL DEFAULT 0,
    "playerPokemonId" INTEGER NOT NULL,
    "playerPokemonLvl" INTEGER NOT NULL,
    "enemyPokemonId" INTEGER NOT NULL,
    "enemyPokemonLvl" INTEGER NOT NULL,
    "capturedPokemonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BattleLog" ADD CONSTRAINT "BattleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
