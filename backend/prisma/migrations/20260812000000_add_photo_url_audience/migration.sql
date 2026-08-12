-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('SS', 'FKP', 'ALL');

-- AlterTable
ALTER TABLE "Coordinator" ADD COLUMN "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "maxCourse",
DROP COLUMN "minCourse",
ADD COLUMN     "audience" "EventAudience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "scannerCoordinatorId" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "photoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_scannerCoordinatorId_fkey" FOREIGN KEY ("scannerCoordinatorId") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

