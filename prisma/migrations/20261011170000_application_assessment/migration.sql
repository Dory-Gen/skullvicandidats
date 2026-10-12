ALTER TABLE "applications"
  ADD COLUMN "qualification" TEXT NOT NULL DEFAULT 'to_review',
  ADD COLUMN "score" INTEGER,
  ADD COLUMN "priority" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "assessment_notes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "applications"
  ADD CONSTRAINT "applications_qualification_check"
    CHECK ("qualification" IN ('to_review', 'qualified', 'not_qualified')),
  ADD CONSTRAINT "applications_score_check"
    CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);

CREATE INDEX "applications_priority_score_idx"
  ON "applications"("priority" DESC, "score" DESC, "created_at" DESC);
