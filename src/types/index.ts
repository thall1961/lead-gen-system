// Lead record as stored in database
export interface Lead {
  id: string;
  company_name: string;
  website?: string;
  phone?: string;
  email?: string;
  contact_name?: string;
  contact_title?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  google_rating?: number;
  google_reviews?: number;
  services?: string[];
  service_area?: string[];
  website_score?: number;
  lead_score?: number;
  missed_call_score?: number;
  has_online_booking?: boolean;
  has_live_chat?: boolean;
  offers_emergency_service?: boolean;
  estimated_company_size?: 'solo' | 'small' | 'medium' | 'large';
  notes?: string;
  source?: string;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
}

// Discovery result
export interface DiscoveryResult {
  company_name: string;
  website?: string;
  phone?: string;
  city: string;
  state: string;
  source: string;
}

// Website analysis result
export interface WebsiteAnalysis {
  emails: string[];
  phones: string[];
  contact_names: string[];
  contact_titles: string[];
  services: string[];
  has_emergency_service: boolean;
  has_online_booking: boolean;
  has_live_chat: boolean;
  estimated_company_size: 'solo' | 'small' | 'medium' | 'large';
  website_quality_score: number;
  content_summary: string;
}

// AI Scoring result
export interface LeadScoringResult {
  lead_score: number;
  reasoning: string;
  key_factors: string[];
}

// Missed call scoring result
export interface MissedCallScoringResult {
  missed_call_score: number;
  reasoning: string;
  indicators: string[];
}

// Contact enrichment result
export interface ContactEnrichment {
  contact_name?: string;
  contact_title?: string;
  email?: string;
}

// Batch processing options
export interface BatchOptions {
  skip?: number;
  limit?: number;
  resume?: boolean;
  dryRun?: boolean;
}

// Logger interface
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Page content
export interface PageContent {
  url: string;
  title: string;
  text: string;
  html?: string;
}
