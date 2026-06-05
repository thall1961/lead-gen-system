// @ts-nocheck
import express from 'express';
import cors from 'cors';
import path from 'path';
import { leadRepository } from './database/repositories/LeadRepository';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

/**
 * Get all leads with filtering
 */
app.get('/api/leads', async (req: express.Request, res: express.Response) => {
  try {
    const getStringQuery = (key: string): string | undefined => {
      const val = req.query[key] as any;
      if (Array.isArray(val)) return val[0];
      if (typeof val === 'string') return val;
      return undefined;
    };
    const getNumberQuery = (key: string, defaultVal: number): number => {
      const str = getStringQuery(key);
      return str ? parseInt(str, 10) || defaultVal : defaultVal;
    };
    const filters = {
      state: getStringQuery('state'),
      leadScoreMin: getNumberQuery('leadScoreMin', 0) || undefined,
      leadScoreMax: getNumberQuery('leadScoreMax', 100) || undefined,
      websiteScoreMin: getNumberQuery('websiteScoreMin', 0) || undefined,
      websiteScoreMax: getNumberQuery('websiteScoreMax', 100) || undefined,
      skip: getNumberQuery('skip', 0),
      limit: getNumberQuery('limit', 50),
    };

    const result = await leadRepository.getAll(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching leads', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/**
 * Get lead by ID
 */
app.get('/api/leads/:id', async (req: express.Request, res: express.Response) => {
  try {
    const lead = await leadRepository.getById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    logger.error('Error fetching lead', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

/**
 * Search leads
 */
app.get('/api/leads/search', async (req: express.Request, res: express.Response) => {
  try {
    const queryParam = req.query.q as any;
    let query: string | undefined;
    if (Array.isArray(queryParam)) {
      query = queryParam[0];
    } else if (typeof queryParam === 'string') {
      query = queryParam;
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const results = await leadRepository.search(query, 20);
    res.json(results);
  } catch (error) {
    logger.error('Error searching leads', { error: String(error) });
    res.status(500).json({ error: 'Failed to search leads' });
  }
});

/**
 * Get statistics
 */
app.get('/api/stats', async (req: express.Request, res: express.Response) => {
  try {
    const all = await leadRepository.getAll({ limit: 10000 });
    const leads = all.data;

    const stats = {
      total: all.count,
      byState: {} as Record<string, number>,
      averageLeadScore: 0,
      averageWebsiteScore: 0,
      highQualityLeads: 0,
      withLeadScore: 0,
      withWebsiteScore: 0,
      withEmail: 0,
      withPhone: 0,
    };

    let totalLeadScore = 0;
    let totalWebsiteScore = 0;

    for (const lead of leads) {
      // Count by state
      if (lead.state) {
        stats.byState[lead.state] = (stats.byState[lead.state] || 0) + 1;
      }

      // Scoring stats
      if (lead.lead_score) {
        totalLeadScore += lead.lead_score;
        stats.withLeadScore++;
        if (lead.lead_score >= 70) {
          stats.highQualityLeads++;
        }
      }

      if (lead.website_score) {
        totalWebsiteScore += lead.website_score;
        stats.withWebsiteScore++;
      }

      if (lead.email) {
        stats.withEmail++;
      }

      if (lead.phone) {
        stats.withPhone++;
      }
    }

    stats.averageLeadScore =
      stats.withLeadScore > 0 ? Math.round(totalLeadScore / stats.withLeadScore) : 0;
    stats.averageWebsiteScore =
      stats.withWebsiteScore > 0 ? Math.round(totalWebsiteScore / stats.withWebsiteScore) : 0;

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Health check
 */
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

/**
 * Serve dashboard
 */
app.get('/', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: String(err) });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});
