-- ============================================
-- Migration: Add Violation Overrides
-- Purpose: Allow users to mark violations as false_positive/ignored/fixed
--          with persistence across audits using fingerprint matching
-- ============================================

-- ============================================
-- VIOLATION_OVERRIDES TABLE
-- Stores human evaluations that persist across audits
-- ============================================

CREATE TYPE violation_override_type AS ENUM (
  'false_positive',  -- Not a real accessibility issue
  'ignored',         -- Known issue, choosing not to fix
  'fixed'            -- User claims it's fixed
);

CREATE TABLE violation_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Scope: project level (persists across audits)
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Matching key: rule_id is the primary fingerprint
  -- For more granular matching, use element_xpath
  rule_id TEXT NOT NULL,

  -- Optional: element-level override using XPath (more stable than CSS selector)
  -- If NULL, override applies to entire rule in this project
  -- If set, override applies only to elements matching this XPath pattern
  element_xpath TEXT,

  -- Alternative matching: text content hash for elements without stable XPath
  -- Hash of normalized text content (e.g., link text, alt text)
  element_content_hash TEXT,

  -- The override decision
  override_type violation_override_type NOT NULL,

  -- User explanation (why this is a false positive, etc)
  notes TEXT,

  -- Who created this override
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- When was this override last verified as still applicable
  -- If the violation reappears after being marked 'fixed', this helps detect it
  last_seen_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index: combination of project + rule + element identifiers
-- Using COALESCE to handle NULL values (can't use in table constraint)
CREATE UNIQUE INDEX idx_violation_overrides_unique
  ON violation_overrides (
    project_id,
    rule_id,
    COALESCE(element_xpath, ''),
    COALESCE(element_content_hash, '')
  );

-- Indexes for efficient lookups
CREATE INDEX idx_violation_overrides_project_id ON violation_overrides(project_id);
CREATE INDEX idx_violation_overrides_rule_id ON violation_overrides(rule_id);
CREATE INDEX idx_violation_overrides_type ON violation_overrides(override_type);
CREATE INDEX idx_violation_overrides_project_rule ON violation_overrides(project_id, rule_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE violation_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view overrides for their own projects
CREATE POLICY "Users can view overrides of own projects" ON violation_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = violation_overrides.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can create overrides for their own projects
CREATE POLICY "Users can insert overrides to own projects" ON violation_overrides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = violation_overrides.project_id
      AND projects.user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- Users can update overrides they created
CREATE POLICY "Users can update own overrides" ON violation_overrides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = violation_overrides.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete overrides from their own projects
CREATE POLICY "Users can delete overrides from own projects" ON violation_overrides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = violation_overrides.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================

CREATE TRIGGER update_violation_overrides_updated_at
  BEFORE UPDATE ON violation_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Find matching override for a violation
-- Returns the most specific override that matches
-- ============================================

CREATE OR REPLACE FUNCTION find_violation_override(
  p_project_id UUID,
  p_rule_id TEXT,
  p_element_xpath TEXT DEFAULT NULL,
  p_element_content_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  override_type violation_override_type,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Priority: most specific match first
  -- 1. Exact match on xpath AND content_hash (if both provided)
  -- 2. Match on xpath only
  -- 3. Match on content_hash only
  -- 4. Rule-level match (no element identifiers)

  RETURN QUERY
  SELECT
    vo.id,
    vo.override_type,
    vo.notes,
    vo.created_at
  FROM violation_overrides vo
  WHERE vo.project_id = p_project_id
    AND vo.rule_id = p_rule_id
    AND (
      -- Exact element match
      (vo.element_xpath IS NOT NULL AND vo.element_xpath = p_element_xpath)
      OR
      -- Content hash match
      (vo.element_content_hash IS NOT NULL AND vo.element_content_hash = p_element_content_hash)
      OR
      -- Rule-level match (no element specifics)
      (vo.element_xpath IS NULL AND vo.element_content_hash IS NULL)
    )
  ORDER BY
    -- Most specific first
    CASE
      WHEN vo.element_xpath IS NOT NULL AND vo.element_content_hash IS NOT NULL THEN 1
      WHEN vo.element_xpath IS NOT NULL THEN 2
      WHEN vo.element_content_hash IS NOT NULL THEN 3
      ELSE 4
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE violation_overrides IS
  'Stores human evaluations of violations that persist across audits. Uses rule_id + optional element identifiers for matching.';

COMMENT ON COLUMN violation_overrides.element_xpath IS
  'Optional XPath for element-level overrides. More stable than CSS selectors across deploys.';

COMMENT ON COLUMN violation_overrides.element_content_hash IS
  'Optional hash of element text content for matching when XPath changes but content is same.';

COMMENT ON COLUMN violation_overrides.last_seen_at IS
  'Updated when the violation is detected in a new audit. Helps detect "fixed but still exists" cases.';
