/*
  Warnings:

  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Match` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MatchGame` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Participant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParticipantMatchGameResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParticipantMatchResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Round` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Stage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StageSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SponsorScope" AS ENUM ('GLOBAL', 'TOURNAMENT');

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_stageId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_roundId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_stageId_fkey";

-- DropForeignKey
ALTER TABLE "MatchGame" DROP CONSTRAINT "MatchGame_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchGame" DROP CONSTRAINT "MatchGame_stageId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchGameResult" DROP CONSTRAINT "ParticipantMatchGameResult_opponent1MatchGameId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchGameResult" DROP CONSTRAINT "ParticipantMatchGameResult_opponent2MatchGameId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchGameResult" DROP CONSTRAINT "ParticipantMatchGameResult_participantId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchResult" DROP CONSTRAINT "ParticipantMatchResult_opponent1MatchId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchResult" DROP CONSTRAINT "ParticipantMatchResult_opponent2MatchId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantMatchResult" DROP CONSTRAINT "ParticipantMatchResult_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_stageId_fkey";

-- DropForeignKey
ALTER TABLE "StageSettings" DROP CONSTRAINT "StageSettings_stageId_fkey";

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "scope" "SponsorScope" NOT NULL DEFAULT 'GLOBAL';

-- DropTable
DROP TABLE "Group";

-- DropTable
DROP TABLE "Match";

-- DropTable
DROP TABLE "MatchGame";

-- DropTable
DROP TABLE "Participant";

-- DropTable
DROP TABLE "ParticipantMatchGameResult";

-- DropTable
DROP TABLE "ParticipantMatchResult";

-- DropTable
DROP TABLE "Round";

-- DropTable
DROP TABLE "Stage";

-- DropTable
DROP TABLE "StageSettings";

-- DropEnum
DROP TYPE "MatchStatus";
