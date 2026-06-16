import {
  TARGET_STATES,
  MAJOR_CITIES_BY_STATE,
  INDUSTRY_VERTICALS,
  INDUSTRY_KEYS,
  TEXAS_FOCUS_CITIES,
  IndustryVertical,
} from '../../config/index';
import { DiscoveryResult } from '../../types/index';
import { logger } from '../../utils/logger';
import { normalizeCompanyName, normalizePhone, normalizeUrl } from '../../utils/text';
import { leadRepository } from '../../database/repositories/LeadRepository';
import { googlePlacesService } from '../../services/places/GooglePlacesService';

interface DiscoveryQuery {
  query: string;
  city: string;
  state: string;
  industry: string;
}

export type DiscoveryRegion = 'texas' | 'national' | 'both';

export interface DiscoverOptions {
  limit?: number;
  /** Industry vertical keys to search (see INDUSTRY_VERTICALS). Defaults to all. */
  industries?: string[];
  /** Geographic focus. 'both' (default) lists Texas-focus cities first, then national. */
  region?: DiscoveryRegion;
}

export class DiscoveryAgent {
  /**
   * Resolve the requested vertical keys to vertical definitions, ignoring
   * unknown keys. An empty/undefined list means "all verticals".
   */
  private resolveVerticals(industries?: string[]): IndustryVertical[] {
    if (!industries || industries.length === 0) {
      return INDUSTRY_VERTICALS;
    }
    const requested = new Set(industries);
    const matched = INDUSTRY_VERTICALS.filter((v) => requested.has(v.key));
    if (matched.length === 0) {
      logger.warn('No known industry verticals matched; falling back to all', {
        requested: industries,
        known: INDUSTRY_KEYS,
      });
      return INDUSTRY_VERTICALS;
    }
    return matched;
  }

  /**
   * Build the ordered list of (city, state) targets for a region. Texas-focus
   * cities come first so that, when the query set is sampled/limited, the
   * high-priority Burleson/Fort Worth corridor is covered before national fill.
   */
  private resolveTargets(region: DiscoveryRegion): Array<{ city: string; state: string }> {
    const texas = TEXAS_FOCUS_CITIES.map((city) => ({ city, state: 'TX' }));
    const national: Array<{ city: string; state: string }> = [];
    for (const state of TARGET_STATES) {
      for (const city of MAJOR_CITIES_BY_STATE[state] || []) {
        national.push({ city, state });
      }
    }

    switch (region) {
      case 'texas':
        return texas;
      case 'national':
        return national;
      case 'both':
      default:
        return [...texas, ...national];
    }
  }

  /**
   * Generate search queries across the selected verticals and targets,
   * retaining the originating city/state/industry so results can be
   * disambiguated, back-filled, and tagged.
   */
  private generateSearchQueries(
    verticals: IndustryVertical[],
    targets: Array<{ city: string; state: string }>
  ): DiscoveryQuery[] {
    const queries: DiscoveryQuery[] = [];

    // Iterate targets in the outer loop so each city is covered across every
    // vertical before moving on — keeps priority cities front-loaded.
    for (const { city, state } of targets) {
      for (const vertical of verticals) {
        for (const template of vertical.queryTemplates) {
          // Append the state so ambiguous city names resolve correctly.
          queries.push({
            query: `${template.replace('{city}', city)}, ${state}`,
            city,
            state,
            industry: vertical.key,
          });
        }
      }
    }

    return queries;
  }

  /**
   * Discover companies via the Google Places API (New) Text Search across the
   * configured industry verticals and geographic focus.
   */
  async discoverCompanies(options?: DiscoverOptions): Promise<DiscoveryResult[]> {
    const limit = options?.limit || 20;
    const region = options?.region || 'both';

    if (!googlePlacesService.isConfigured()) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not set — discovery cannot run. Add it to your .env (see .env.example).'
      );
    }

    const verticals = this.resolveVerticals(options?.industries);
    const targets = this.resolveTargets(region);
    const allResults: DiscoveryResult[] = [];
    const queries = this.generateSearchQueries(verticals, targets);

    logger.info('Starting discovery', {
      queryCount: queries.length,
      limit,
      region,
      industries: verticals.map((v) => v.key),
    });

    for (const { query, city, state, industry } of queries) {
      if (allResults.length >= limit) break;

      try {
        const found = await googlePlacesService.searchText(query, {
          maxResults: Math.min(20, limit - allResults.length),
          fallbackCity: city,
          fallbackState: state,
        });
        // Tag every result with the vertical it was discovered under.
        for (const result of found) {
          allResults.push({ ...result, industry });
        }
      } catch (error) {
        logger.error('Error during discovery for query', { query, error: String(error) });
      }
    }

    // Deduplicate
    const uniqueResults = this.deduplicateResults(allResults);

    logger.info('Discovery completed', {
      totalFound: allResults.length,
      unique: uniqueResults.length,
    });

    return uniqueResults.slice(0, limit);
  }

  /**
   * Deduplicate results
   */
  private deduplicateResults(results: DiscoveryResult[]): DiscoveryResult[] {
    const seen = new Map<string, DiscoveryResult>();

    for (const result of results) {
      const website = result.website ? normalizeUrl(result.website) : null;
      const phone = result.phone ? normalizePhone(result.phone) : null;
      const name = normalizeCompanyName(result.company_name);

      // Check for duplicate by website
      if (website) {
        if (seen.has(`website:${website}`)) {
          continue;
        }
        seen.set(`website:${website}`, result);
      }

      // Check for duplicate by phone
      if (phone) {
        if (seen.has(`phone:${phone}`)) {
          continue;
        }
        seen.set(`phone:${phone}`, result);
      }

      // Check for similar company name
      if (!seen.has(`name:${name}`)) {
        seen.set(`name:${name}`, result);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Process and save discovered companies
   */
  async saveDiscoveredCompanies(results: DiscoveryResult[]): Promise<number> {
    let saved = 0;

    for (const result of results) {
      try {
        // Check for existing lead
        const existing = await leadRepository.findDuplicate(
          result.company_name,
          result.website,
          result.phone
        );

        if (existing) {
          logger.debug('Duplicate company found, skipping', { company: result.company_name });
          continue;
        }

        // Create new lead
        await leadRepository.create({
          company_name: result.company_name,
          industry: result.industry,
          website: result.website,
          phone: result.phone,
          street: result.street,
          city: result.city,
          state: result.state,
          zip: result.zip,
          google_rating: result.google_rating,
          google_reviews: result.google_reviews,
          source: result.source,
        });

        saved++;
      } catch (error) {
        logger.error('Failed to save discovered company', {
          company: result.company_name,
          error: String(error),
        });
      }
    }

    logger.info('Saved discovered companies', { count: saved });
    return saved;
  }
}

export const discoveryAgent = new DiscoveryAgent();
