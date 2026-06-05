# Plumber Lead Generation System

A production-quality Node.js/TypeScript platform for discovering plumbing companies, analyzing their websites, extracting contact information, and scoring them as prospects for AI phone answering services.

## Features

- **Company Discovery**: Automated search across 20+ US states to find plumbing companies
- **Website Analysis**: Extract contact info, services, and features from company websites
- **Lead Scoring**: AI-powered qualification to identify high-quality prospects
- **Missed Call Detection**: Score likelihood that calls go unanswered
- **Contact Enrichment**: Find public contact names and titles from websites
- **Screenshots**: Capture homepage screenshots for quality assessment
- **Web Dashboard**: Browse, filter, and analyze leads with real-time statistics
- **Reliable Processing**: Retry logic, error recovery, and resumable batch operations

## Tech Stack

- **Runtime**: Node.js 24+
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Browser Automation**: Playwright
- **AI Analysis**: Anthropic Claude API
- **Web Framework**: Express.js
- **Validation**: Zod
- **Testing**: Vitest
- **Concurrency**: p-limit

## Project Structure

```
src/
├── agents/
│   ├── discovery/       # Find plumbing companies
│   ├── analysis/        # Extract website information
│   ├── enrichment/      # Find additional contacts
│   └── scoring/         # AI qualification
├── services/
│   ├── browser/         # Playwright wrapper
│   ├── llm/            # Anthropic API client
│   ├── scraping/       # Web content extraction
│   ├── screenshots/    # Screenshot capture
│   └── geolocation/    # Location utilities
├── database/
│   ├── migrations/     # SQL migration scripts
│   ├── repositories/   # Data access layer
│   └── supabase.ts    # Database client
├── prompts/           # LLM prompts
├── types/             # TypeScript types
├── cli/               # Command-line interface
├── utils/             # Utility functions
├── config/            # Configuration
└── server.ts          # Express API server
```

## Installation

### Prerequisites

