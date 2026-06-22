-- Add job_id to rfq_drafts so job context survives navigation away from /rfq
-- (e.g. visiting the manufacturer portal and returning via ?draft= URL)
-- On resume the init effect re-fetches the job row and restores all fields.

ALTER TABLE rfq_drafts
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES builder_jobs(id) ON DELETE SET NULL;
