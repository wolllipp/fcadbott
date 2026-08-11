-- Add missing columns to Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdBy" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "attendanceFinalized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD CONSTRAINT IF NOT EXISTS "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Coordinator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Add missing columns to Student
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "chatId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Student_telegramUsername_key" ON "Student"("telegramUsername");

-- Add missing columns to ExemptionStudent
ALTER TABLE "ExemptionStudent" ADD COLUMN IF NOT EXISTS "externalCardNumber" TEXT;
