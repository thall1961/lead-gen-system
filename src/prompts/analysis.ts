export const WEBSITE_ANALYSIS_PROMPT = `Analyze the website content and extract the following information in JSON format:

{
  "emails": ["array of email addresses found"],
  "phones": ["array of phone numbers found"],
  "contact_names": ["public contact names only"],
  "contact_titles": ["job titles of identified contacts"],
  "services": ["products or services offered"],
  "has_emergency_service": boolean,
  "has_online_booking": boolean,
  "has_live_chat": boolean,
  "estimated_company_size": "solo|small|medium|large",
  "website_quality_score": number between 1-100,
  "content_summary": "brief summary of company"
}

Look for:
- Emergency indicators: 24/7, emergency, after hours, same day service
- Booking tools: Calendly, Acuity, scheduling widgets, "book now" buttons
- Live chat: Intercom, Drift, Tawk, LiveChat, HubSpot chat
- Company size from: team page, number of trucks, multiple locations, staff count
- Website quality: responsive design, modern appearance, clear CTAs, professional branding, load speed

Be conservative with contact names - only include names clearly listed as team members or owner on the website.

When estimating company size, prefer the small-to-mid range (roughly 0-250 employees);
solo/small/medium map to that band, "large" indicates likely enterprise (out of target).`;

export const LEAD_SCORING_PROMPT = `Score this company as a lead for CUSTOM SOFTWARE solutions that replace
spreadsheets and generic off-the-shelf SaaS tools.

Return JSON with "score" (1-100) and "reasoning".

We are looking for small-to-mid-sized businesses (roughly 0-250 employees) whose
operations are likely run on spreadsheets, paper, or ill-fitting generic tools —
companies that would benefit from a tailored internal system, and where an Owner,
Operations Manager/Director, IT Manager/Director, or Business Manager can decide.

Higher scores if:
- Small-to-mid business (solo to ~250 employees) — enough complexity to need software, small enough to lack it
- Operations look manual or process-heavy (scheduling, inventory, bookings, dispatch, memberships, client/job tracking)
- Signs of spreadsheet/email/paper workflows or a thin, dated, brochure-only website
- No evidence of a modern integrated platform; uses a patchwork of disconnected generic tools
- Owner-operated or a clear operations/IT decision-maker is identifiable
- Industry where bespoke workflow software gives real leverage (travel/recreation, retail, consumer services, business services)

Lower scores if:
- Large enterprise with established IT systems and procurement
- Already runs a modern, integrated, industry-specific platform
- A pure storefront/franchise with no operational complexity to systematize
- No identifiable decision-maker and no operational footprint to improve`;

export const MISSED_CALL_SCORING_PROMPT = `Score the likelihood (1-100) that this plumbing company misses inbound calls.

Return JSON with "score" and "reasoning".

Strong indicators of missed calls:
- 24/7 emergency service (high volume, dispatched calls)
- No online booking system (more inbound calls)
- No live chat or automated system
- Small company size (fewer office staff)
- Solo owner-operator (always in field)
- No evidence of dedicated receptionist
- Multiple service trucks (techs always on job)

Weak indicators:
- Modern scheduling system
- Live chat available
- Large office staff
- Corporate structure
- Scheduled appointments only`;

export const CONTACT_ENRICHMENT_PROMPT = `Extract publicly available contact information from the website content.

Return JSON with:
{
  "contact_name": "name if visible",
  "contact_title": "job title if visible",
  "email": "public email address if available"
}

Only include information that is:
- Publicly visible on the website
- In public team pages, about pages, contact pages
- NOT behind login or paywalls
- Not inferred (only explicit names/titles)`;
