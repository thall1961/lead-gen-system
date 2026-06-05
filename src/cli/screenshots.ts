import { leadRepository } from '../database/repositories/LeadRepository';

import { screenshotService } from '../services/screenshots/ScreenshotService';
import { browserService } from '../services/browser/BrowserService';
import { logger } from '../utils/logger';

export async function runScreenshots(limit = 10): Promise<void> {
  try {
    logger.info('Starting screenshot capture', { limit });

    await browserService.initialize();
    await screenshotService.initialize();

    // Get leads without screenshots
    const leads = await leadRepository.getAll({ limit });

    if (leads.data.length === 0) {
      logger.info('No leads to screenshot');
      await browserService.close();
      process.exit(0);
    }

    let captured = 0;

    for (const lead of leads.data) {
      if (lead.screenshot_url) {
        logger.debug('Lead already has screenshot', { company: lead.company_name });
        continue;
      }

      if (!lead.website) {
        logger.warn('Skipping lead without website', { company: lead.company_name });
        continue;
      }

      try {
        const page = await browserService.openPage(lead.website);
        const screenshotPath = await screenshotService.captureScreenshot(page, lead.company_name);

        if (screenshotPath) {
          await leadRepository.update(lead.id, {
            screenshot_url: screenshotPath,
          });

          captured++;
        }

        await browserService.closePage(page);
      } catch (error) {
        logger.error('Failed to capture screenshot', {
          company: lead.company_name,
          error: String(error),
        });
      }
    }

    logger.info('Screenshots completed', { captured });

    await browserService.close();
    process.exit(0);
  } catch (error) {
    logger.error('Screenshot capture failed', { error: String(error) });
    await browserService.close();
    process.exit(1);
  }
}
