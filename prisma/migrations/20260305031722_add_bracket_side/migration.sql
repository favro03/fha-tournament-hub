-- CreateEnum
CREATE TYPE "BracketSide" AS ENUM ('HOME', 'AWAY');

-- AlterTable
ALTER TABLE "Bracket" ADD COLUMN     "side" "BracketSide" NOT NULL DEFAULT 'HOME';
