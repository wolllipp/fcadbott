-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'AWAITING_MARK';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ATTENDANCE_CONFIRMED';

-- AlterTable: Add QR and attendance fields to EventApplication
ALTER TABLE "EventApplication" ADD COLUMN "qrToken" TEXT,
ADD COLUMN "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "checkedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "checkInTime" TIMESTAMP(3),
ADD COLUMN "checkOutTime" TIMESTAMP(3),
ADD COLUMN "checkedInById" INTEGER,
ADD COLUMN "checkedOutById" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_qrToken_key" ON "EventApplication"("qrToken");

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "type" "CheckType" NOT NULL,
    "scannedById" INTEGER,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EventApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
