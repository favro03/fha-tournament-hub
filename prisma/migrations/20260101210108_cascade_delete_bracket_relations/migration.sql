-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Times" DROP CONSTRAINT "Times_bracketId_fkey";

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Times" ADD CONSTRAINT "Times_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
