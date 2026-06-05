import { leadRepository } from '../database/repositories/LeadRepository';
import { scoringAgent } from '../agents/scoring/ScoringAgent';
import { logger } from '../utils/logger';

export async function runScoring(limit = 10): Promise<void> {
  try {
    logger.info('Starting scoring process', { limit });

    const leads = await leadRepository.getLeadsNeedingScoring(limit);

    if (leads.length === 0) {
      logger.info('No leads needing scoring');
      process.exit(0);
    }

    let scored = 0;

    for (const lead of leads) {
      try {
        const leadResult = await scoringAgent.scoreLead(lead);
        const missedCallResult = await scoringAgent.scoreMissedCalls(lead);

        if (leadResult && missedCallResult) {
          await leadRepository.update(lead.id, {
            lead_score: leadResult.lead_score,
            missed_call_score: missedCallResult.missed_call_score,
            notes: `${lead.notes || ''}\n\nLead Score: ${leadResult.reasoning}\nMissed Call Score: ${missedCallResult.reasoning}`,
          });

          scored++;
        }
      } catch (error) {
        logger.error('Failed to score lead', {
          company: lead.company_name,
          error: String(error),
        });
      }
    }

    logger.info('Scoring completed', { scored });

    process.exit(0);
  } catch (error) {
    logger.error('Scoring failed', { error: String(error) });
    process.exit(1);
  }
}
