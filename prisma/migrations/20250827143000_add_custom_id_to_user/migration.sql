/*
  Warnings:

  - A unique constraint covering the columns `[customId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "customId" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_customId_key" ON "public"."User"("customId");
