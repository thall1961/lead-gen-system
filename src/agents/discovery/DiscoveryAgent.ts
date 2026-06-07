import { TARGET_STATES, MAJOR_CITIES_BY_STATE, SEARCH_QUERY_TEMPLATES } from '../../config/index';
import { DiscoveryResult } from '../../types/index';
import { logger } from '../../utils/logger';
import { normalizeCompanyName, normalizePhone, normalizeUrl } from '../../utils/text';
import { leadRepository } from '../../database/repositories/LeadRepository';
import { googlePlacesService } from '../../services/places/GooglePlacesService';

interface DiscoveryQuery {
  query: string;
  city: string;
  state: string;
}

export class DiscoveryAgent {
  /**
   * Generate search queries for discovery, retaining the originating city/state
   * so results can be disambiguated and back-filled when the API omits them.
   */
  private generateSearchQueries(): DiscoveryQuery[] {
    const queries: DiscoveryQuery[] = [];

    for (const state of TARGET_STATES) {
      const cities = MAJOR_CITIES_BY_STATE[state] || [];

      for (const city of cities) {
        for (const template of SEARCH_QUERY_TEMPLATES) {
          // Append the state so ambiguous city names (e.g. "Kansas City") resolve correctly.
          queries.push({ query: `${template.replace('{city}', city)}, ${state}`, city, state });
        }
      }
    }

    return queries;
  }

  /**
   * Discover plumbing companies via the Google Places API (New) Text Search.
   */
  async discoverCompanies(options?: { limit?: number }): Promise<DiscoveryResult[]> {
    const limit = options?.limit || 20;

    if (!googlePlacesService.isConfigured()) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not set — discovery cannot run. Add it to your .env (see .env.example).'
      );
    }

    const allResults: DiscoveryResult[] = [];
    const queries = this.generateSearchQueries();

    logger.info('Starting discovery', { queryCount: queries.length, limit });

    // Sample a subset of queries to avoid excessive API calls; stop once we hit the limit.
    const sampled = queries.slice(0, Math.ceil(queries.length / 5));

    for (const { query, city, state } of sampled) {
      if (allResults.length >= limit) break;

      try {
        const found = await googlePlacesService.searchText(query, {
          maxResults: Math.min(20, limit - allResults.length),
          fallbackCity: city,
          fallbackState: state,
        });
        allResults.push(...found);
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
