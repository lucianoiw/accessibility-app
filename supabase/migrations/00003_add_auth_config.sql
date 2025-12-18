-- Migration: Add auth_config to projects table
-- Run this in Supabase SQL Editor

-- Add auth_config column (JSONB for flexibility)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS auth_config JSONB DEFAULT NULL;

-- Comment explaining the structure
COMMENT ON COLUMN projects.auth_config IS 'Authentication config (Postman-style). Example: {"type": "bearer", "token": "xxx"} or {"type": "none"}';

-- Example values:
-- No Auth: NULL or {"type": "none"}
-- Bearer Token: {"type": "bearer", "token": "your-token-here"}
-- Future - Basic Auth: {"type": "basic", "username": "user", "password": "pass"}
-- Future - API Key: {"type": "apikey", "key": "X-API-Key", "value": "xxx", "location": "header"}
