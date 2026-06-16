import { anthropicService } from '../../services/llm/AnthropicService';
import { LEAD_SCORING_PROMPT, MISSED_CALL_SCORING_PROMPT } from '../../prompts/analysis';
import { Lead, LeadScoringResult, MissedCallScoringResult } from '../../types/index';
import { logger } from '../../utils/logger';

export class ScoringAgent {
  /**
   * Score a lead for quality
   */
  async scoreLead(lead: Lead): Promise<LeadScoringResult | null> {
    try {
      logger.info('Scoring lead', { company: lead.company_name });

      const leadInfo = {
        company_name: lead.company_name,
        website: lead.website,
        phone: lead.phone,
        email: lead.email,
        state: lead.state,
        city: lead.city,
        website_score: lead.website_score,
        has_online_booking: lead.has_online_booking,
        has_live_chat: lead.has_live_chat,
        offers_emergency_service: lead.offers_emergency_service,
        estimated_company_size: lead.estimated_company_size,
        services: lead.services,
        contacts: lead.contact_name ? 1 : 0,
      };

      const result = await anthropicService.scoreLead(leadInfo, LEAD_SCORING_PROMPT);

      const factors = this.identifyKeyFactors(lead);

      return {
        lead_score: result.score,
        reasoning: result.reasoning,
        key_factors: factors,
      };
    } catch (error) {
      logger.error('Failed to score lead', { company: lead.company_name, error: String(error) });
      return null;
    }
  }

  /**
   * Score likelihood of missed calls
   */
  async scoreMissedCalls(lead: Lead): Promise<MissedCallScoringResult | null> {
    try {
      logger.info('Scoring missed call likelihood', { company: lead.company_name });

      const leadInfo = {
        company_name: lead.company_name,
        phone: lead.phone,
        estimated_company_size: lead.estimated_company_size,
        offers_emergency_service: lead.offers_emergency_service,
        has_online_booking: lead.has_online_booking,
        has_live_chat: lead.has_live_chat,
        services: lead.services,
        office_staff: lead.contact_name ? 'multiple' : 'unknown',
      };

      const result = await anthropicService.scoreLead(leadInfo, MISSED_CALL_SCORING_PROMPT);

      const indicators = this.identifyMissedCallIndicators(lead);

      return {
        missed_call_score: result.score,
        reasoning: result.reasoning,
        indicators,
      };
    } catch (error) {
      logger.error('Failed to score missed calls', { company: lead.company_name, error: String(error) });
      return null;
    }
  }

  /**
   * Identify key factors affecting lead score
   */
  private identifyKeyFactors(lead: Lead): string[] {
    const factors: string[] = [];

    if (
      lead.estimated_company_size === 'solo' ||
      lead.estimated_company_size === 'small' ||
      lead.estimated_company_size === 'medium'
    ) {
      factors.push('Small-to-mid company size (in target band)');
    }

    if (lead.estimated_company_size === 'large') {
      factors.push('Likely enterprise (out of target band)');
    }

    if (!lead.has_online_booking) {
      factors.push('No online booking/scheduling system (likely manual ops)');
    }

    if (lead.website_score && lead.website_score < 60) {
      factors.push('Thin/dated website (likely spreadsheet-driven ops)');
    }

    if (lead.contact_name) {
      factors.push('Decision-maker contact identified');
    }

    if (lead.industry) {
      factors.push(`Industry: ${lead.industry}`);
    }

    return factors.slice(0, 5);
  }

  /**
   * Identify indicators of missed calls
   */
  private identifyMissedCallIndicators(lead: Lead): string[] {
    const indicators: string[] = [];

    if (lead.offers_emergency_service) {
      indicators.push('24/7 emergency service (high volume)');
    }

    if (!lead.has_online_booking) {
      indicators.push('No scheduling system (more inbound calls)');
    }

    if (!lead.has_live_chat) {
      indicators.push('No automated chat responder');
    }

    if (lead.estimated_company_size === 'solo' || lead.estimated_company_size === 'small') {
      indicators.push('Small team (fewer staff)');
    }

    if (lead.services && lead.services.includes('Emergency Service')) {
      indicators.push('Advertises emergency response');
    }

    return indicators.slice(0, 5);
  }
}

export const scoringAgent = new ScoringAgent();
