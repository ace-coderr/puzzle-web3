/*
  Warnings:

  - The values [DEPOSIT,WITHDRAWAL,WIN,LOSE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `amount` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Decimal(18,9)`.
  - The `status` column on the `Bid` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `score` on the `GameResult` table. All the data in the column will be lost.
  - You are about to alter the column `bidding` on the `GameResult` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Decimal(18,9)`.
  - The `difficulty` column on the `GameResult` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `reward` on the `GameResult` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Decimal(18,9)`.
  - You are about to alter the column `amount` on the `Reward` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Decimal(18,9)`.
  - You are about to drop the column `updatedAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,9)`.
  - The `status` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `customId` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `balance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Decimal(18,9)`.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "public"."BidStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."TransactionType_new" AS ENUM ('BID', 'REWARD');
ALTER TABLE "public"."Transaction" ALTER COLUMN "type" TYPE "public"."TransactionType_new" USING ("type"::text::"public"."TransactionType_new");
ALTER TYPE "public"."TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "public"."TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."Bid_createdAt_idx";

-- DropIndex
DROP INDEX "public"."GameResult_won_idx";

-- DropIndex
DROP INDEX "public"."Reward_claimed_idx";

-- DropIndex
DROP INDEX "public"."Reward_userId_idx";

-- AlterTable
ALTER TABLE "public"."Bid" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,9),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."BidStatus" NOT NULL DEFAULT 'SUCCESS';

-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "score",
ADD COLUMN     "time" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "bidding" SET DATA TYPE DECIMAL(18,9),
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'medium',
ALTER COLUMN "reward" SET DATA TYPE DECIMAL(18,9);

-- AlterTable
ALTER TABLE "public"."Reward" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,9);

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "updatedAt",
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,9),
DROP COLUMN "type",
ADD COLUMN     "type" "public"."TransactionType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "customId",
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,9);

-- CreateIndex
CREATE INDEX "Reward_userId_claimed_idx" ON "public"."Reward"("userId", "claimed");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_bidId_idx" ON "public"."Transaction"("bidId");
