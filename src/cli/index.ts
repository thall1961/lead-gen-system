#!/usr/bin/env node

import { runDiscovery } from './discover';
import { runAnalysis } from './analyze';
import { runScoring } from './score';
import { runEnrichment } from './enrich';
import { runScreenshots } from './screenshots';

const command = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

async function main(): Promise<void> {
  switch (command) {
    case 'discover':
      await runDiscovery();
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
      console.log('Usage: npm run <command> [limit]');
      console.log('\nAvailable commands:');
      console.log('  discover    - Find new plumbing companies');
      console.log('  analyze     - Analyze websites for leads');
      console.log('  score       - Score leads for quality');
      console.log('  enrich      - Extract additional contact info');
      console.log('  screenshots - Capture homepage screenshots');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
