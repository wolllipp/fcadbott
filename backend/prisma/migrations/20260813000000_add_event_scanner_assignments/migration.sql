CREATE TABLE "EventScannerCoordinator" (
    "eventId" INTEGER NOT NULL,
    "coordinatorId" INTEGER NOT NULL,

    CONSTRAINT "EventScannerCoordinator_pkey" PRIMARY KEY ("eventId", "coordinatorId")
);

CREATE INDEX "EventScannerCoordinator_coordinatorId_idx" ON "EventScannerCoordinator"("coordinatorId");

ALTER TABLE "EventScannerCoordinator"
  ADD CONSTRAINT "EventScannerCoordinator_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventScannerCoordinator"
  ADD CONSTRAINT "EventScannerCoordinator_coordinatorId_fkey"
  FOREIGN KEY ("coordinatorId") REFERENCES "Coordinator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EventScannerCoordinator" ("eventId", "coordinatorId")
SELECT "id", COALESCE("scannerCoordinatorId", "createdBy")
FROM "Event"
ON CONFLICT DO NOTHING;
