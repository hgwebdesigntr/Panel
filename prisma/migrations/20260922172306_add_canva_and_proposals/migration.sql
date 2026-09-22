-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "CanvaConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "offerText" TEXT NOT NULL,
    "demoUrl" TEXT,
    "canvaDesignId" TEXT,
    "pdfUrl" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Proposal_prospectId_idx" ON "Proposal"("prospectId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
