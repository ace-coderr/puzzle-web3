/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gameId]` on the table `GameResult` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gameId` to the `GameResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Bid" ADD COLUMN     "transactionId" INTEGER;

-- AlterTable
ALTER TABLE "public"."GameResult" ADD COLUMN     "gameId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Bid_transactionId_key" ON "public"."Bid"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_gameId_key" ON "public"."GameResult"("gameId");

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
