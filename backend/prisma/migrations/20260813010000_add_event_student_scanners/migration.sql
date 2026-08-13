CREATE TABLE "EventStudentScanner" (
    "eventId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    CONSTRAINT "EventStudentScanner_pkey" PRIMARY KEY ("eventId", "studentId")
);

CREATE INDEX "EventStudentScanner_studentId_idx" ON "EventStudentScanner"("studentId");

ALTER TABLE "EventStudentScanner"
  ADD CONSTRAINT "EventStudentScanner_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventStudentScanner"
  ADD CONSTRAINT "EventStudentScanner_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
