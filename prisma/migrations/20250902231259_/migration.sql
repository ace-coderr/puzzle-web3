/*
  Warnings:

  - You are about to drop the column `txSignature` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GameResult` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `balance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - Made the column `gameResultId` on table `Bid` required. This step will fail if there are existing NULL values in that column.
  - Made the column `transactionId` on table `Bid` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_gameResultId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_transactionId_fkey";

-- AlterTable
ALTER TABLE "public"."Bid" DROP COLUMN "txSignature",
DROP COLUMN "updatedAt",
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "gameResultId" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "transactionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "updatedAt",
ALTER COLUMN "bidding" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "public"."Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "customId" DROP DEFAULT;
DROP SEQUENCE "User_customId_seq";

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "public"."GameResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
