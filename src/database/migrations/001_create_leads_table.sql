-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website TEXT UNIQUE,
  phone TEXT UNIQUE,
  email TEXT,
  contact_name TEXT,
  contact_title TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  google_rating NUMERIC,
  google_reviews INTEGER,
  services TEXT[],
  service_area TEXT[],
  website_score INTEGER CHECK (website_score IS NULL OR (website_score >= 1 AND website_score <= 100)),
  lead_score INTEGER CHECK (lead_score IS NULL OR (lead_score >= 1 AND lead_score <= 100)),
  missed_call_score INTEGER CHECK (missed_call_score IS NULL OR (missed_call_score >= 1 AND missed_call_score <= 100)),
  has_online_booking BOOLEAN DEFAULT NULL,
  has_live_chat BOOLEAN DEFAULT NULL,
  offers_emergency_service BOOLEAN DEFAULT NULL,
  estimated_company_size TEXT CHECK (estimated_company_size IS NULL OR estimated_company_size IN ('solo', 'small', 'medium', 'large')),
  notes TEXT,
  source TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_website_score ON leads(website_score);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_missed_call_score ON leads(missed_call_score);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads USING GIN (to_tsvector('english', company_name));

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);
