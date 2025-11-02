-- DropIndex
DROP INDEX "public"."User_customId_key";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "customId" SET DATA TYPE TEXT;
