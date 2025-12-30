/*
  Warnings:

  - You are about to drop the column `advancementFormat` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `bracketImageAlt` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `bracketImageUrl` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `bracketPdfUrl` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `division` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfPools` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfTeams` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Bracket` table. All the data in the column will be lost.
  - You are about to drop the `Game` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `Bracket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image` to the `Bracket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `youthLevel` to the `Bracket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_awayTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_homeTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_loserAdvancesToGameId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_winnerAdvancesToGameId_fkey";

-- DropForeignKey
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_poolId_fkey";

-- AlterTable
ALTER TABLE "Bracket" DROP COLUMN "advancementFormat",
DROP COLUMN "bracketImageAlt",
DROP COLUMN "bracketImageUrl",
DROP COLUMN "bracketPdfUrl",
DROP COLUMN "division",
DROP COLUMN "endDate",
DROP COLUMN "location",
DROP COLUMN "mode",
DROP COLUMN "numberOfPools",
DROP COLUMN "numberOfTeams",
DROP COLUMN "startDate",
DROP COLUMN "type",
ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "youthLevel" TEXT NOT NULL;

-- DropTable
DROP TABLE "Game";

-- DropTable
DROP TABLE "Pool";

-- DropTable
DROP TABLE "Team";
