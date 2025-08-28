/*
  Warnings:

  - You are about to drop the column `status` on the `Bid` table. All the data in the column will be lost.
  - You are about to drop the column `txSignature` on the `Bid` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `result` on the `GameResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gameResultId]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bidding` to the `GameResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moves` to the `GameResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `GameResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `won` to the `GameResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Bid_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Bid_userId_idx";

-- DropIndex
DROP INDEX "public"."GameResult_createdAt_idx";

-- DropIndex
DROP INDEX "public"."GameResult_userId_idx";

-- AlterTable
ALTER TABLE "public"."Bid" DROP COLUMN "status",
DROP COLUMN "txSignature",
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "result",
ADD COLUMN     "bidding" INTEGER NOT NULL,
ADD COLUMN     "moves" INTEGER NOT NULL,
ADD COLUMN     "score" INTEGER NOT NULL,
ADD COLUMN     "won" BOOLEAN NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Bid_gameResultId_key" ON "public"."Bid"("gameResultId");
