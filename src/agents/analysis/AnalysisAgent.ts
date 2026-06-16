import { Page } from 'playwright';
import { browserService } from '../../services/browser/BrowserService';
import { scrapingService } from '../../services/scraping/ScrapingService';
import { screenshotService } from '../../services/screenshots/ScreenshotService';
import { anthropicService } from '../../services/llm/AnthropicService';
import { WEBSITE_ANALYSIS_PROMPT } from '../../prompts/analysis';
import { WebsiteAnalysis, PageContent } from '../../types/index';
import { logger } from '../../utils/logger';
import { LIVE_CHAT_PROVIDERS, BOOKING_INDICATORS, EMERGENCY_SERVICE_INDICATORS } from '../../config/index';

export class AnalysisAgent {
  /**
   * Analyze a lead's website
   */
  async analyzeWebsite(website: string, companyName: string): Promise<WebsiteAnalysis | null> {
    let page: Page | null = null;

    try {
      logger.info('Analyzing website', { company: companyName, website });

      page = await browserService.openPage(website);

      // Get homepage content
      const homepage = await browserService.getPageContent(page);

      // Extract contacts from homepage
      const homepageContacts = await scrapingService.extractContacts(page);

      // Try to find and visit contact page
      const contactPageUrls = await this.findRelevantPages(page, ['contact', 'get in touch', 'reach us']);

      let contactPageContent: PageContent | null = null;
      let contactPageContacts = { emails: [] as string[], phones: [] as string[] };

      for (const contactUrl of contactPageUrls) {
        try {
          const contactPage = await browserService.openPage(contactUrl);
          contactPageContent = await browserService.getPageContent(contactPage);
          contactPageContacts = await scrapingService.extractContacts(contactPage);
          await browserService.closePage(contactPage);
          break;
        } catch {
          // Try next contact page
        }
      }

      // Try to find team/about page
      const aboutPageUrls = await this.findRelevantPages(page, ['about', 'team', 'our team', 'staff']);

      let teamInfo = [] as Array<{ name: string; title: string }>;

      for (const aboutUrl of aboutPageUrls) {
        try {
          const aboutPage = await browserService.openPage(aboutUrl);
          teamInfo = await scrapingService.extractTeamInfo(aboutPage);
          await browserService.closePage(aboutPage);
          if (teamInfo.length > 0) break;
        } catch {
          // Try next about page
        }
      }

      // Capture screenshot
      const screenshotPath = await screenshotService.captureScreenshot(page, companyName);

      // Combine all content
      const fullContent = `
Homepage:
${homepage.text}

Contact Page:
${contactPageContent?.text || 'Not found'}

About Page:
${teamInfo.map((t) => `${t.name} - ${t.title}`).join('\n')}

All Emails Found: ${[...homepageContacts.emails, ...contactPageContacts.emails].join(', ')}
All Phones Found: ${[...homepageContacts.phones, ...contactPageContacts.phones].join(', ')}
`;

      // Use LLM to analyze
      const analysis = await anthropicService.analyzeWebsite(fullContent, WEBSITE_ANALYSIS_PROMPT);

      // Extract values from analysis
      const emails = this.extractArrayField(analysis, 'emails', []);
      const phones = this.extractArrayField(analysis, 'phones', []);
      const contactNames = this.extractArrayField(analysis, 'contact_names', []);
      const contactTitles = this.extractArrayField(analysis, 'contact_titles', []);
      const services = this.extractArrayField(analysis, 'services', []);

      // Check for live chat and booking
      const hasLiveChat = this.detectLiveChat(homepage.html);
      const hasOnlineBooking = this.detectOnlineBooking(homepage.text);
      const hasEmergencyService = this.detectEmergencyService(homepage.text);

      // Estimate company size from team info
      const estimatedSize = this.estimateCompanySize(teamInfo.length, phones.length, services.length);

      // Calculate website quality score
      const websiteScore = this.calculateWebsiteQuality(
        homepage.html,
        emails.length > 0,
        hasOnlineBooking,
        hasLiveChat
      );

      return {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        contact_names: [...new Set(contactNames)],
        contact_titles: [...new Set(contactTitles)],
        services: [...new Set(services)],
        has_emergency_service: hasEmergencyService,
        has_online_booking: hasOnlineBooking,
        has_live_chat: hasLiveChat,
        estimated_company_size: estimatedSize,
        website_quality_score: websiteScore,
        content_summary: this.summarizeContent(homepage.text, services, emails.length),
      };
    } catch (error) {
      logger.error('Failed to analyze website', { company: companyName, website, error: String(error) });
      return null;
    } finally {
      if (page) {
        await browserService.closePage(page);
      }
    }
  }

  /**
   * Find relevant pages (contact, about, team)
   */
  private async findRelevantPages(page: Page, keywords: string[]): Promise<string[]> {
    const foundUrls: string[] = [];

    for (const keyword of keywords) {
      const urls = await scrapingService.findLinksByText(page, keyword);
      foundUrls.push(...urls);
    }

    return [...new Set(foundUrls)].slice(0, 5);
  }

  /**
   * Detect live chat from page HTML
   */
  private detectLiveChat(html: string): boolean {
    const lowerHtml = html.toLowerCase();
    return LIVE_CHAT_PROVIDERS.some((provider: string) => lowerHtml.includes(provider));
  }

  /**
   * Detect online booking
   */
  private detectOnlineBooking(text: string): boolean {
    const lowerText = text.toLowerCase();
    return BOOKING_INDICATORS.some((indicator: string) => lowerText.includes(indicator));
  }

  /**
   * Detect emergency service
   */
  private detectEmergencyService(text: string): boolean {
    const lowerText = text.toLowerCase();
    return EMERGENCY_SERVICE_INDICATORS.some((indicator: string) => lowerText.includes(indicator));
  }

  /**
   * Estimate company size from team data
   */
  private estimateCompanySize(teamCount: number, phoneCount: number, serviceCount: number): 'solo' | 'small' | 'medium' | 'large' {
    if (teamCount === 0 && phoneCount <= 1) return 'solo';
    if (teamCount <= 5 && phoneCount <= 2) return 'small';
    if (teamCount <= 20 && phoneCount <= 5) return 'medium';
    return 'large';
  }

  /**
   * Calculate website quality score
   */
  private calculateWebsiteQuality(
    html: string,
    hasContact: boolean,
    hasBooking: boolean,
    hasChat: boolean
  ): number {
    let score = 50;

    // Check for mobile responsiveness
    if (html.includes('viewport') || html.includes('responsive')) {
      score += 10;
    }

    // Check for modern frameworks (indication of modern design)
    if (html.includes('react') || html.includes('vue') || html.includes('angular')) {
      score += 10;
    }

    // Check for contact info
    if (hasContact) {
      score += 15;
    }

    // Check for booking
    if (hasBooking) {
      score += 10;
    }

    // Check for chat
    if (hasChat) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Summarize website content
   */
  private summarizeContent(text: string, services: string[], emailCount: number): string {
    const serviceStr = services.slice(0, 3).join(', ');
    const hasContact = emailCount > 0 ? 'has contact info' : 'missing contact info';

    return `Company offering ${serviceStr || 'various products/services'}, ${hasContact}`;
  }

  /**
   * Extract array field from object
   */
  private extractArrayField<T>(obj: Record<string, unknown>, field: string, defaultValue: T[]): T[] {
    const value = obj[field];
    if (Array.isArray(value)) {
      return value as T[];
    }
    return defaultValue;
  }
}

export const analysisAgent = new AnalysisAgent();
