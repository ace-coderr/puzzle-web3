/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- DropIndex
DROP INDEX "public"."Transaction_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Transaction_userId_idx";

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "updatedAt",
ADD COLUMN     "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING';
