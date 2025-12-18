-- Add unique_elements field to track individual affected elements within aggregated violations
-- This allows showing distinct elements (different buttons, links, etc.) within the same rule violation

ALTER TABLE aggregated_violations
ADD COLUMN unique_elements JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN aggregated_violations.unique_elements IS 'Array of unique elements: [{html: string, selector: string, count: number, pages: string[]}]';
