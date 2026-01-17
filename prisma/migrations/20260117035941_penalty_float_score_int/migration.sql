/*
  Warnings:

  - The `awayPenalty` column on the `Game` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `homePenalty` column on the `Game` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "awayPenalty",
ADD COLUMN     "awayPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "homePenalty",
ADD COLUMN     "homePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0;
