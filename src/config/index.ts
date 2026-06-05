import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  PLAYWRIGHT_HEADLESS: z.string().default('true'),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().default(5),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  throw error;
}

export default config;

// Target states for discovery (exclude TX)
export const TARGET_STATES = [
  'OK',
  'AR',
  'LA',
  'NM',
  'CO',
  'AZ',
  'UT',
  'KS',
  'MO',
  'TN',
  'MS',
  'AL',
  'GA',
  'FL',
  'NC',
  'SC',
  'VA',
  'KY',
  'IN',
  'OH',
  'PA',
];

// Search query templates
export const SEARCH_QUERY_TEMPLATES = [
  'plumber in {city}',
  'emergency plumber in {city}',
  '24 hour plumber in {city}',
  'plumbing service {city}',
  'local plumber near {city}',
  '{city} plumber',
];

// Major cities per state for discovery
export const MAJOR_CITIES_BY_STATE: Record<string, string[]> = {
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow'],
  AR: ['Little Rock', 'Fayetteville', 'Jonesboro', 'Bentonville'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette'],
  NM: ['Albuquerque', 'Santa Fe', 'Rio Rancho', 'Roswell'],
  CO: ['Denver', 'Boulder', 'Colorado Springs', 'Fort Collins'],
  AZ: ['Phoenix', 'Mesa', 'Chandler', 'Tempe'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'Orem'],
  KS: ['Kansas City', 'Wichita', 'Overland Park', 'Topeka'],
  MO: ['Kansas City', 'St. Louis', 'Springfield', 'Independence'],
  TN: ['Memphis', 'Nashville', 'Knoxville', 'Chattanooga'],
  MS: ['Jackson', 'Gulfport', 'Biloxi', 'Hattiesburg'],
  AL: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
  GA: ['Atlanta', 'Augusta', 'Savannah', 'Athens'],
  FL: ['Miami', 'Tampa', 'Orlando', 'Jacksonville'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham'],
  SC: ['Charleston', 'Columbia', 'Greenville', 'Spartanburg'],
  VA: ['Virginia Beach', 'Richmond', 'Arlington', 'Alexandria'],
  KY: ['Louisville', 'Lexington', 'Covington', 'Bowling Green'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
};

// Live chat providers to detect
export const LIVE_CHAT_PROVIDERS = [
  'intercom',
  'drift',
  'tawk',
  'livechat',
  'hubspot',
  'zendesk',
  'freshchat',
  'front',
  'olark',
  'chatwoot',
];

// Online booking indicators
export const BOOKING_INDICATORS = [
  'calendly',
  'acuity',
  'appointment',
  'booking',
  'schedule',
  'reserve',
  'book now',
  'select date',
  'pick a time',
];

// Emergency service indicators
export const EMERGENCY_SERVICE_INDICATORS = [
  '24/7',
  '24 hour',
  'emergency',
  'after hours',
  'immediate',
  'same day',
  'urgent',
  'anytime',
];
