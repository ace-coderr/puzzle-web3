-- AlterTable
ALTER TABLE "public"."Bid" ADD COLUMN     "status" "public"."BidStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "txSignature" TEXT;
