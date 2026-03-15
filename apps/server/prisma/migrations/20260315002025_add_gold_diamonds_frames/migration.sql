-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "avatarFrame" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "diamonds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unlockedFrames" TEXT[] DEFAULT ARRAY[]::TEXT[];
