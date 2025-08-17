/*
  Warnings:

  - Added the required column `updatedAt` to the `GameResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BidStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "public"."Bid" ADD COLUMN     "status" "public"."BidStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."GameResult" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Bid_userId_idx" ON "public"."Bid"("userId");

-- CreateIndex
CREATE INDEX "Bid_createdAt_idx" ON "public"."Bid"("createdAt");

-- CreateIndex
CREATE INDEX "GameResult_userId_idx" ON "public"."GameResult"("userId");

-- CreateIndex
CREATE INDEX "GameResult_createdAt_idx" ON "public"."GameResult"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "public"."Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "public"."User"("walletAddress");
