/*
  Warnings:

  - Added the required column `bracketName` to the `Bracket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bracket" ADD COLUMN     "bracketName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "awayPenalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gameType" TEXT,
ADD COLUMN     "homePenalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesId" INTEGER;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_timesId_fkey" FOREIGN KEY ("timesId") REFERENCES "Times"("id") ON DELETE SET NULL ON UPDATE CASCADE;
