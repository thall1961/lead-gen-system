import { Page } from 'playwright';
import { browserService } from '../../services/browser/BrowserService';
import { scrapingService } from '../../services/scraping/ScrapingService';
import { anthropicService } from '../../services/llm/AnthropicService';
import { CONTACT_ENRICHMENT_PROMPT } from '../../prompts/analysis';
import { ContactEnrichment, Lead } from '../../types/index';
import { logger } from '../../utils/logger';

export class EnrichmentAgent {
  /**
   * Enrich lead with additional contact information
   */
  async enrichLead(lead: Lead): Promise<ContactEnrichment | null> {
    if (!lead.website) {
      logger.warn('Cannot enrich lead without website', { company: lead.company_name });
      return null;
    }

    let page: Page | null = null;

    try {
      logger.info('Enriching lead', { company: lead.company_name, website: lead.website });

      page = await browserService.openPage(lead.website);

      // Find about/team pages
      const aboutUrls = await scrapingService.findLinksByText(page, /about|team|staff|people/i);

      let enrichment: ContactEnrichment = {};

      // Check each about page
      for (const aboutUrl of aboutUrls.slice(0, 3)) {
        try {
          const aboutPage = await browserService.openPage(aboutUrl);
          const content = await browserService.getPageContent(aboutPage);

          // Extract team info
          const teamInfo = await scrapingService.extractTeamInfo(aboutPage);

          if (teamInfo.length > 0) {
            // Use LLM to identify best contact
            const result = await anthropicService.extractJson<ContactEnrichment>(
              content.text,
              CONTACT_ENRICHMENT_PROMPT
            );

            if (result) {
              enrichment = result;
            }

            // Fallback to first team member
            if (!enrichment.contact_name && teamInfo.length > 0) {
              enrichment.contact_name = teamInfo[0].name;
              enrichment.contact_title = teamInfo[0].title;
            }
          }

          await browserService.closePage(aboutPage);

          if (enrichment.contact_name) {
            break;
          }
        } catch (error) {
          logger.debug('Error enriching from about page', { error: String(error) });
          // Skip closing on error
        }
      }

      return enrichment;
    } catch (error) {
      logger.error('Failed to enrich lead', { company: lead.company_name, error: String(error) });
      return null;
    } finally {
      if (page) {
        await browserService.closePage(page);
      }
    }
  }
}

export const enrichmentAgent = new EnrichmentAgent();
