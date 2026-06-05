import { leadRepository } from '../database/repositories/LeadRepository';
import { analysisAgent } from '../agents/analysis/AnalysisAgent';
import { browserService } from '../services/browser/BrowserService';
import { logger } from '../utils/logger';

export async function runAnalysis(limit = 10): Promise<void> {
  try {
    logger.info('Starting analysis process', { limit });

    await browserService.initialize();

    const leads = await leadRepository.getLeadsNeedingAnalysis(limit);

    if (leads.length === 0) {
      logger.info('No leads needing analysis');
      await browserService.close();
      process.exit(0);
    }

    let analyzed = 0;

    for (const lead of leads) {
      try {
        if (!lead.website) {
          logger.warn('Skipping lead without website', { company: lead.company_name });
          continue;
        }

        const analysis = await analysisAgent.analyzeWebsite(lead.website, lead.company_name);

        if (analysis) {
          await leadRepository.update(lead.id, {
            email: analysis.emails[0] || lead.email,
            phone: analysis.phones[0] || lead.phone,
            contact_name: analysis.contact_names[0] || lead.contact_name,
            contact_title: analysis.contact_titles[0] || lead.contact_title,
            services: analysis.services,
            offers_emergency_service: analysis.has_emergency_service,
            has_online_booking: analysis.has_online_booking,
            has_live_chat: analysis.has_live_chat,
            estimated_company_size: analysis.estimated_company_size,
            website_score: analysis.website_quality_score,
            notes: analysis.content_summary,
          });

          analyzed++;
        }
      } catch (error) {
        logger.error('Failed to analyze lead', {
          company: lead.company_name,
          error: String(error),
        });
      }
    }

    logger.info('Analysis completed', { analyzed });

    await browserService.close();
    process.exit(0);
  } catch (error) {
    logger.error('Analysis failed', { error: String(error) });
    await browserService.close();
    process.exit(1);
  }
}
