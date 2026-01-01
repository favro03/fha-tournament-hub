-- CreateTable
CREATE TABLE "Times" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeSlots" TEXT[],

    CONSTRAINT "Times_pkey" PRIMARY KEY ("id")
);
