import { OpenAI } from 'openai';

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string = "https://openrouter.ai/api/v1") {
    this.client = new OpenAI({
      baseURL,
      apiKey
    });
  }

  async createChatCompletion(options: {
    model: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
  }) {
    const completion = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens
    });

    return completion;
  }
}
