/*
  Warnings:

  - Added the required column `location` to the `Times` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Times" ADD COLUMN     "location" TEXT NOT NULL,
ALTER COLUMN "timeSlots" SET NOT NULL,
ALTER COLUMN "timeSlots" SET DATA TYPE TEXT;
