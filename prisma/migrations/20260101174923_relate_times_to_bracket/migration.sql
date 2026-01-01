/*
  Warnings:

  - Added the required column `bracketId` to the `Times` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Times" ADD COLUMN     "bracketId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Times" ADD CONSTRAINT "Times_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
