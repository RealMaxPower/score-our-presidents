-- CreateTable
CREATE TABLE "presidents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "term_start" DATE NOT NULL,
    "term_end" DATE,
    "party" VARCHAR(2) NOT NULL,
    "terms_served" TEXT NOT NULL,
    "calibration_anchor" BOOLEAN NOT NULL DEFAULT false,
    "anchor_status" TEXT,
    "in_office" BOOLEAN NOT NULL DEFAULT false,
    "cat_ten_status" TEXT NOT NULL,
    "partial_term_note" TEXT,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_weight" DECIMAL(5,2) NOT NULL,
    "weight_revision_note" TEXT,
    "weight_source_tag" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_criteria" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lens_presets" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lens_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lens_weights" (
    "id" TEXT NOT NULL,
    "lens_preset_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "lens_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_scores" (
    "id" TEXT NOT NULL,
    "president_id" TEXT NOT NULL,
    "sub_criterion_id" TEXT NOT NULL,
    "good_score" INTEGER,
    "harm_score" INTEGER,
    "low_confidence" BOOLEAN NOT NULL DEFAULT false,
    "insufficient_time_elapsed" BOOLEAN NOT NULL DEFAULT false,
    "tentative_long_tail" BOOLEAN NOT NULL DEFAULT false,
    "partial_term_long_tail" BOOLEAN NOT NULL DEFAULT false,
    "era_context" TEXT,
    "notes" TEXT NOT NULL,
    "primary_attribution_event" TEXT,
    "secondary_attribution_event" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "expert_score_id" TEXT,
    "user_score_id" TEXT,
    "source_url" TEXT,
    "citation" TEXT,
    "source_type" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "claim" TEXT NOT NULL,
    "verbatim_quote" TEXT,
    "direction" VARCHAR(4) NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "account_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reputation_score" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_weights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "president_id" TEXT NOT NULL,
    "sub_criterion_id" TEXT NOT NULL,
    "good_score" INTEGER,
    "harm_score" INTEGER,
    "notes" TEXT NOT NULL,
    "outlier_flag" BOOLEAN NOT NULL DEFAULT false,
    "reputation_weighted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregate_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "lens_preset_id" TEXT,
    "president_id" TEXT NOT NULL,
    "category_id" TEXT,
    "median_good" DECIMAL(5,2),
    "median_harm" DECIMAL(5,2),
    "iqr_good" DECIMAL(5,2),
    "iqr_harm" DECIMAL(5,2),
    "median_weighted_total" DECIMAL(6,2),
    "iqr_weighted_total" DECIMAL(6,2),
    "user_count" INTEGER NOT NULL,
    "qualified_user_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aggregate_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spec_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "released_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spec_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_verification_logs" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "status_code" INTEGER,
    "error_message" TEXT,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "presidents_slug_key" ON "presidents"("slug");

-- CreateIndex
CREATE INDEX "presidents_calibration_anchor_idx" ON "presidents"("calibration_anchor");

-- CreateIndex
CREATE INDEX "presidents_in_office_idx" ON "presidents"("in_office");

-- CreateIndex
CREATE UNIQUE INDEX "categories_number_key" ON "categories"("number");

-- CreateIndex
CREATE UNIQUE INDEX "sub_criteria_number_key" ON "sub_criteria"("number");

-- CreateIndex
CREATE INDEX "sub_criteria_category_id_idx" ON "sub_criteria"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "lens_presets_slug_key" ON "lens_presets"("slug");

-- CreateIndex
CREATE INDEX "lens_weights_lens_preset_id_idx" ON "lens_weights"("lens_preset_id");

-- CreateIndex
CREATE UNIQUE INDEX "lens_weights_lens_preset_id_category_id_key" ON "lens_weights"("lens_preset_id", "category_id");

-- CreateIndex
CREATE INDEX "expert_scores_president_id_idx" ON "expert_scores"("president_id");

-- CreateIndex
CREATE INDEX "expert_scores_sub_criterion_id_idx" ON "expert_scores"("sub_criterion_id");

-- CreateIndex
CREATE INDEX "expert_scores_low_confidence_idx" ON "expert_scores"("low_confidence");

-- CreateIndex
CREATE UNIQUE INDEX "expert_scores_president_id_sub_criterion_id_key" ON "expert_scores"("president_id", "sub_criterion_id");

