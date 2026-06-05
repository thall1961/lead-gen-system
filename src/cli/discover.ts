import { discoveryAgent } from '../agents/discovery/DiscoveryAgent';
import { logger } from '../utils/logger';

export async function runDiscovery(): Promise<void> {
  try {
    logger.info('Starting discovery process');

    const results = await discoveryAgent.discoverCompanies({ limit: 50 });

    if (results.length === 0) {
      logger.info('No companies discovered');
      process.exit(0);
    }

    const saved = await discoveryAgent.saveDiscoveredCompanies(results);

    logger.info('Discovery completed', {
      discovered: results.length,
      saved,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Discovery failed', { error: String(error) });
    process.exit(1);
  }
}
