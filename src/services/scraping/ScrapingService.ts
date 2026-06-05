import { Page } from 'playwright';
import { extractEmails, extractPhones } from '../../utils/text';
import { logger } from '../../utils/logger';

export class ScrapingService {
  /**
   * Extract all contact information from page
   */
  async extractContacts(
    page: Page
  ): Promise<{ emails: string[]; phones: string[] }> {
    const pageContent = await page.locator('body').textContent();

    if (!pageContent) {
      return { emails: [], phones: [] };
    }

    // Also check page HTML for hidden contact info
    const pageHtml = await page.content();

    const emails = [...new Set([...extractEmails(pageContent), ...extractEmails(pageHtml)])];
    const phones = [...new Set([...extractPhones(pageContent), ...extractPhones(pageHtml)])];

    return { emails, phones };
  }

  /**
   * Extract text from specific page sections
   */
  async extractSectionContent(page: Page, sectionSelector: string): Promise<string> {
    try {
      const element = await page.$(sectionSelector);
      if (!element) {
        return '';
      }

      const text = await element.textContent();
      return text || '';
    } catch (error) {
      logger.debug('Error extracting section content', { selector: sectionSelector, error: String(error) });
      return '';
    }
  }

  /**
   * Find specific links by text or href
   */
  async findLinksByText(page: Page, textPattern: string | RegExp): Promise<string[]> {
    const links = await page.locator('a').all();
    const found: string[] = [];

    for (const link of links) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (
        text &&
        href &&
        (typeof textPattern === 'string'
          ? text.toLowerCase().includes(textPattern.toLowerCase())
          : textPattern.test(text))
      ) {
        try {
          const absoluteUrl = new URL(href, page.url()).toString();
          found.push(absoluteUrl);
        } catch {
          // Invalid URL
        }
      }
    }

    return [...new Set(found)];
  }

  /**
   * Get all text from page, cleaned
   */
  async getCleanText(page: Page): Promise<string> {
    const text = await page.locator('body').textContent();

    if (!text) {
      return '';
    }

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  /**
   * Extract structured contact names and titles
   */
  async extractTeamInfo(page: Page): Promise<Array<{ name: string; title: string }>> {
    const teamElements = await page.locator('[class*="team"], [class*="member"], [class*="staff"]').all();
    const team: Array<{ name: string; title: string }> = [];

    for (const element of teamElements) {
      const text = await element.textContent();
      if (!text) continue;

      // Simple heuristic: look for patterns like "Name - Title" or "Name / Title"
      const lines = text.split('\n').map((l) => l.trim()).filter(l => l);
      
      if (lines.length >= 2) {
        const name = lines[0];
        const title = lines[1];

        if (name && title && !name.toLowerCase().includes('team')) {
          team.push({ name, title });
        }
      }
    }

    return team;
  }

  /**
   * Check for presence of specific features
   */
  async hasFeature(page: Page, featureName: string): Promise<boolean> {
    const pageContent = await page.content();
    const searchTerms = featureName.toLowerCase().split(' ');

    return searchTerms.some((term) => pageContent.toLowerCase().includes(term));
  }

  /**
   * Extract service names from page
   */
  async extractServices(page: Page, serviceList: string[] = []): Promise<string[]> {
    const pageContent = await page.content().then(html => html.toLowerCase());
    const found: string[] = [];

    for (const service of serviceList) {
      if (pageContent.includes(service.toLowerCase())) {
        found.push(service);
      }
    }

    return found;
  }
}

export const scrapingService = new ScrapingService();
