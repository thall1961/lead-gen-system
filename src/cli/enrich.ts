import { leadRepository } from '../database/repositories/LeadRepository';
import { enrichmentAgent } from '../agents/enrichment/EnrichmentAgent';
import { browserService } from '../services/browser/BrowserService';
import { logger } from '../utils/logger';

export async function runEnrichment(limit = 10): Promise<void> {
  try {
    logger.info('Starting enrichment process', { limit });

    await browserService.initialize();

    // Get leads that were analyzed but not enriched
    const leads = await leadRepository.getLeadsNeedingAnalysis(limit);

    if (leads.length === 0) {
      logger.info('No leads to enrich');
      await browserService.close();
      process.exit(0);
    }

    let enriched = 0;

    for (const lead of leads) {
      try {
        const enrichment = await enrichmentAgent.enrichLead(lead);

        if (enrichment && (enrichment.contact_name || enrichment.email)) {
          await leadRepository.update(lead.id, {
            contact_name: enrichment.contact_name || lead.contact_name,
            contact_title: enrichment.contact_title || lead.contact_title,
            email: enrichment.email || lead.email,
          });

          enriched++;
        }
      } catch (error) {
        logger.error('Failed to enrich lead', {
          company: lead.company_name,
          error: String(error),
        });
      }
    }

    logger.info('Enrichment completed', { enriched });

    await browserService.close();
    process.exit(0);
  } catch (error) {
    logger.error('Enrichment failed', { error: String(error) });
    await browserService.close();
    process.exit(1);
  }
}
