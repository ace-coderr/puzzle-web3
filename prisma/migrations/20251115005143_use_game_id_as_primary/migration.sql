/*
  Warnings:

  - The primary key for the `GameResult` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GameResult` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Bid" DROP CONSTRAINT "Bid_gameResultId_fkey";

-- DropIndex
DROP INDEX "public"."GameResult_gameId_idx";

-- AlterTable
ALTER TABLE "public"."GameResult" DROP CONSTRAINT "GameResult_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "GameResult_pkey" PRIMARY KEY ("gameId");

-- CreateIndex
CREATE INDEX "GameResult_userId_idx" ON "public"."GameResult"("userId");

-- AddForeignKey
ALTER TABLE "public"."Bid" ADD CONSTRAINT "Bid_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "public"."GameResult"("gameId") ON DELETE RESTRICT ON UPDATE CASCADE;
