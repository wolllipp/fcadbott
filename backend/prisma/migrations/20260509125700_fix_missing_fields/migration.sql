-- Add missing columns to Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "createdBy" INTEGER;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "attendanceFinalized" BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_createdBy_fkey') THEN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Coordinator"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Add missing columns to Student
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "chatId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Student_telegramUsername_key" ON "Student"("telegramUsername");

-- Add missing columns to ExemptionStudent
ALTER TABLE "ExemptionStudent" ADD COLUMN IF NOT EXISTS "externalCardNumber" TEXT;
