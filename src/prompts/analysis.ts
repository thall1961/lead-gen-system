export const WEBSITE_ANALYSIS_PROMPT = `Analyze the website content and extract the following information in JSON format:

{
  "emails": ["array of email addresses found"],
  "phones": ["array of phone numbers found"],
  "contact_names": ["public contact names only"],
  "contact_titles": ["job titles of identified contacts"],
  "services": ["plumbing services offered"],
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

Be conservative with contact names - only include names clearly listed as team members or owner on the website.`;

export const LEAD_SCORING_PROMPT = `Score this plumbing company as a lead for AI phone answering services.

Return JSON with "score" (1-100) and "reasoning".

Higher scores if:
- Small business (solo to small team)
- Offers 24/7 emergency services
- No live chat or booking system (missed call risk)
- Poor website quality (less professional)
- Owner-operated (decision maker on site)
- Limited office staff (fewer people to answer phones)

Lower scores if:
- Large company with many locations
- Fully staffed office
- Modern website with good tools
- Has live chat or online booking
- Corporate structure`;

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
