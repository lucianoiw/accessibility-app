-- ============================================
-- Migration: Remove IGT Tables
-- Reason: IGT functionality replaced by violation_overrides system
-- which works for ALL violations and persists across audits
-- ============================================

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS igt_violations;
DROP TABLE IF EXISTS igt_sessions;

-- Drop enums
DROP TYPE IF EXISTS igt_answer_result;
DROP TYPE IF EXISTS igt_status;
DROP TYPE IF EXISTS igt_category;

-- Note: The new violation_overrides system (migration 00020) provides:
-- - Persistent evaluations (false_positive, ignored, fixed) across audits
-- - Works for ALL violations, not just specific types
-- - Integrated directly into violations list UI
-- - Detection of "marked as fixed but still detected"
