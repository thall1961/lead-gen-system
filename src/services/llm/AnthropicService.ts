import Anthropic from '@anthropic-ai/sdk';
import config from '../../config/index';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';

export class AnthropicService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Send message and get response
   */
  async sendMessage(
    messages: Anthropic.Messages.MessageParam[],
    options?: {
      maxTokens?: number;
      model?: string;
      temperature?: number;
      system?: string;
    }
  ): Promise<string> {
    const response = await withRetry(
      async () => {
        return this.client.messages.create({
          model: options?.model || 'claude-sonnet-4-6',
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
          system: options?.system,
          messages,
        });
      },
      { maxAttempts: 3, initialDelayMs: 1000 }
    );

    const textContent = response.content.find((block: Anthropic.Messages.ContentBlock) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  }

  /**
   * Analyze website content and extract structured data
   */
  async analyzeWebsite(
    pageContent: string,
    prompt: string
  ): Promise<Record<string, unknown>> {
    const response = await this.sendMessage(
      [
        {
          role: 'user',
          content: `${prompt}\n\nContent to analyze:\n${pageContent}`,
        },
      ],
      {
        maxTokens: 1024,
        temperature: 0.2,
        system: 'You are a helpful assistant that extracts structured data from web content.',
      }
    );

    // Try to parse as JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      logger.warn('Failed to parse JSON response', { response });
    }

    return { raw: response };
  }

  /**
   * Score a lead
   */
  async scoreLead(leadInfo: Record<string, unknown>, prompt: string): Promise<{ score: number; reasoning: string }> {
    const response = await this.sendMessage(
      [
        {
          role: 'user',
          content: `${prompt}\n\nLead information:\n${JSON.stringify(leadInfo, null, 2)}`,
        },
      ],
      {
        maxTokens: 512,
        temperature: 0.2,
        system:
          'You are an expert at evaluating business leads. Return your response in JSON format with "score" (1-100) and "reasoning" fields.',
      }
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: Record<string, unknown> = JSON.parse(jsonMatch[0]);
        const scoreVal = typeof parsed.score === 'number' ? parsed.score : parseInt(String(parsed.score), 10) || 50;
        const reasoningVal = typeof parsed.reasoning === 'string' ? parsed.reasoning : response;
        return {
          score: Math.min(100, Math.max(1, scoreVal)),
          reasoning: reasoningVal,
        };
      }
    } catch {
      logger.warn('Failed to parse scoring response', { response });
    }

    return { score: 50, reasoning: response };
  }

  /**
   * Extract JSON from text
   */
  async extractJson<T>(text: string, schema: string): Promise<T | null> {
    const response = await this.sendMessage(
      [
        {
          role: 'user',
          content: `Extract structured data matching this schema from the text:\n${schema}\n\nText:\n${text}`,
        },
      ],
      {
        maxTokens: 1024,
        temperature: 0.1,
        system:
          'You are a JSON extraction expert. Return ONLY valid JSON matching the requested schema, no other text.',
      }
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
    } catch (error) {
      logger.warn('Failed to extract JSON', { error: String(error) });
    }

    return null;
  }
}

export const anthropicService = new AnthropicService();
