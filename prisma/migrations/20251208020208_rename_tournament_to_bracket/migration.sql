/*
  Warnings:

  - You are about to drop the column `tournamentId` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentId` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the `Tournament` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `bracketId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bracketId` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bracketId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "tournamentId",
ADD COLUMN     "bracketId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Pool" DROP COLUMN "tournamentId",
ADD COLUMN     "bracketId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "tournamentId",
ADD COLUMN     "bracketId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Tournament";

-- CreateTable
CREATE TABLE "Bracket" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "division" TEXT NOT NULL,
    "location" TEXT,
    "mode" TEXT NOT NULL,
    "bracketImageUrl" TEXT,
    "bracketImageAlt" TEXT,
    "bracketPdfUrl" TEXT,
    "type" TEXT,
    "numberOfTeams" INTEGER,
    "numberOfPools" INTEGER,
    "advancementFormat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
