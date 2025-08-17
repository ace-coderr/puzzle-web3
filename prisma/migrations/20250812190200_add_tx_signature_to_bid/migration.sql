/*
  Warnings:

  - You are about to drop the column `gameId` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `placedAt` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `solAmount` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `bidding` on the `GameResult` table. All the data in the column will be lost.
  - You are about to drop the column `moves` on the `GameResult` table. All the data in the column will be lost.
  - You are about to drop the column `playedAt` on the `GameResult` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `GameResult` table. All the data in the column will be lost.
  - You are about to drop the column `won` on the `GameResult` table. All the data in the column will be lost.
  - Added the required column `result` to the `GameResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_gameId_fkey";

-- AlterTable
ALTER TABLE "public"."Bid" DROP COLUMN "gameId",
DROP COLUMN "placedAt",
DROP COLUMN "solAmount",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gameResultId" INTEGER,
ADD COLUMN     "txSignature" TEXT;

-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "bidding",
DROP COLUMN "moves",
DROP COLUMN "playedAt",
DROP COLUMN "score",
DROP COLUMN "won",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "result" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "public"."GameResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
