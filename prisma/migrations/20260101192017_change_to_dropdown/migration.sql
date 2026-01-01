/*
  Warnings:

  - You are about to drop the column `bracketPlay` on the `Times` table. All the data in the column will be lost.
  - You are about to drop the column `poolPlay` on the `Times` table. All the data in the column will be lost.
  - Added the required column `gameType` to the `Times` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Times" DROP COLUMN "bracketPlay",
DROP COLUMN "poolPlay",
ADD COLUMN     "gameType" TEXT NOT NULL;
