-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('BASIC', 'VERIFIED', 'PREMIUM');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "kyc_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "KycLevel" NOT NULL,
    "documentType" TEXT NOT NULL,
    "document_enc" TEXT NOT NULL,
    "selfie_enc" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "reject_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kyc_records_status_created_at_idx" ON "kyc_records"("status", "created_at" DESC);
