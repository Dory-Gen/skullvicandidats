ALTER TABLE "applications"
  ADD COLUMN "resume_data" BYTEA,
  ADD COLUMN "has_resume" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "applications"
SET "has_resume" = TRUE
WHERE "resume_key" IS NOT NULL;
