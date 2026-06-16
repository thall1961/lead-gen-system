#!/usr/bin/env node

import { runDiscovery } from './discover';
import { runAnalysis } from './analyze';
import { runScoring } from './score';
import { runEnrichment } from './enrich';
import { runScreenshots } from './screenshots';
import { INDUSTRY_KEYS } from '../config/index';
import { DiscoveryRegion } from '../agents/discovery/DiscoveryAgent';

const command = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

// discover-specific positional args: [limit] [region] [industry,industry,...]
const REGIONS: DiscoveryRegion[] = ['texas', 'national', 'both'];
const regionArg = process.argv[4] as DiscoveryRegion | undefined;
const region = regionArg && REGIONS.includes(regionArg) ? regionArg : undefined;
const industries = process.argv[5]
  ? process.argv[5].split(',').map((s) => s.trim()).filter(Boolean)
  : undefined;

async function main(): Promise<void> {
  switch (command) {
    case 'discover':
      await runDiscovery({ limit, region, industries });
      break;
    case 'analyze':
      await runAnalysis(limit || 10);
      break;
    case 'score':
      await runScoring(limit || 10);
      break;
    case 'enrich':
      await runEnrichment(limit || 10);
      break;
    case 'screenshots':
      await runScreenshots(limit || 10);
      break;
    default:
      console.log('Usage: npm run <command> [limit] [region] [industries]');
      console.log('\nAvailable commands:');
      console.log('  discover    - Find new companies across industry verticals');
      console.log('  analyze     - Analyze websites for leads');
      console.log('  score       - Score leads for custom-software fit');
      console.log('  enrich      - Extract additional contact info');
      console.log('  screenshots - Capture homepage screenshots');
      console.log('\nDiscover options (positional):');
      console.log('  region      - texas | national | both   (default: both, Texas-first)');
      console.log(`  industries  - comma-separated keys: ${INDUSTRY_KEYS.join(', ')}`);
      console.log('                (default: all verticals)');
      console.log('\nExamples:');
      console.log('  npm run discover 50 texas');
      console.log('  npm run discover 100 both retail,business_services');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
