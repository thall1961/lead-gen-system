import Anthropic from '@anthropic-ai/sdk';
import config, { TARGET_STATES, MAJOR_CITIES_BY_STATE, SEARCH_QUERY_TEMPLATES } from '../../config/index';
import { DiscoveryResult } from '../../types/index';
import { logger } from '../../utils/logger';
import { normalizeCompanyName, normalizePhone, normalizeUrl } from '../../utils/text';
import { leadRepository } from '../../database/repositories/LeadRepository';

export class DiscoveryAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate search queries for discovery
   */
  private generateSearchQueries(): string[] {
    const queries: string[] = [];

    for (const state of TARGET_STATES) {
      const cities = MAJOR_CITIES_BY_STATE[state] || [];

      for (const city of cities) {
        for (const template of SEARCH_QUERY_TEMPLATES) {
          queries.push(template.replace('{city}', city));
        }
      }
    }

    return queries;
  }

  /**
   * Parse LLM response to extract company data
   */
  private parseDiscoveryResults(response: string): DiscoveryResult[] {
    const results: DiscoveryResult[] = [];

    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const items = Array.isArray(parsed) ? parsed : parsed.results || [parsed];

        for (const item of items) {
          if (item.company_name && (item.website || item.phone || item.city)) {
            results.push({
              company_name: item.company_name.trim(),
              website: item.website ? normalizeUrl(item.website) : undefined,
              phone: item.phone ? normalizePhone(item.phone) : undefined,
              city: item.city || '',
              state: item.state || '',
              source: 'search',
            });
          }
        }
      }
    } catch (error) {
      logger.debug('Failed to parse discovery results', { error: String(error) });
    }

    return results;
  }

  /**
   * Discover plumbing companies using Google search simulation
   */
  async discoverCompanies(options?: { limit?: number; dryRun?: boolean }): Promise<DiscoveryResult[]> {
    const limit = options?.limit || 20;
    const allResults: DiscoveryResult[] = [];
    const queries = this.generateSearchQueries();

    logger.info('Starting discovery', { queryCount: queries.length, limit });

    // Sample a subset of queries to avoid excessive API calls
    const sampled = queries.slice(0, Math.ceil(queries.length / 5));

    for (const query of sampled) {
      if (allResults.length >= limit) break;

      try {
        const response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Find plumbing companies for search query: "${query}". Return results as JSON array with fields: company_name, website, phone, city, state. Return realistic plumbing company names from the ${
                query.split(' ').pop()
              } area. Include 3-5 companies.`,
            },
          ],
        });

        const textContent = response.content.find((block) => block.type === 'text');
        if (textContent && textContent.type === 'text') {
          const parsed = this.parseDiscoveryResults(textContent.text);
          allResults.push(...parsed);
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
          website: result.website,
          phone: result.phone,
          city: result.city,
          state: result.state,
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
