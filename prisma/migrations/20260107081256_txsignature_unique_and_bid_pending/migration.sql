/*
  Warnings:

  - You are about to drop the column `moves` on the `GameResult` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[txSignature]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Bid" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "moves";

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txSignature_key" ON "public"."Transaction"("txSignature");
