CREATE TABLE "PersonalDebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDebtPayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PersonalDebtPayment" ADD CONSTRAINT "PersonalDebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "PersonalDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PersonalDebtPayment_debtId_idx" ON "PersonalDebtPayment"("debtId");
