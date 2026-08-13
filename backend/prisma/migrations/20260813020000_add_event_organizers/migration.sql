ALTER TYPE "EventAudience" ADD VALUE IF NOT EXISTS 'ORGANIZERS';

CREATE TABLE "EventOrganizer" (
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("eventId", "studentId")
);

CREATE INDEX "EventOrganizer_studentId_idx" ON "EventOrganizer"("studentId");

ALTER TABLE "EventOrganizer"
  ADD CONSTRAINT "EventOrganizer_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventOrganizer"
  ADD CONSTRAINT "EventOrganizer_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN "pointsForOrganization" INTEGER NOT NULL DEFAULT 0;
