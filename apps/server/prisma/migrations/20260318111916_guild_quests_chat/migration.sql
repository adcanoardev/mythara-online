-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('WIN_BATTLES', 'OPEN_FRAGMENTS', 'COLLECT_MINE', 'COMPLETE_SANCTUM', 'WIN_PVP');

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "GuildQuest" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "description" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "reward50" TEXT NOT NULL DEFAULT 'TOKENS',
    "reward100" TEXT NOT NULL DEFAULT 'TOKENS_GEMS',
    "claimed50" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimed100" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildQuestContribution" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildQuestContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "guildTag" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "guildTag" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuildQuest" ADD CONSTRAINT "GuildQuest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildQuestContribution" ADD CONSTRAINT "GuildQuestContribution_questId_fkey" FOREIGN KEY ("questId") REFERENCES "GuildQuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
