import { describe, it, expect } from 'vitest';
import {
  normalizeCompanyName,
  normalizePhone,
  normalizeEmail,
  extractEmails,
  extractPhones,
  normalizeUrl,
  extractDomain,
} from '../text';

describe('Text Utilities', () => {
  describe('normalizeCompanyName', () => {
    it('should lowercase and trim company names', () => {
      expect(normalizeCompanyName('  Acme PLUMBING  ')).toBe('acme plumbing');
    });

    it('should remove special characters', () => {
      expect(normalizeCompanyName("John's Plumbing & Heating")).toBe('johns plumbing  heating');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeCompanyName('Plumbing    Services')).toBe('plumbing services');
    });
  });

  describe('normalizePhone', () => {
    it('should format 10-digit phone numbers', () => {
      expect(normalizePhone('5551234567')).toBe('555-123-4567');
    });

    it('should strip formatting', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('555-123-4567');
    });

    it('should handle various formats', () => {
      expect(normalizePhone('555.123.4567')).toBe('555-123-4567');
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase emails', () => {
      expect(normalizeEmail('INFO@EXAMPLE.COM')).toBe('info@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  info@example.com  ')).toBe('info@example.com');
    });
  });

  describe('extractEmails', () => {
    it('should extract email addresses from text', () => {
      const text = 'Contact us at info@example.com or sales@example.com';
      const emails = extractEmails(text);
      expect(emails).toContain('info@example.com');
      expect(emails).toContain('sales@example.com');
    });

    it('should deduplicate emails', () => {
      const text = 'Email: info@example.com and info@example.com';
      const emails = extractEmails(text);
      expect(emails).toHaveLength(1);
    });
  });

  describe('extractPhones', () => {
    it('should extract phone numbers', () => {
      const text = 'Call (555) 123-4567 or 555-123-4567';
      const phones = extractPhones(text);
      expect(phones.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeUrl', () => {
    it('should add https to URLs without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com/');
    });

    it('should return origin without path', () => {
      expect(normalizeUrl('https://example.com/path/to/page')).toBe('https://example.com/');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://www.example.com/page')).toBe('www.example.com');
    });

    it('should handle URLs without protocol', () => {
      expect(extractDomain('example.com')).toBe('example.com');
    });
  });
});
