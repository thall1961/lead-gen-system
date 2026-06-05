import { chromium, Browser, Page } from 'playwright';
import config from '../../config/index';
import { logger } from '../../utils/logger';
import { withTimeout, withRetry } from '../../utils/retry';

export class BrowserService {
  private browser: Browser | null = null;
  private pages: Set<Page> = new Set();

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await chromium.launch({
      headless: config.PLAYWRIGHT_HEADLESS === 'true',
    });

    logger.info('Browser initialized');
  }

  /**
   * Close browser and all pages
   */
  async close(): Promise<void> {
    for (const page of this.pages) {
      await page.close();
    }
    this.pages.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    logger.info('Browser closed');
  }

  /**
   * Create a new page and navigate to URL
   */
  async openPage(url: string): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    const context = await this.browser!.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    this.pages.add(page);

    await withRetry(
      async () => {
        await withTimeout(
          () => page.goto(url, { waitUntil: 'networkidle', timeout: config.REQUEST_TIMEOUT_MS }),
          config.REQUEST_TIMEOUT_MS
        );
      },
      { maxAttempts: 2, initialDelayMs: 500 }
    );

    return page;
  }

  /**
   * Close page
   */
  async closePage(page: Page): Promise<void> {
    this.pages.delete(page);
    await page.close();
  }

  /**
   * Get page content (text and HTML)
   */
  async getPageContent(
    page: Page
  ): Promise<{ text: string; html: string; title: string; url: string }> {
    const text = await page.locator('body').textContent();
    const html = await page.content();
    const title = await page.title();
    const url = page.url();

    return {
      text: text || '',
      html,
      title,
      url,
    };
  }

  /**
   * Capture screenshot
   */
  async screenshot(page: Page): Promise<Buffer> {
    return page.screenshot({ fullPage: false });
  }

  /**
   * Find links on page
   */
  async findLinks(page: Page, text?: string): Promise<string[]> {
    const links = await page.locator('a').all();
    const urls: string[] = [];

    for (const link of links) {
      const href = await link.getAttribute('href');
      const linkText = await link.textContent();

      if (href && (!text || linkText?.toLowerCase().includes(text.toLowerCase()))) {
        try {
          const absoluteUrl = new URL(href, page.url()).toString();
          urls.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    return [...new Set(urls)]; // Deduplicate
  }

  /**
   * Wait for element
   */
  async waitForElement(page: Page, selector: string, timeoutMs = 5000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute JavaScript on page
   */
  async evaluate<T>(page: Page, script: string): Promise<T> {
    return page.evaluate(script);
  }
}

export const browserService = new BrowserService();