-- CreateIndex
CREATE INDEX "evidence_expert_score_id_idx" ON "evidence"("expert_score_id");

-- CreateIndex
CREATE INDEX "evidence_user_score_id_idx" ON "evidence"("user_score_id");

-- CreateIndex
CREATE INDEX "evidence_tier_idx" ON "evidence"("tier");

-- CreateIndex
CREATE INDEX "evidence_source_type_idx" ON "evidence"("source_type");

-- CreateIndex
CREATE INDEX "evidence_verification_status_idx" ON "evidence"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_auth_id_key" ON "user_profiles"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");

-- CreateIndex
CREATE INDEX "user_profiles_auth_id_idx" ON "user_profiles"("auth_id");

-- CreateIndex
CREATE INDEX "user_profiles_email_idx" ON "user_profiles"("email");

-- CreateIndex
CREATE INDEX "user_profiles_reputation_score_idx" ON "user_profiles"("reputation_score");

-- CreateIndex
CREATE INDEX "user_profiles_deleted_at_idx" ON "user_profiles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_session_token_idx" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "user_weights_user_id_idx" ON "user_weights"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_weights_user_id_category_id_key" ON "user_weights"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "user_scores_user_id_idx" ON "user_scores"("user_id");

-- CreateIndex
CREATE INDEX "user_scores_president_id_idx" ON "user_scores"("president_id");

-- CreateIndex
CREATE INDEX "user_scores_outlier_flag_idx" ON "user_scores"("outlier_flag");

-- CreateIndex
CREATE UNIQUE INDEX "user_scores_user_id_president_id_sub_criterion_id_key" ON "user_scores"("user_id", "president_id", "sub_criterion_id");

-- CreateIndex
CREATE INDEX "aggregate_snapshots_snapshot_date_idx" ON "aggregate_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "aggregate_snapshots_president_id_idx" ON "aggregate_snapshots"("president_id");

-- CreateIndex
CREATE INDEX "aggregate_snapshots_lens_preset_id_idx" ON "aggregate_snapshots"("lens_preset_id");

-- CreateIndex
CREATE UNIQUE INDEX "aggregate_snapshots_snapshot_date_lens_preset_id_president__key" ON "aggregate_snapshots"("snapshot_date", "lens_preset_id", "president_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "spec_versions_version_key" ON "spec_versions"("version");

-- CreateIndex
CREATE INDEX "url_verification_logs_evidence_id_idx" ON "url_verification_logs"("evidence_id");

-- CreateIndex
CREATE INDEX "url_verification_logs_checked_at_idx" ON "url_verification_logs"("checked_at");

-- AddForeignKey
ALTER TABLE "sub_criteria" ADD CONSTRAINT "sub_criteria_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lens_weights" ADD CONSTRAINT "lens_weights_lens_preset_id_fkey" FOREIGN KEY ("lens_preset_id") REFERENCES "lens_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lens_weights" ADD CONSTRAINT "lens_weights_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_scores" ADD CONSTRAINT "expert_scores_president_id_fkey" FOREIGN KEY ("president_id") REFERENCES "presidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_scores" ADD CONSTRAINT "expert_scores_sub_criterion_id_fkey" FOREIGN KEY ("sub_criterion_id") REFERENCES "sub_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_expert_score_id_fkey" FOREIGN KEY ("expert_score_id") REFERENCES "expert_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_user_score_id_fkey" FOREIGN KEY ("user_score_id") REFERENCES "user_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weights" ADD CONSTRAINT "user_weights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weights" ADD CONSTRAINT "user_weights_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scores" ADD CONSTRAINT "user_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scores" ADD CONSTRAINT "user_scores_president_id_fkey" FOREIGN KEY ("president_id") REFERENCES "presidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scores" ADD CONSTRAINT "user_scores_sub_criterion_id_fkey" FOREIGN KEY ("sub_criterion_id") REFERENCES "sub_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregate_snapshots" ADD CONSTRAINT "aggregate_snapshots_president_id_fkey" FOREIGN KEY ("president_id") REFERENCES "presidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregate_snapshots" ADD CONSTRAINT "aggregate_snapshots_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregate_snapshots" ADD CONSTRAINT "aggregate_snapshots_lens_preset_id_fkey" FOREIGN KEY ("lens_preset_id") REFERENCES "lens_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