- Node.js 24+
- npm or yarn
- Supabase account (create free at https://supabase.com)
- Anthropic API key (get at https://console.anthropic.com)

### Setup

1. **Clone and install dependencies**
   ```bash
   cd lead-gen-system
   npm install
   ```

2. **Create Supabase project**
   - Go to https://supabase.com and create a new project
   - Note your project URL and service role key

3. **Run database migration**
   - In Supabase dashboard, go to SQL Editor
   - Create a new query
   - Copy and paste contents of `src/database/migrations/001_create_leads_table.sql`
   - Execute the query

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ANTHROPIC_API_KEY=your-api-key
   PLAYWRIGHT_HEADLESS=true
   MAX_CONCURRENT_REQUESTS=5
   REQUEST_TIMEOUT_MS=30000
   LOG_LEVEL=info
   NODE_ENV=production
   ```

5. **Build project**
   ```bash
   npm run build
   ```

## Usage

### Command-Line Interface

Run batch operations to discover, analyze, and score leads:

#### Discover Companies
Find new plumbing companies across target states:
```bash
npm run discover
```

Searches major cities in: OK, AR, LA, NM, CO, AZ, UT, KS, MO, TN, MS, AL, GA, FL, NC, SC, VA, KY, IN, OH, PA

#### Analyze Websites
Extract information from discovered company websites:
```bash
npm run analyze [limit]
```
- Visits homepage, contact page, and about page
- Extracts emails, phones, and contact names
- Identifies services, emergency services, online booking, live chat
- Estimates company size
- Calculates website quality score
- Captures homepage screenshots

Example: `npm run analyze 20` (analyze 20 leads)

#### Score Leads
Run AI qualification and missed-call scoring:
```bash
npm run score [limit]
```
- Scores lead quality 1-100 based on characteristics
- Scores likelihood of missed calls 1-100
- Identifies key factors in scoring

Example: `npm run score 10` (score 10 leads)

#### Enrich Contacts
Find additional public contact information:
```bash
npm run enrich [limit]
```
- Visits about/team pages
- Extracts contact names and titles
- Finds additional email addresses

Example: `npm run enrich 10`

#### Capture Screenshots
Get homepage screenshots for quality review:
```bash
npm run screenshots [limit]
```
- Captures viewport screenshots
- Saves to `./screenshots` directory
- Stores paths in database

Example: `npm run screenshots 20`

### Web Dashboard

Start the web server to browse and filter leads:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**Dashboard Features:**
- View all leads with key metrics
- Filter by state, score ranges
- Search by company name, website, phone
- View detailed lead information
- Real-time statistics dashboard
- Mobile-responsive design

### API Endpoints

All endpoints return JSON.

#### Get Leads
```
GET /api/leads?state=OK&leadScoreMin=70&limit=50&skip=0
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "company_name": "Acme Plumbing",
      "website": "https://acmeplumbing.com",
      "phone": "555-123-4567",
      "email": "info@acmeplumbing.com",
      "lead_score": 75,
      "website_score": 68,
      "missed_call_score": 82,
      "state": "OK",
      ...
    }
  ],
  "count": 250
}
```

#### Get Lead Detail
```
GET /api/leads/{id}
```

#### Search Leads
```
GET /api/leads/search?q=acme
```

#### Get Statistics
```
GET /api/stats
```

Response:
```json
{
  "total": 250,
  "byState": { "OK": 45, "AR": 38, ... },
  "averageLeadScore": 62,
  "averageWebsiteScore": 58,
  "highQualityLeads": 45,
  "withLeadScore": 150,
  "withWebsiteScore": 200,
  "withEmail": 220,
  "withPhone": 235
}
```

## Database Schema

### `leads` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `company_name` | TEXT | Company name (required) |
| `website` | TEXT | Website URL (unique) |
| `phone` | TEXT | Phone number (unique) |
| `email` | TEXT | Contact email |
| `contact_name` | TEXT | Person name |
| `contact_title` | TEXT | Job title |
| `street` | TEXT | Street address |
| `city` | TEXT | City |
| `state` | TEXT | State (2 letter code) |
| `zip` | TEXT | ZIP code |
| `google_rating` | NUMERIC | Google rating (0-5) |
| `google_reviews` | INTEGER | Review count |
| `services` | TEXT[] | Array of services offered |
| `service_area` | TEXT[] | Array of service areas |
| `website_score` | INTEGER | Website quality (1-100) |
| `lead_score` | INTEGER | Lead quality (1-100) |
| `missed_call_score` | INTEGER | Likelihood of missed calls (1-100) |
| `has_online_booking` | BOOLEAN | Has booking system |
| `has_live_chat` | BOOLEAN | Has live chat |
| `offers_emergency_service` | BOOLEAN | 24/7 service offered |
| `estimated_company_size` | TEXT | 'solo', 'small', 'medium', 'large' |
| `notes` | TEXT | Internal notes |
| `source` | TEXT | Discovery source |
| `screenshot_url` | TEXT | Path to homepage screenshot |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

## Lead Scoring Logic

### Lead Quality Score (1-100)

**Higher scores** if company:
- Is small business (solo to small team)
- Offers 24/7 emergency services
- Has no live chat (more inbound calls)
- Has no online booking system
- Has poor/outdated website
- Is owner-operated
- Has limited office staff

**Lower scores** if company:
- Is large enterprise
- Has full office staff
- Has modern, professional website
- Uses live chat or online booking
- Has corporate structure

### Missed Call Score (1-100)

**High likelihood** if company:
- Offers 24/7 emergency service
- No online booking system
- No automated chat/answering
- Small team size
- Solo owner-operator
- Multiple service trucks (techs in field)

**Low likelihood** if company:
- Has scheduling system
- Has live chat
- Large office staff
- Dedicated receptionist

## Troubleshooting

### Database Connection Issues

```
Error: Failed to create lead: PGRST116
```

**Solution**: Verify Supabase credentials in `.env` file. Ensure service role key is correct (not anon key).

### Browser/Playwright Errors

```
Error: Browser failed to launch
```

**Solution**: Install system dependencies:
```bash
npx playwright install
npx playwright install-deps
```

### API Rate Limiting

```
Error: 429 Too Many Requests
```

**Solution**: Reduce `MAX_CONCURRENT_REQUESTS` in `.env` or add delays between runs.

### Timeout Issues

```
Error: Operation timed out after 30000ms
```

**Solution**: Increase `REQUEST_TIMEOUT_MS` in `.env` or check network connectivity.

### Memory Issues

If processing large batches:
- Reduce batch size with `[limit]` parameter
- Run CLI commands sequentially, not in parallel
- Monitor system memory during processing

## Performance Optimization

### For Discovery
- Limits queries to sample of states/cities (not exhaustive)
- Deduplicates by website, phone, and normalized company name
- Stores only verified basic information

### For Analysis
- Visits only essential pages (home, contact, about)
- Extracts up to 3 URLs per category
- Closes pages immediately after use
- Skips invalid URLs gracefully

### For Batch Processing
- Process in chunks of 10-20 leads per run
- Run multiple times per day instead of one large batch
- Resume support preserves progress across runs

### Concurrency
- `MAX_CONCURRENT_REQUESTS=5` by default
- Adjust based on system resources and API limits
- Lower on shared infrastructure

## Testing

Run test suite:
```bash
npm run test
```

Test specific file:
```bash
npm run test -- src/utils/__tests__/text.test.ts
```

Watch mode:
```bash
npm run test -- --watch
```

Current test coverage:
- Text normalization and extraction
- URL parsing and validation
- Phone/email formats

## Linting and Formatting

Check code style:
```bash
npm run lint
```

Auto-format code:
```bash
npm run format
```

## Production Deployment

### Build for Production

```bash
npm run build
```

Outputs compiled JavaScript to `./dist/` directory.

### Run Production Server

```bash
NODE_ENV=production npm start
```

### Systemd Service Example

Create `/etc/systemd/system/lead-gen.service`:

```ini
[Unit]
Description=Plumber Lead Generation System
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/lead-gen-system
Environment="NODE_ENV=production"
EnvironmentFile=/opt/lead-gen-system/.env
ExecStart=/usr/bin/node /opt/lead-gen-system/dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable lead-gen
sudo systemctl start lead-gen
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Build and run:
```bash
docker build -t lead-gen .
docker run -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -e ANTHROPIC_API_KEY=... -p 3000:3000 lead-gen
```

## Architecture Notes

### Agent Pattern
Each agent (Discovery, Analysis, Scoring, Enrichment) is independent and can be run separately. Agents follow the pattern:
1. Fetch necessary data
2. Process/analyze
3. Update database
4. Return results

### Service Layer
Services (Browser, LLM, Scraping, Screenshots) abstract external dependencies and can be mocked for testing.

### Repository Pattern
Data access is isolated in repositories for testability and maintainability.

### Error Handling
- Retry logic with exponential backoff
- Graceful degradation (skip failed items, continue with batch)
- Structured logging for debugging
- No data loss on partial failures

## Future Enhancements

- [ ] Google Maps integration for additional company info
- [ ] Social media presence detection
- [ ] Customer review aggregation
- [ ] Competitor analysis
- [ ] Lead quality machine learning model
- [ ] Scheduled batch processing
- [ ] Email verification
- [ ] Phone validation
- [ ] Advanced filtering and export
- [ ] User authentication for dashboard

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test: `npm run test`
3. Format code: `npm run format`
4. Lint: `npm run lint`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature/name`

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0.0
**Node Version**: 24+
