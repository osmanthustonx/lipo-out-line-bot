import { OpenAIError } from '../utils/error.ts';

export class OpenAIClient {
  private baseUrl = 'https://api.openai.com/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new OpenAIError(`OpenAI API error: ${response.statusText}`, response.status);
      }

      return response;
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createChatCompletion(options: {
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }>;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: string };
  }) {
    const response = await this.request('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(options),
    });

    return response.json();
  }
}
