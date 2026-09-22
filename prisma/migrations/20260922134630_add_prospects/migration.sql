-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'LOST', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "googleMapsUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "photoCount" INTEGER,
    "hasOpeningHours" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "customerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectAudit" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "siteHealthScore" INTEGER NOT NULL,
    "sslOk" BOOLEAN NOT NULL DEFAULT false,
    "performanceScore" INTEGER,
    "accessibilityScore" INTEGER,
    "bestPracticesScore" INTEGER,
    "seoScore" INTEGER,
    "lcp" TEXT,
    "cls" TEXT,
    "tbt" TEXT,
    "hasTitle" BOOLEAN NOT NULL DEFAULT false,
    "hasMetaDescription" BOOLEAN NOT NULL DEFAULT false,
    "h1Count" INTEGER,
    "hasSchema" BOOLEAN NOT NULL DEFAULT false,
    "isWordPress" BOOLEAN NOT NULL DEFAULT false,
    "hasRobotsTxt" BOOLEAN NOT NULL DEFAULT false,
    "hasSitemap" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_googlePlaceId_key" ON "Prospect"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Prospect_province_district_idx" ON "Prospect"("province", "district");

-- CreateIndex
CREATE INDEX "Prospect_customerId_idx" ON "Prospect"("customerId");

-- CreateIndex
CREATE INDEX "ProspectAudit_prospectId_idx" ON "ProspectAudit"("prospectId");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectAudit" ADD CONSTRAINT "ProspectAudit_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
