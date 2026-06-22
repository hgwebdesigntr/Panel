-- Drop unique constraint, replace with regular index
DROP INDEX IF EXISTS "Transaction_jobId_key";
CREATE INDEX IF NOT EXISTS "Transaction_jobId_idx" ON "Transaction"("jobId");

-- Also clean up old Payment records linked to job-synced transactions
-- so the new approach (direct amounts, no payments) starts clean
DELETE FROM "Payment"
WHERE "transactionId" IN (
  SELECT id FROM "Transaction" WHERE "jobId" IS NOT NULL
);
