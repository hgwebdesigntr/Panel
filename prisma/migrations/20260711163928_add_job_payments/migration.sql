-- CreateTable
CREATE TABLE "JobPayment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPayment_jobId_idx" ON "JobPayment"("jobId");

-- AddForeignKey
ALTER TABLE "JobPayment" ADD CONSTRAINT "JobPayment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
