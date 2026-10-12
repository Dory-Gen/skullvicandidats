CREATE TABLE IF NOT EXISTS "admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_lower_unique" ON "admins"(lower("email"));

CREATE TABLE IF NOT EXISTS "admin_sessions" (
    "token_hash" TEXT NOT NULL,
    "admin_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("token_hash")
);

CREATE INDEX IF NOT EXISTS "admin_sessions_expiry_idx" ON "admin_sessions"("expires_at");

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL,
    "work_mode" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "closing_at" DATE,
    "form_fields" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "jobs_status_check" CHECK ("status" IN ('draft', 'published', 'closed')),
    CONSTRAINT "jobs_form_fields_array_check" CHECK (jsonb_typeof("form_fields") = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_slug_key" ON "jobs"("slug");
CREATE INDEX IF NOT EXISTS "jobs_publication_idx" ON "jobs"("status", "published_at" DESC);

CREATE TABLE IF NOT EXISTS "applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "resume_key" TEXT,
    "resume_version_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applications_status_check"
      CHECK ("status" IN ('new', 'reviewing', 'interview', 'accepted', 'rejected')),
    CONSTRAINT "applications_answers_object_check" CHECK (jsonb_typeof("answers") = 'object')
);

ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "resume_version_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_job_id_fkey'
      AND conrelid = '"applications"'::regclass
  ) THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_job_id_fkey"
      FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "applications_job_email_unique"
  ON "applications"("job_id", lower("email"));
CREATE INDEX IF NOT EXISTS "applications_recent_idx" ON "applications"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "applications_job_idx"
  ON "applications"("job_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "request_rate_limits" (
    "bucket_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" TIMESTAMPTZ(6),
    CONSTRAINT "request_rate_limits_pkey" PRIMARY KEY ("bucket_key")
);

CREATE INDEX IF NOT EXISTS "request_rate_limits_window_idx"
  ON "request_rate_limits"("window_started_at");

CREATE TABLE IF NOT EXISTS "storage_deletion_queue" (
    "object_key" TEXT NOT NULL,
    "version_id" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_deletion_queue_pkey" PRIMARY KEY ("object_key")
);

ALTER TABLE "storage_deletion_queue"
  ADD COLUMN IF NOT EXISTS "version_id" TEXT;
