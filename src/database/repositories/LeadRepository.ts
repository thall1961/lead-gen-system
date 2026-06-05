// @ts-nocheck
import supabase from '../supabase';
import { Lead } from '../../types/index';
import { logger } from '../../utils/logger';
import { normalizeCompanyName, normalizePhone, normalizeUrl } from '../../utils/text';

export class LeadRepository {
  /**
   * Find lead by company name, website, or phone
   */
  async findDuplicate(
    companyName?: string,
    website?: string,
    phone?: string
  ): Promise<Lead | null> {
    try {
      let query = supabase.from('leads').select('*');

      if (website) {
        const normalized = normalizeUrl(website);
        query = query.eq('website', normalized);
      } else if (phone) {
        const normalized = normalizePhone(phone);
        query = query.eq('phone', normalized);
      } else if (companyName) {
        const normalized = normalizeCompanyName(companyName);
        query = query.ilike('company_name', `%${normalized}%`);
      }

      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error('Error finding duplicate lead', {
        companyName,
        website,
        phone,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Create a new lead
   */
  async create(lead: Partial<Lead>): Promise<Lead> {
    const leadData = {
      ...lead,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return data as Lead;
  }

  /**
   * Update an existing lead
   */
  async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    return data as Lead;
  }

  /**
   * Get lead by ID
   */
  async getById(id: string): Promise<Lead | null> {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  }

  /**
   * Get all leads with filtering
   */
  async getAll(filters?: {
    state?: string;
    leadScoreMin?: number;
    leadScoreMax?: number;
    websiteScoreMin?: number;
    websiteScoreMax?: number;
    skip?: number;
    limit?: number;
  }): Promise<{ data: Lead[]; count: number }> {
    const query = supabase.from('leads').select('*', { count: 'exact' }) as any;

    let q: any = query;
    
    if (filters?.state) {
      q = q.eq('state', filters.state);
    }
    if (filters?.leadScoreMin !== undefined) {
      q = q.gte('lead_score', filters.leadScoreMin);
    }
    if (filters?.leadScoreMax !== undefined) {
      q = q.lte('lead_score', filters.leadScoreMax);
    }
    if (filters?.websiteScoreMin !== undefined) {
      q = q.gte('website_score', filters.websiteScoreMin);
    }
    if (filters?.websiteScoreMax !== undefined) {
      q = q.lte('website_score', filters.websiteScoreMax);
    }

    const offset = filters?.skip || 0;
    const limit = filters?.limit || 50;

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q as { data: Lead[] | null; error: any; count: number | null };

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    return { data: (data || []) as Lead[], count: count || 0 };
  }

  /**
   * Get leads needing analysis
   */
  async getLeadsNeedingAnalysis(limit = 10): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .is('website_score', null)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch leads needing analysis: ${error.message}`);
    }

    return (data || []) as Lead[];
  }

  /**
   * Get leads needing scoring
   */
  async getLeadsNeedingScoring(limit = 10): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .is('lead_score', null)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch leads needing scoring: ${error.message}`);
    }

    return (data || []) as Lead[];
  }

  /**
   * Search leads by company name, website, or phone
   */
  async search(query: string, limit = 10): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(
        `company_name.ilike.%${query}%,website.ilike.%${query}%,phone.ilike.%${query}%`
      )
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search leads: ${error.message}`);
    }

    return (data || []) as Lead[];
  }

  /**
   * Delete lead
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete lead: ${error.message}`);
    }
  }
}

export const leadRepository = new LeadRepository();
