-- Add trigger_run_id to audits table for cancellation support
ALTER TABLE audits ADD COLUMN IF NOT EXISTS trigger_run_id TEXT;

-- Index for quick lookup when cancelling
CREATE INDEX IF NOT EXISTS idx_audits_trigger_run_id ON audits(trigger_run_id) WHERE trigger_run_id IS NOT NULL;
