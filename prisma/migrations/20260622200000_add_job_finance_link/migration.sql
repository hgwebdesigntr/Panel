-- AlterTable: Add jobId to Transaction
ALTER TABLE "Transaction" ADD COLUMN "jobId" TEXT;

-- CreateIndex: Unique constraint on jobId
CREATE UNIQUE INDEX "Transaction_jobId_key" ON "Transaction"("jobId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
