/*
  Warnings:

  - You are about to drop the column `transactionId` on the `Bid` table. All the data in the column will be lost.
  - The primary key for the `GameResult` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_gameResultId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_transactionId_fkey";

-- DropIndex
DROP INDEX "public"."Bid_transactionId_key";

-- AlterTable
ALTER TABLE "public"."Bid" DROP COLUMN "transactionId",
ALTER COLUMN "gameResultId" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."GameResult" DROP CONSTRAINT "GameResult_pkey",
ADD COLUMN     "claimed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "bidding" SET DEFAULT 0,
ALTER COLUMN "moves" SET DEFAULT 0,
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "won" SET DEFAULT false,
ADD CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "GameResult_id_seq";

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "bidId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "public"."GameResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
