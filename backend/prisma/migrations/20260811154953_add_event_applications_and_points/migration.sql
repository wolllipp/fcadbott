/*
  Warnings:

  - Made the column `createdBy` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('VISITOR', 'PARTICIPANT', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'AWAITING_MARK', 'ATTENDANCE_CONFIRMED');

-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('ATTENDANCE', 'ORGANIZATION', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PointStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PetitionType" AS ENUM ('DISCOUNT', 'DORMITORY', 'SPECIALIZATION');

-- CreateEnum
CREATE TYPE "PetitionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowedGroups" TEXT[],
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "facultyOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "maxCourse" INTEGER,
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "minCourse" INTEGER,
ADD COLUMN     "pointsForAttendance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "createdBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "Exemption" ADD COLUMN     "isPrinted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "participationType" "ParticipationType" NOT NULL DEFAULT 'VISITOR',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "studentComment" TEXT,
    "coordinatorComment" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "PointType" NOT NULL,
    "eventId" INTEGER,
    "reason" TEXT NOT NULL,
    "authorId" INTEGER,
    "status" "PointStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Petition" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "type" "PetitionType" NOT NULL,
    "status" "PetitionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Petition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetitionEvent" (
    "id" SERIAL NOT NULL,
    "petitionId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetitionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_eventId_studentId_key" ON "EventApplication"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Petition" ADD CONSTRAINT "Petition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetitionEvent" ADD CONSTRAINT "PetitionEvent_petitionId_fkey" FOREIGN KEY ("petitionId") REFERENCES "Petition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
