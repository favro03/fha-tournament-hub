/*
  Warnings:

  - A unique constraint covering the columns `[engineGameId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "engineGameId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Game_engineGameId_key" ON "Game"("engineGameId");
