-- CreateEnum
CREATE TYPE "ExemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Exemption" ADD COLUMN     "status" "ExemptionStatus" NOT NULL DEFAULT 'PENDING';
