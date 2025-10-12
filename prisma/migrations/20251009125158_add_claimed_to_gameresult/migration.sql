-- AlterTable
ALTER TABLE "public"."GameResult" ADD COLUMN     "claimTx" TEXT,
ALTER COLUMN "bidding" SET DATA TYPE DECIMAL(65,30);
