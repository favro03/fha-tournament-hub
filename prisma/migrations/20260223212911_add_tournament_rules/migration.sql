-- CreateTable
CREATE TABLE "TournamentRule" (
    "id" SERIAL NOT NULL,
    "youthLevel" TEXT NOT NULL,
    "gameMinutes" INTEGER NOT NULL,
    "zamboniMinutes" INTEGER NOT NULL,
    "restAfterEndMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRule_youthLevel_key" ON "TournamentRule"("youthLevel");
