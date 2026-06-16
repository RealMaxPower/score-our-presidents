-- CreateTable
CREATE TABLE "user_votes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" VARCHAR(16) NOT NULL,
    "target_id" TEXT NOT NULL,
    "direction" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_score_snapshots" (
    "id" TEXT NOT NULL,
    "sub_criterion_id" TEXT NOT NULL,
    "president_id" TEXT NOT NULL,
    "median_good" DECIMAL(4,2) NOT NULL,
    "median_harm" DECIMAL(4,2) NOT NULL,
    "net_median" DECIMAL(4,2) NOT NULL,
    "contributor_count" INTEGER NOT NULL,
    "reputation_weighted_count" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_votes_target_type_target_id_idx" ON "user_votes"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "user_votes_user_id_idx" ON "user_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_votes_user_id_target_type_target_id_key" ON "user_votes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "community_score_snapshots_president_id_idx" ON "community_score_snapshots"("president_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_score_snapshots_sub_criterion_id_president_id_key" ON "community_score_snapshots"("sub_criterion_id", "president_id");

-- AddForeignKey
ALTER TABLE "user_votes" ADD CONSTRAINT "user_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
