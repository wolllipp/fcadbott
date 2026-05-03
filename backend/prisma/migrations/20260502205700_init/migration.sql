-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CHAIRMAN', 'DEPUTY', 'SECRETARY', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('BUDGET', 'PAID', 'NO_STIPEND');

-- CreateEnum
CREATE TYPE "BonusStatus" AS ENUM ('PENDING', 'APPROVED', 'DEFERRED');

-- CreateTable
CREATE TABLE "Coordinator" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "telegramUsername" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "sector" TEXT,
    "chatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coordinator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "groupNumber" TEXT NOT NULL,
    "studentCardNumber" TEXT NOT NULL,
    "sectors" TEXT[],
    "budgetStatus" "BudgetStatus" NOT NULL DEFAULT 'BUDGET',

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exemption" (
    "id" SERIAL NOT NULL,
    "exemptionDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExemptionStudent" (
    "id" SERIAL NOT NULL,
    "exemptionId" INTEGER NOT NULL,
    "studentId" INTEGER,
    "externalName" TEXT,
    "externalGroup" TEXT,
    "externalCardNumber" TEXT,

    CONSTRAINT "ExemptionStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusSubmission" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "coordinatorId" INTEGER NOT NULL,
    "status" "BonusStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusEntry" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "studentId" INTEGER,
    "externalName" TEXT,
    "externalGroup" TEXT,
    "externalCardNumber" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Организация мероприятий на факультете и в университете и участие в них',
    "deferredToMonth" INTEGER,
    "deferredToYear" INTEGER,

    CONSTRAINT "BonusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coordinator_telegramUsername_key" ON "Coordinator"("telegramUsername");

-- CreateIndex
CREATE UNIQUE INDEX "BonusSubmission_month_year_coordinatorId_key" ON "BonusSubmission"("month", "year", "coordinatorId");

-- AddForeignKey
ALTER TABLE "Exemption" ADD CONSTRAINT "Exemption_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Coordinator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExemptionStudent" ADD CONSTRAINT "ExemptionStudent_exemptionId_fkey" FOREIGN KEY ("exemptionId") REFERENCES "Exemption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExemptionStudent" ADD CONSTRAINT "ExemptionStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusSubmission" ADD CONSTRAINT "BonusSubmission_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusEntry" ADD CONSTRAINT "BonusEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "BonusSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusEntry" ADD CONSTRAINT "BonusEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
