-- AlterEnum: Add DRAFT to PetitionStatus
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- AlterTable: Add points fields to Petition
ALTER TABLE "Petition" ADD COLUMN "balanceAtSubmit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Petition" ADD COLUMN "totalPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Petition" ADD COLUMN "reviewComment" TEXT;
ALTER TABLE "Petition" ADD COLUMN "reviewerId" INTEGER;

-- CreateTable
CREATE TABLE "PetitionPointSnapshot" (
    "id" SERIAL NOT NULL,
    "petitionId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "eventName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetitionPointSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Petition" ADD CONSTRAINT "Petition_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetitionPointSnapshot" ADD CONSTRAINT "PetitionPointSnapshot_petitionId_fkey" FOREIGN KEY ("petitionId") REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
