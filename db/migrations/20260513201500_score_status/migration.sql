-- Legal-review §4.3: per-sub-criterion score_status flag
-- Null = final (default); "provisional" = pending adjudication of underlying claim.

-- AlterTable
ALTER TABLE "expert_scores" ADD COLUMN "score_status" TEXT;

-- CreateIndex
CREATE INDEX "expert_scores_score_status_idx" ON "expert_scores"("score_status");
