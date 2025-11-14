-- DropIndex
DROP INDEX "public"."GameResult_gameId_key";

-- CreateIndex
CREATE INDEX "GameResult_gameId_idx" ON "public"."GameResult"("gameId");
