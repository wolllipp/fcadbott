-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Coordinator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
