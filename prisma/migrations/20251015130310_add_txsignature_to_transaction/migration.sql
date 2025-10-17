/*
  Warnings:

  - You are about to drop the column `claimTx` on the `GameResult` table. All the data in the column will be lost.
  - You are about to alter the column `bidding` on the `GameResult` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,8)`.

*/
-- AlterTable
ALTER TABLE "public"."GameResult" DROP COLUMN "claimTx",
ALTER COLUMN "bidding" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "txSignature" TEXT;
