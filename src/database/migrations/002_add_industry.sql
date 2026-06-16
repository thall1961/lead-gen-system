-- Migration 002: add industry vertical to leads
--
-- The system was originally plumbing-only and had no industry column. It is now
-- multi-industry (see INDUSTRY_VERTICALS in src/config/index.ts); discovery tags
-- each lead with the vertical it was found under. This migration is additive and
-- safe to run against an existing leads table.
--
-- Apply in the Supabase SQL Editor before running multi-industry discovery.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
